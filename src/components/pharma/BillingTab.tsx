import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from '@/components/ui/pagination';
import { Calculator, Search, Eye, Download, MessageCircle, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from '@/hooks/use-toast';
import { billsApi, Bill } from '@/services/api';
import { LoadingPage } from '@/components/ui/loading';

// Add Razorpay type to window for TypeScript
declare global {
  interface Window {
    Razorpay?: any;
  }
}

// Placeholder SVG logo as base64 (black cross with heart)
const CURA_LOGO_BASE64 =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTIiIGZpbGw9ImJsYWNrIi8+CjxwYXRoIGQ9Ik0zMiAxNEMzNS4zMTM3IDE0IDM4IDE2LjY4NjMgMzggMjAuMDFWMzJIMzJWMjAuMDFDMzIgMTYuNjg2MyAzNC42ODYzIDE0IDM4IDE0WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTI4IDM2SDI0VjQwSDI4VjM2WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTM2IDM2SDQwVjQwSDM2VjM2WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==';

export const BillingTab: React.FC = () => {
  
  const [hasError, setHasError] = useState(false);
  if (hasError) {
    return <div className="text-red-600 p-4">Error rendering BillingTab. Please check the console for details.</div>;
  }
  try {
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [billDetails, setBillDetails] = useState<Bill[]>([]);
    const [sendingSMS, setSendingSMS] = useState<string | null>(null);
    const [isViewLoading, setIsViewLoading] = useState(false);
    
    // Dynamic pagination state based on viewport height
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Calculate items per page based on viewport height
    useEffect(() => {
      const calculateItemsPerPage = () => {
        const vh = window.innerHeight;
        const headerHeight = 200; // Approximate height of headers, search, filters
        const rowHeight = 60; // Approximate height of each table row
        const paginationHeight = 80; // Height for pagination controls
        const availableHeight = vh - headerHeight - paginationHeight;
        const calculatedItems = Math.max(5, Math.floor(availableHeight / rowHeight));
        setItemsPerPage(calculatedItems);
      };

      calculateItemsPerPage();
      window.addEventListener('resize', calculateItemsPerPage);
      
      return () => window.removeEventListener('resize', calculateItemsPerPage);
    }, []);

    useEffect(() => {
      fetchBills();
    }, []);

    const fetchBills = async () => {
      try {
        setLoading(true);
        const data = await billsApi.getAll();
        setBills(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch bills",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    const filteredBills = bills.filter(bill =>
      bill.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.appointment_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group bills by appointment_id and calculate total amount for each group
    const groupedBills = filteredBills.reduce((acc, bill) => {
      let group = acc.find(b => b.appointment_id === bill.appointment_id);
      if (!group) {
        group = { ...bill, items: 0, totalAmount: 0 };
        acc.push(group);
      }
      group.items += 1;
      group.totalAmount += Number(bill.total_price);
      return acc;
    }, [] as (Bill & { items: number; totalAmount: number })[])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Sort by latest date first

    // Pagination logic
    const totalPages = Math.ceil(groupedBills.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentBills = groupedBills.slice(startIndex, endIndex);

    // Reset to first page when search term changes
    useEffect(() => {
      setCurrentPage(1);
    }, [searchTerm]);

    const handlePageChange = (page: number) => {
      setCurrentPage(page);
    };

    // Smart pagination - generate page numbers with ellipsis
    const generatePageNumbers = () => {
      const pages: (number | string)[] = [];
      const maxVisiblePages = 7; // Show max 7 page numbers
      
      if (totalPages <= maxVisiblePages) {
        // If total pages is small, show all pages
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Smart pagination with ellipsis
        if (currentPage <= 4) {
          // Near the beginning: [1, 2, 3, 4, 5, ..., last]
          for (let i = 1; i <= 5; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 3) {
          // Near the end: [1, ..., last-4, last-3, last-2, last-1, last]
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 4; i <= totalPages; i++) {
            pages.push(i);
          }
        } else {
          // In the middle: [1, ..., current-1, current, current+1, ..., last]
          pages.push(1);
          pages.push('...');
          pages.push(currentPage - 1);
          pages.push(currentPage);
          pages.push(currentPage + 1);
          pages.push('...');
          pages.push(totalPages);
        }
      }
      
      return pages;
    };

    const handleViewBill = async (bill: Bill) => {
      setIsViewLoading(true);
      try {
        const details = await billsApi.getByAppointmentId(bill.appointment_id);
        setBillDetails(details);
        setSelectedBill(bill);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch bill details",
          variant: "destructive",
        });
      } finally {
        setIsViewLoading(false);
      }
    };

    const handleDownload = async (bill: Bill) => {
      // Find all bill details for this appointment
      let details = billDetails;
      if (!details.length || details[0].appointment_id !== bill.appointment_id) {
        try {
          details = await billsApi.getByAppointmentId(bill.appointment_id);
        } catch {
          toast({ title: 'Error', description: 'Failed to fetch bill details', variant: 'destructive' });
          return;
        }
      }
      // Create a hidden div with the bill content
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      document.body.appendChild(container);
      const billDate = new Date(bill.created_at);
      const dateStr = billDate.toLocaleDateString();
      const timeStr = billDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      container.innerHTML = `
        <div style="width:794px;min-height:1123px;background:#fff;padding:0;margin:0;font-family:sans-serif;position:relative;">
          <div style='padding:40px 40px 0 40px;'>
            <div style='display:flex;justify-content:space-between;align-items:center;'>
              <div>
                <div style='font-size:32px;font-weight:600;margin-bottom:8px;'>Invoice</div>
                <div style='font-size:15px;font-weight:500;color:#444;'>CURA Pharmacy, 123 Hospital Road, Bengaluru, India</div>
              </div>
              <img src='/cura-logo.png' style='height:64px;width:auto;' />
            </div>
            <div style='margin-top:32px;display:flex;justify-content:space-between;'>
              <div>
                <div style='font-weight:600;font-size:15px;margin-bottom:4px;'>BILL TO</div>
                <div style='font-size:14px;'>${bill.patient_name || '-'}</div>
                <div style='font-size:13px;color:#666;'>Appointment ID: ${bill.appointment_id || '-'}</div>
              </div>
              <div style='font-size:13px;color:#444;'>
                <div><b>Invoice No.:</b> ${bill.bill_id}</div>
                <div><b>Issue date:</b> ${dateStr} ${timeStr}</div>
                <div><b>Due date:</b> ${dateStr}</div>
                <div><b>Reference:</b> ${bill.appointment_id}</div>
              </div>
            </div>
            <div style='margin-top:24px;display:flex;gap:0;'>
              <div style='flex:1;background:#f3f3f3;padding:16px 12px;text-align:center;border:1px solid #e0e0e0;'>
                <div style='font-size:13px;color:#888;'>Invoice No.</div>
                <div style='font-size:18px;font-weight:600;'>${bill.bill_id}</div>
              </div>
              <div style='flex:1;background:#f3f3f3;padding:16px 12px;text-align:center;border:1px solid #e0e0e0;'>
                <div style='font-size:13px;color:#888;'>Issue date</div>
                <div style='font-size:18px;font-weight:600;'>${dateStr}</div>
              </div>
              <div style='flex:1;background:#f3f3f3;padding:16px 12px;text-align:center;border:1px solid #e0e0e0;'>
                <div style='font-size:13px;color:#888;'>Due date</div>
                <div style='font-size:18px;font-weight:600;'>${dateStr}</div>
              </div>
              <div style='flex:1.2;background:#222;color:#fff;padding:16px 12px;text-align:center;border:1px solid #e0e0e0;'>
                <div style='font-size:13px;'>Total due (INR)</div>
                <div style='font-size:20px;font-weight:700;'>₹${details.reduce((sum, item) => sum + Number(item.total_price), 0).toFixed(2)}</div>
              </div>
            </div>
            <div style='margin-top:32px;'>
              <table style='width:100%;border-collapse:collapse;'>
                <thead>
                  <tr style='background:#fafafa;border-bottom:2px solid #e0e0e0;'>
                    <th style='text-align:left;padding:8px 4px;font-size:14px;'>Description</th>
                    <th style='text-align:left;padding:8px 4px;font-size:14px;'>Quantity</th>
                    <th style='text-align:left;padding:8px 4px;font-size:14px;'>Unit price (₹)</th>
                    <th style='text-align:left;padding:8px 4px;font-size:14px;'>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${details.map(item => `
                    <tr style='border-bottom:1px solid #eee;'>
                      <td style='padding:8px 4px;font-size:13px;'>${item.medication_name}</td>
                      <td style='padding:8px 4px;font-size:13px;'>${item.quantity}</td>
                      <td style='padding:8px 4px;font-size:13px;'>₹${Number(item.unit_price).toFixed(2)}</td>
                      <td style='padding:8px 4px;font-size:13px;'>₹${Number(item.total_price).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div style='margin-top:16px;text-align:right;font-size:18px;font-weight:600;'>
              Total (INR): ₹${details.reduce((sum, item) => sum + Number(item.total_price), 0).toFixed(2)}
            </div>
          </div>
          <div style='position:absolute;bottom:32px;left:40px;right:40px;font-size:13px;color:#888;border-top:1px solid #eee;padding-top:12px;display:flex;justify-content:space-between;'>
            <div>
              CURA Pharmacy<br/>
              123 Hospital Road<br/>
              Bengaluru, India
            </div>
            <div>info@curapharmacy.in</div>
          </div>
        </div>
      `;
      // Use html2canvas to render the container to a canvas
      const canvas = await html2canvas(container, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [794, 1123] });
      pdf.addImage(imgData, 'PNG', 0, 0, 794, 1123);
      pdf.save(`bill-${bill.appointment_id}.pdf`);
      document.body.removeChild(container);
      toast({ title: 'Download Complete', description: `PDF downloaded for ${bill.patient_name}` });
    };

    const handleSMS = async (bill: Bill) => {
      try {
        setSendingSMS(bill.bill_id);
        
        // Use actual patient phone number from the bill data
        const patientPhone = bill.patient_phone;
        
        if (!patientPhone) {
          toast({
            title: "Error",
            description: "Patient phone number not found in the database.",
            variant: "destructive",
          });
          return;
        }
        
        await billsApi.sendSMSBill({
          appointment_id: bill.appointment_id,
          patient_phone: patientPhone,
        });
        
        toast({
          title: "SMS Message Sent",
          description: `Bill sent to ${bill.patient_name} at ${patientPhone}`,
        });
      } catch (error) {
        console.error('SMS error:', error);
        toast({
          title: "Error",
          description: "Failed to send SMS message. Please check the phone number.",
          variant: "destructive",
        });
      } finally {
        setSendingSMS(null);
      }
    };

    if (loading) {
      return <LoadingPage text="Loading bills..." />;
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Billing History
            </CardTitle>
            <CardDescription>
              View and manage completed bills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bills by patient or appointment ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Results summary */}
            <div className="flex justify-between items-center mb-4 text-sm text-muted-foreground">
              <span>
                Showing {startIndex + 1}-{Math.min(endIndex, groupedBills.length)} of {groupedBills.length} bills
              </span>
              {groupedBills.length > 0 && (
                <span>
                  Page {currentPage} of {totalPages} ({itemsPerPage} per page)
                </span>
              )}
            </div>

            <div className="rounded-md border">
              <Table className="w-full text-xs sm:text-sm md:text-base">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">ID</TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Patient</TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden sm:table-cell">Payment</TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Amount</TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden md:table-cell">Date</TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentBills.map((bill) => (
                    <TableRow key={bill.bill_id} className="text-xs sm:text-sm md:text-base">
                      <TableCell className="font-medium px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">{bill.appointment_id.slice(0, 8)}...</TableCell>
                      <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">{bill.patient_name}</TableCell>
                      <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden sm:table-cell">
                        <Badge variant={bill.payment_mode === 'cash' ? 'secondary' : 'default'} className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 md:px-3 py-0.5 sm:py-1">
                          {bill.payment_mode}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">₹{Number(bill.totalAmount).toFixed(2)}</TableCell>
                      <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden md:table-cell">{new Date(bill.created_at).toLocaleDateString()} {new Date(bill.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                        <div className="flex gap-1 sm:gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="icon"
                                className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 p-1 sm:p-2"
                                variant="outline"
                                onClick={() => handleViewBill(bill)}
                              >
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              {isViewLoading ? (
                                <div style={{
                                  width: '100%',
                                  maxWidth: '794px',
                                  minHeight: '60vh',
                                  maxHeight: '90vh',
                                  background: '#fff',
                                  borderRadius: 12,
                                  boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                                  margin: 0,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  position: 'relative',
                                }}>
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                      width: '48px',
                                      height: '48px',
                                      border: '4px solid #f3f3f3',
                                      borderTop: '4px solid #3498db',
                                      borderRadius: '50%',
                                      animation: 'spin 1s linear infinite',
                                      margin: '0 auto 16px'
                                    }}></div>
                                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                                      Loading bill details...
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#666' }}>
                                      Please wait while we fetch the data
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <DialogHeader>
                                    <DialogTitle>Bill Details</DialogTitle>
                                    <DialogDescription>
                                      Patient: {bill.patient_name} | Date: {new Date(bill.created_at).toLocaleDateString()} {new Date(bill.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </DialogDescription>
                                  </DialogHeader>
                                  {selectedBill && (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><strong>Appointment ID:</strong> {selectedBill.appointment_id}</div>
                                        <div><strong>Payment Type:</strong> {selectedBill.payment_mode}</div>
                                        {selectedBill.transaction_id && (
                                          <div><strong>Transaction ID:</strong> {selectedBill.transaction_id}</div>
                                        )}
                                      </div>
                                      <div>
                                        <h4 className="font-semibold mb-2">Items</h4>
                                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                          {billDetails.map((item, index) => (
                                            <div key={index} className="flex justify-between p-3 bg-muted rounded-lg">
                                              <div>
                                                <div className="font-medium">{item.medication_name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                  Qty: {item.quantity} × ₹{Number(item.unit_price).toFixed(2)}
                                                </div>
                                              </div>
                                              <div className="font-medium">
                                                ₹{Number(item.total_price).toFixed(2)}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="text-right border-t pt-4">
                                        <div className="text-lg font-semibold">
                                          Total: ₹{billDetails.reduce((sum, item) => sum + Number(item.total_price), 0).toFixed(2)}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="icon"
                            className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 p-1 sm:p-2"
                            variant="outline"
                            onClick={() => handleDownload(bill)}
                          >
                            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            size="icon"
                            className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 p-1 sm:p-2"
                            variant="outline"
                            onClick={() => handlePrintBill(bill)}
                          >
                            <Printer className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            size="icon"
                            className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 p-1 sm:p-2"
                            variant="outline"
                                                onClick={() => handleSMS(bill)}
                    disabled={sendingSMS === bill.bill_id}
                  >
                    {sendingSMS === bill.bill_id ? (
                              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-current" />
                            ) : (
                              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Smart Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {/* Smart page numbers with ellipsis */}
                    {generatePageNumbers().map((page, index) => (
                      <PaginationItem key={index}>
                        {page === '...' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            onClick={() => handlePageChange(page as number)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (err) {
    setHasError(true);
    console.error('Error rendering BillingTab:', err);
    return null;
  }
};

// Print bill as PDF (same as download, but triggers print dialog instead of saving)
async function handlePrintBill(bill) {
  let details = [];
  try {
    details = await billsApi.getByAppointmentId(bill.appointment_id);
  } catch {
    toast({ title: 'Error', description: 'Failed to fetch bill details', variant: 'destructive' });
    return;
  }
  const billDate = new Date(bill.created_at);
  const dateStr = billDate.toLocaleDateString();
  const timeStr = billDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Bill - ${bill.bill_id}</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        html, body { width: 794px; height: 1123px; margin: 0; padding: 0; font-family: Arial, sans-serif; }
        .print-invoice-root { width: 794px; height: 1123px; max-height: 1123px; background: #fff; position: relative; overflow: hidden; }
        .print-logo { position: absolute; top: 40px; right: 40px; z-index: 10; }
        .print-footer { position: absolute; bottom: 0; left: 0; right: 0; width: 100%; font-size: 13px; color: #888; border-top: 1px solid #eee; padding: 12px 40px 24px 40px; display: flex; justify-content: space-between; background: #fff; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { text-align: left; padding: 4px 2px; font-size: 12px; }
        thead tr { background: #fafafa; border-bottom: 2px solid #e0e0e0; }
        tbody tr { border-bottom: 1px solid #eee; }
        @media print {
          html, body { width: 794px; height: 1123px; margin: 0; padding: 0; }
          .print-invoice-root { width: 794px; height: 1123px; max-height: 1123px; overflow: hidden; position: relative; }
          .print-logo { position: absolute !important; top: 40px; right: 40px; z-index: 1000; }
          .print-footer { position: absolute !important; bottom: 0; left: 0; right: 0; width: 100%; background: #fff; z-index: 1000; }
          .no-break { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class='print-invoice-root'>
        <div class='print-logo'>
          <img src='/cura-logo.png' style='height:64px;width:auto;' alt="CURA Logo" />
        </div>
        <div style='padding:40px 40px 0 40px;'>
          <div style='display:flex;justify-content:space-between;align-items:center;'>
            <div>
              <div style='font-size:32px;font-weight:600;margin-bottom:8px;'>Invoice</div>
              <div style='font-size:15px;font-weight:500;color:#444;'>CURA Pharmacy, 123 Hospital Road, Bengaluru, India</div>
            </div>
          </div>
          <div style='margin-top:32px;display:flex;justify-content:space-between;'>
            <div>
              <div style='font-weight:600;font-size:15px;margin-bottom:4px;'>BILL TO</div>
              <div style='font-size:14px;'>${bill.patient_name || '-'}</div>
              <div style='font-size:13px;color:#666;'>Appointment ID: ${bill.appointment_id || '-'}</div>
            </div>
            <div style='font-size:13px;color:#444;'>
              <div><b>Invoice No.:</b> ${bill.bill_id}</div>
              <div><b>Issue date:</b> ${dateStr} ${timeStr}</div>
              <div><b>Due date:</b> ${dateStr}</div>
              <div><b>Reference:</b> ${bill.appointment_id}</div>
            </div>
          </div>
          <div style='margin-top:24px;display:flex;gap:0;'>
            <div style='flex:1;background:#f3f3f3;padding:16px 12px;text-align:center;border:1px solid #e0e0e0;'>
              <div style='font-size:13px;color:#888;'>Invoice No.</div>
              <div style='font-size:18px;font-weight:600;'>${bill.bill_id}</div>
            </div>
            <div style='flex:1;background:#f3f3f3;padding:16px 12px;text-align:center;border:1px solid #e0e0e0;'>
              <div style='font-size:13px;color:#888;'>Issue date</div>
              <div style='font-size:18px;font-weight:600;'>${dateStr}</div>
            </div>
            <div style='flex:1;background:#f3f3f3;padding:16px 12px;text-align:center;border:1px solid #e0e0e0;'>
              <div style='font-size:13px;color:#888;'>Due date</div>
              <div style='font-size:18px;font-weight:600;'>${dateStr}</div>
            </div>
            <div style='flex:1.2;background:#222;color:#fff;padding:16px 12px;text-align:center;border:1px solid #e0e0e0;'>
              <div style='font-size:13px;'>Total due (INR)</div>
              <div style='font-size:20px;font-weight:700;'>₹${details.reduce((sum, item) => sum + Number(item.total_price), 0).toFixed(2)}</div>
            </div>
          </div>
          <div style='margin-top:32px;margin-bottom:0;max-height:500px;overflow:auto;'>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit price (₹)</th>
                  <th>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${details.map(item => `
                  <tr>
                    <td>${item.medication_name}</td>
                    <td>${item.quantity}</td>
                    <td>₹${Number(item.unit_price).toFixed(2)}</td>
                    <td>₹${Number(item.total_price).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div style='margin-top:16px;text-align:right;font-size:16px;font-weight:600;'>
            Total (INR): ₹${details.reduce((sum, item) => sum + Number(item.total_price), 0).toFixed(2)}
          </div>
        </div>
        <div class='print-footer'>
          <div>
            CURA Pharmacy<br/>
            123 Hospital Road<br/>
            Bengaluru, India
          </div>
          <div>info@curapharmacy.in</div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    toast({ 
      title: 'Print Error', 
      description: 'Popup blocked. Please allow popups and try again.', 
      variant: 'destructive' 
    });
    return;
  }
  
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    try {
      printWindow.focus();
      printWindow.print();
      // Close window after printing
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    } catch (error) {
      console.error('Print error:', error);
      toast({ 
        title: 'Print Error', 
        description: 'Unable to print. Please try saving as PDF instead.', 
        variant: 'destructive' 
      });
      printWindow.close();
    }
  };
}