import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from '@/components/ui/pagination';
import { ClipboardList, Search, Eye, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { labTestsApi, PendingLabTest } from '@/services/api';
import { LoadingPage } from '@/components/ui/loading';
import ReportViewTab from './ReportViewTab';

// Define the type for completed reports (similar to GroupedTest)
interface CompletedReport {
  appointment_id: string;
  patient_name: string;
  doctor_name: string;
  appointment_date: string;
  services: Array<{
    patient_service_id: number;
    service_type_name: string;
    sub_department_name: string;
    report_completed_at: string | null;
  }>;
}

const ReportsTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [completedReports, setCompletedReports] = useState<PendingLabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState<CompletedReport | null>(null);
  
  // Pagination state
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
    fetchCompletedReports();
  }, []);

  const fetchCompletedReports = async () => {
    try {
      setLoading(true);
      // Try the dedicated completed reports endpoint first
      try {
        const data = await labTestsApi.getCompletedReports();
        setCompletedReports(data);
      } catch (completedError) {
        // Fallback: Use pending tests API and filter for completed reports
        console.log('Completed reports endpoint not available, using fallback...');
        const allTests = await labTestsApi.getPendingTests();
        const completedData = allTests.filter(test => test.report_status === 'Completed');
        setCompletedReports(completedData);
      }
    } catch (error) {
      console.error('Error fetching completed reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch completed reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (report: CompletedReport) => {
    setViewingReport(report);
  };

  const handleBackToReports = () => {
    setViewingReport(null);
  };

  // Group reports by appointment ID to show unique patients
  const groupedReports = completedReports.reduce((acc, report) => {
    if (!acc[report.appointment_id]) {
      acc[report.appointment_id] = {
        appointment_id: report.appointment_id,
        patient_name: report.patient_name,
        doctor_name: report.doctor_name,
        appointment_date: report.appointment_date,
        services: []
      };
    }
    acc[report.appointment_id].services.push({
      patient_service_id: report.patient_service_id,
      service_type_name: report.service_type_name,
      sub_department_name: report.sub_department_name,
      report_completed_at: report.sample_collected_at // Adjust this field as needed
    });
    return acc;
  }, {} as Record<string, CompletedReport>);

  const filteredReports = Object.values(groupedReports).filter(group => {
    const searchLower = searchTerm.toLowerCase();
    return (
      group.patient_name.toLowerCase().includes(searchLower) ||
      group.appointment_id.toLowerCase().includes(searchLower) ||
      group.doctor_name.toLowerCase().includes(searchLower) ||
      group.services.some((service: any) => 
        service.service_type_name.toLowerCase().includes(searchLower) ||
        service.sub_department_name.toLowerCase().includes(searchLower)
      )
    );
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReports = filteredReports.slice(startIndex, endIndex);

  // Reset to first page when search changes
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

  if (loading) {
    return <LoadingPage text="Loading completed reports..." />;
  }

  // If viewing a specific report, show the detailed view
  if (viewingReport) {
    return (
      <ReportViewTab 
        report={viewingReport} 
        onBack={handleBackToReports}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Completed Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name, appointment ID, doctor, or service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Results summary */}
          <div className="flex justify-between items-center mb-4 text-sm text-muted-foreground">
            <span>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredReports.length)} of {filteredReports.length} reports
            </span>
            {filteredReports.length > 0 && (
              <span>
                Page {currentPage} of {totalPages} ({itemsPerPage} per page)
              </span>
            )}
          </div>

          {filteredReports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Completed Reports</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No reports match your search criteria.' : 'No lab reports have been completed yet.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table className="w-full text-xs sm:text-sm md:text-base">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Appointment ID</TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Patient Name</TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Doctor</TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Services</TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentReports.map((group) => (
                    <TableRow key={group.appointment_id} className="text-xs sm:text-sm md:text-base cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">{
                        group.appointment_id.length > 8
                          ? `${group.appointment_id.slice(0, 4)}...${group.appointment_id.slice(-4)}`
                          : group.appointment_id
                      }</TableCell>
                      <TableCell className="font-medium px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">{group.patient_name}</TableCell>
                      <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">{group.doctor_name}</TableCell>
                      <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                        <Badge variant="default" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-green-100 text-green-800 border-green-200">
                          {group.services.length} Completed
                        </Badge>
                      </TableCell>
                      <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                        <div className="flex gap-1 sm:gap-2">
                          <Button
                            size="icon"
                            className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 p-1 sm:p-2"
                            variant="outline"
                            onClick={() => handleViewReport(group)}
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

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
};

export default ReportsTab;
