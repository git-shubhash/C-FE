import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { QrCode, Search, Eye, Download, MessageCircle, Trash2 } from 'lucide-react';
import { prescriptionsApi } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { QRScanner } from './QRScanner';
import { medicinesApi } from '@/services/api';
import { billsApi } from '@/services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Dialog as ConfirmDialog, DialogContent as ConfirmDialogContent, DialogHeader as ConfirmDialogHeader, DialogTitle as ConfirmDialogTitle, DialogFooter as ConfirmDialogFooter } from '@/components/ui/dialog';
import { LoadingButton, LoadingPage } from '@/components/ui/loading';

interface Prescription {
  id: string;
  appointmentId: string;
  patientName: string;
  doctorName: string;
  date: string;
  dispenseStatus: boolean;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes?: string;
    quantity?: number; // Current inventory quantity
    price?: number; // Current inventory price
    stock_status?: 'in_stock' | 'low_stock'; // Current stock status
  }>;
}

export const PrescriptionsTab: React.FC = () => {
  const [appointmentId, setAppointmentId] = useState('');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billQuantities, setBillQuantities] = useState<{ [name: string]: number }>({});
  const [retrievedPrescriptions, setRetrievedPrescriptions] = useState<Prescription[]>([]);
  const [retrievedAppointmentId, setRetrievedAppointmentId] = useState<string | null>(null);
  const [retrievalError, setRetrievalError] = useState<string | null>(null);
  const [allMedicines, setAllMedicines] = useState<{ [name: string]: number }>({});
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online'>('cash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [billPrescription, setBillPrescription] = useState<Prescription | null>(null);
  const [isPrescriptionDialogOpen, setIsPrescriptionDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isViewLoading, setIsViewLoading] = useState(false);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const data = await prescriptionsApi.getAll();
        // Map backend data to frontend Prescription type if needed
        const mapped = data.map((item: any) => ({
          id: item.id?.toString() || item.appointment_id,
          appointmentId: item.appointment_id,
          patientName: item.patient_name,
          doctorName: item.doctor_name,
          date: item.date,
          dispenseStatus: item.dispense_status,
          medications: item.medications || [], // You may need to fetch medications separately if not included
        }));
        setPrescriptions(mapped);
      } catch (error) {
        // Optionally show a toast or error message
        setPrescriptions([]);
      }
    };
    fetchPrescriptions();
  }, []);

  useEffect(() => {
    if (showBillModal) {
      medicinesApi.getAll().then((meds) => {
        const priceMap: { [name: string]: number } = {};
        meds.forEach((med: any) => {
          priceMap[med.name] = med.price;
        });
        setAllMedicines(priceMap);
        // Update selectedPrescription.medications with correct prices
        if (billPrescription) {
          setBillPrescription((prev) => prev && {
            ...prev,
            medications: prev.medications.map(med => ({
              ...med,
              price: priceMap[med.name] || 0,
            })),
          });
        }
      });
    }
    // eslint-disable-next-line
  }, [showBillModal]);

  // (Removed localStorage persistence for prescription management data)

  // (Removed pharma-refresh event listener for clearing localStorage)

  const handleQRScan = () => {
    setIsScanning(true);
  };

  const handleScanSuccess = async (scannedAppointmentId: string) => {
    setIsScanning(false); // Close the QR scanner dialog
    setAppointmentId(scannedAppointmentId);
    await retrievePrescriptions(scannedAppointmentId);
  };

  const handleManualSearch = async () => {
    if (!appointmentId.trim()) return;
    await retrievePrescriptions(appointmentId.trim());
    setAppointmentId(''); // Clear the text box after search
  };

  const retrievePrescriptions = async (id: string) => {
    setRetrievalError(null);
    setRetrievedAppointmentId(id);
    setIsLoading(true);
    try {
      const data = await prescriptionsApi.getByAppointmentId(id);
      if (!data || data.length === 0) {
        setRetrievedPrescriptions([]);
        setRetrievalError('No patient found');
        return;
      }

      // Fetch current medicine inventory to get prices and quantities
      const medicinesData = await medicinesApi.getAll();
      const medicineMap = new Map();
      medicinesData.forEach((med: any) => {
        medicineMap.set(med.name.toLowerCase(), {
          price: med.price,
          quantity: med.quantity,
          stock_status: med.stock_status
        });
      });

      // Group all rows by appointment_id (should be the same for all, but future-proof)
      const grouped = {};
      data.forEach((row: any) => {
        const key = row.appointment_id;
        if (!grouped[key]) {
          grouped[key] = {
            id: row.id?.toString() || row.appointment_id,
            appointmentId: row.appointment_id,
            patientName: row.patient_name,
            doctorName: row.doctor_name,
            date: row.date,
            dispenseStatus: row.dispense_status,
            medications: [],
          };
        }

        // Get current medicine data from inventory
        const medicineData = medicineMap.get(row.medication_name.toLowerCase());
        const currentPrice = medicineData ? medicineData.price : 0;
        const currentQuantity = medicineData ? medicineData.quantity : 0;
        const stockStatus = medicineData ? medicineData.stock_status : 'low_stock';

        grouped[key].medications.push({
          name: row.medication_name,
          dosage: row.dosage,
          frequency: row.frequency,
          duration: row.duration,
          notes: row.notes,
          quantity: currentQuantity, // Use current inventory quantity
          price: currentPrice, // Use current inventory price
          stock_status: stockStatus, // Add stock status
        });
      });
      setRetrievedPrescriptions(Object.values(grouped));
    } catch (error) {
      setRetrievedPrescriptions([]);
      setRetrievalError('No patient found');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPrescription = async (prescription: Prescription) => {
    setIsViewLoading(true);
    try {
      // Fetch all prescription rows for this appointment_id
      const data = await prescriptionsApi.getByAppointmentId(prescription.appointmentId);
      if (!data || data.length === 0) {
        toast({ title: 'Error', description: 'No prescription details found', variant: 'destructive' });
        return;
      }

      // Fetch current medicine inventory to get prices and quantities
      const medicinesData = await medicinesApi.getAll();
      const medicineMap = new Map();
      medicinesData.forEach((med: any) => {
        medicineMap.set(med.name.toLowerCase(), {
          price: med.price,
          quantity: med.quantity,
          stock_status: med.stock_status
        });
      });

      // Group medications from rows with current inventory data
      const medications = data.map((row: any) => {
        const medicineData = medicineMap.get(row.medication_name.toLowerCase());
        const currentPrice = medicineData ? medicineData.price : 0;
        const currentQuantity = medicineData ? medicineData.quantity : 0;
        const stockStatus = medicineData ? medicineData.stock_status : 'low_stock';

        return {
          name: row.medication_name,
          dosage: row.dosage,
          frequency: row.frequency,
          duration: row.duration,
          notes: row.notes,
          quantity: currentQuantity, // Use current inventory quantity
          price: currentPrice, // Use current inventory price
          stock_status: stockStatus, // Add stock status
        };
      });

      setSelectedPrescription({
        id: data[0].id?.toString() || data[0].appointment_id,
        appointmentId: data[0].appointment_id,
        patientName: data[0].patient_name,
        doctorName: data[0].doctor_name,
        date: data[0].date,
        dispenseStatus: data[0].dispense_status,
        medications,
      });
      setIsPrescriptionDialogOpen(true);
      // Reset bill quantities based on prescription requirements
      const initialQuantities: { [name: string]: number } = {};
      medications.forEach(med => {
        // Calculate required quantity based on frequency and duration
        const requiredQuantity = calculateRequiredQuantity(med.frequency, med.duration);
        // Use the calculated quantity, but don't exceed available inventory
        const availableQuantity = Number(med.quantity) || 0;
        initialQuantities[med.name] = Math.min(requiredQuantity, availableQuantity);
      });
      setBillQuantities(initialQuantities);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch prescription details', variant: 'destructive' });
    } finally {
      setIsViewLoading(false);
    }
  };

  const handleDispense = (prescriptionId: string) => {
    if (selectedPrescription) {
      setBillPrescription(selectedPrescription); // Set the prescription to be billed
      setShowBillModal(true); // Open Bill Summary
      setIsPrescriptionDialogOpen(false); // Close prescription dialog
    }
  };

  function handleCloseBillModal() {
    setShowBillModal(false);
    setBillPrescription(null);
    setSelectedPrescription(null); // Now safe to clear
  }

  // Calculate required quantity based on frequency and duration
  const calculateRequiredQuantity = (frequency: string, duration: string): number => {
    // Parse frequency (e.g., "2 times daily", "once daily", "3 times a day")
    const frequencyMatch = frequency.toLowerCase().match(/(\d+)\s*(times?|time)\s*(daily|day|a day)/);
    const timesPerDay = frequencyMatch ? parseInt(frequencyMatch[1]) : 1;
    
    // Parse duration (e.g., "7 days", "2 weeks", "1 month")
    const durationMatch = duration.toLowerCase().match(/(\d+)\s*(days?|weeks?|months?)/);
    let totalDays = 0;
    
    if (durationMatch) {
      const amount = parseInt(durationMatch[1]);
      const unit = durationMatch[2];
      
      switch (unit) {
        case 'day':
        case 'days':
          totalDays = amount;
          break;
        case 'week':
        case 'weeks':
          totalDays = amount * 7;
          break;
        case 'month':
        case 'months':
          totalDays = amount * 30; // Approximate
          break;
      }
    } else {
      // Default to 7 days if duration is not specified
      totalDays = 7;
    }
    
    return timesPerDay * totalDays;
  };

  const handleBillQuantityChange = (name: string, value: number) => {
    // Ensure value is within valid range
    const medicine = billPrescription?.medications.find(med => med.name === name);
    const maxQuantity = medicine?.quantity || 999;
    const validValue = Math.max(0, Math.min(value, maxQuantity));
    
    setBillQuantities(q => ({ ...q, [name]: validValue }));
  };

  const handleProceedToPayment = async () => {
    if (!billPrescription) return;
    setIsProcessingPayment(true);
    try {
      if (paymentMode === 'online') {
        // Razorpay integration
        const totalAmount = billPrescription.medications.reduce((sum, med) => sum + (med.price || 0) * (billQuantities[med.name] || 1), 0);
        const order = await billsApi.createRazorpayOrder(totalAmount, billPrescription.appointmentId);
        if (typeof window !== 'undefined' && window.Razorpay) {
          const options = {
            key: 'rzp_test_Qc3oYYIpn8jat3', // your test key
            amount: order.amount,
            currency: order.currency,
            name: 'CURA Pharmacy',
            description: `Bill Payment for ${billPrescription.patientName}`,
            order_id: order.id,
            handler: async function (response) {
              try {
                await billsApi.verifyRazorpayPayment({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                });
                const medicines = billPrescription.medications.map(med => ({
                  name: med.name,
                  quantity: billQuantities[med.name] || 1,
                  price: med.price || 0,
                }));
                await billsApi.create({
                  appointment_id: billPrescription.appointmentId,
                  medicines,
                  payment_mode: 'online',
                  transaction_id: response.razorpay_payment_id,
                });
                await prescriptionsApi.updateDispenseStatus(billPrescription.appointmentId);
                toast({ title: 'Success', description: 'Payment complete and prescription dispensed.' });
                // Re-fetch prescriptions for the current appointment
                if (retrievedAppointmentId) {
                  await retrievePrescriptions(retrievedAppointmentId);
                }
                handleCloseBillModal();
              } catch (error) {
                toast({ title: 'Error', description: 'Payment or dispensing failed', variant: 'destructive' });
                // Re-fetch prescriptions for the current appointment
                if (retrievedAppointmentId) {
                  await retrievePrescriptions(retrievedAppointmentId);
                }
                setIsProcessingPayment(false);
              } finally {
                if (paymentMode !== 'online') setIsProcessingPayment(false);
              }
            },
            prefill: {
              name: billPrescription.patientName,
            },
            theme: { color: '#0f172a', hide_topbar: true },
            modal: {
              escape: false,
              backdropclose: false,
              ondismiss: () => {
                setIsProcessingPayment(false);
              },
              animation: false // Remove animation
            },
            method: {
              upi: true,
              card: true,
              netbanking: true,
              wallet: false,
              emi: false,
              paylater: false
            },
          };
          const rzp = new window.Razorpay(options);
          rzp.open();
        } else {
          toast({ title: 'Payment Error', description: 'Razorpay gateway not loaded.' });
          setIsProcessingPayment(false);
        }
        return; // Do not proceed to create bill until payment is verified
      }
      // For cash payments, proceed as before
      const medicines = billPrescription.medications.map(med => ({
        name: med.name,
        quantity: billQuantities[med.name] || 1,
        price: med.price || 0,
      }));
      await billsApi.create({
        appointment_id: billPrescription.appointmentId,
        medicines,
        payment_mode: paymentMode,
      });
      await prescriptionsApi.updateDispenseStatus(billPrescription.appointmentId);
      toast({ title: 'Success', description: 'Payment complete and prescription dispensed.' });
      handleCloseBillModal();
      if (retrievedAppointmentId) {
        await retrievePrescriptions(retrievedAppointmentId);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Payment or dispensing failed', variant: 'destructive' });
      setIsProcessingPayment(false);
    } finally {
      if (paymentMode !== 'online') setIsProcessingPayment(false);
    }
  };

  const handleDownloadPrescription = async (prescription: Prescription) => {
    try {
      // Create a hidden div with the prescription content
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      document.body.appendChild(container);
      
      // Use template with header and footer images
      container.innerHTML = `
        <div style="width:794px;min-height:1123px;background:#fff;padding:0;margin:0;font-family:Arial,sans-serif;display:flex;flex-direction:column;">
          <div style="width:100%;text-align:center;margin-bottom:15px;">
            <img src="/cura-full-header.jpg" style="width:100%;max-width:800px;height:auto;" alt="CURA Hospitals Header" />
          </div>
          
          <div style="padding:20px;padding-top:10px;flex:1;display:flex;flex-direction:column;">
            <div style="margin-bottom:12px;">
              <h2 style="text-align:center;margin-bottom:12px;font-size:18px;color:#000000;text-transform:uppercase;font-weight:bold;">PRESCRIPTION</h2>
              
              <!-- Patient Information Title -->
              <h3 style="margin-bottom:6px;font-size:14px;color:#333;font-weight:bold;">Patient Information</h3>
              
              <!-- Compact Patient Details Table -->
              <table style="width:100%;border-collapse:collapse;margin-bottom:8px;border:1px solid #ddd;">
                <tbody>
                  <tr>
                    <td style="border:1px solid #ddd;padding:6px;text-align:left;background-color:#f2f2f2;font-weight:bold;width:120px;font-size:14px;">Patient:</td>
                    <td style="border:1px solid #ddd;padding:6px;text-align:left;font-size:14px;">${prescription.patientName || '-'}</td>
                    <td style="border:1px solid #ddd;padding:6px;text-align:left;background-color:#f2f2f2;font-weight:bold;width:120px;font-size:14px;">Doctor:</td>
                    <td style="border:1px solid #ddd;padding:6px;text-align:left;font-size:14px;">${prescription.doctorName || '-'}</td>
                  </tr>
                  <tr>
                    <td style="border:1px solid #ddd;padding:6px;text-align:left;background-color:#f2f2f2;font-weight:bold;width:120px;font-size:14px;">Date:</td>
                    <td style="border:1px solid #ddd;padding:6px;text-align:left;font-size:14px;">${new Date(prescription.date).toLocaleDateString()}</td>
                    <td style="border:1px solid #ddd;padding:6px;text-align:left;background-color:#f2f2f2;font-weight:bold;width:120px;font-size:14px;">ID:</td>
                    <td style="border:1px solid #ddd;padding:6px;text-align:left;font-size:14px;font-family:monospace;">${prescription.appointmentId || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div style="margin-top:20px;flex:1;">
              <h3 style="margin-bottom:10px;">Medications:</h3>
              <table style="width:100%;border-collapse:collapse;margin-top:10px;">
                <thead>
                  <tr>
                    <th style="border:1px solid #ddd;padding:8px;text-align:left;background-color:#f2f2f2;">Medication</th>
                    <th style="border:1px solid #ddd;padding:8px;text-align:left;background-color:#f2f2f2;">Dosage</th>
                    <th style="border:1px solid #ddd;padding:8px;text-align:left;background-color:#f2f2f2;">Frequency</th>
                    <th style="border:1px solid #ddd;padding:8px;text-align:left;background-color:#f2f2f2;">Duration</th>
                    <th style="border:1px solid #ddd;padding:8px;text-align:left;background-color:#f2f2f2;">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${prescription.medications.map(med => `
                    <tr>
                      <td style="border:1px solid #ddd;padding:8px;text-align:left;">${med.name}</td>
                      <td style="border:1px solid #ddd;padding:8px;text-align:left;">${med.dosage || '-'}</td>
                      <td style="border:1px solid #ddd;padding:8px;text-align:left;">${med.frequency || '-'}</td>
                      <td style="border:1px solid #ddd;padding:8px;text-align:left;">${med.duration || '-'}</td>
                      <td style="border:1px solid #ddd;padding:8px;text-align:left;">${med.notes || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          
          <div style="width:100%;text-align:center;margin-top:auto;padding-top:30px;">
            <img src="/cura-footer.jpg" style="width:100%;max-width:800px;height:auto;" alt="CURA Hospitals Footer" />
          </div>
        </div>
      `;
      
      // Use html2canvas to render the container to a canvas
      const canvas = await html2canvas(container, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [794, 1123] });
      pdf.addImage(imgData, 'PNG', 0, 0, 794, 1123);
      pdf.save(`prescription-${prescription.appointmentId}.pdf`);
      document.body.removeChild(container);
    } catch (error) {
      console.error('Error downloading prescription:', error);
      toast({
        title: "Error",
        description: "Failed to download prescription. Please try again.",
        variant: "destructive",
      });
    }
  };

  const [sendingSMS, setSendingSMS] = useState<string | null>(null);

  const handleSMS = async (prescription: Prescription) => {
    try {
      setSendingSMS(prescription.id);
      
      // Get patient phone from appointment
      const appointmentQuery = `
        SELECT patient_phone FROM appointments 
        WHERE appointment_id = $1
      `;
      
      const response = await prescriptionsApi.sendSMSPrescription({
        appointment_id: prescription.appointmentId,
        patient_phone: prescription.patientName // This will be replaced with actual phone from backend
      });

      toast({
        title: "SMS Message Sent",
        description: `Prescription sent to ${prescription.patientName}`,
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

  const handleDelete = (prescription: Prescription) => {
    setPendingDeleteId(prescription.appointmentId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await prescriptionsApi.delete(pendingDeleteId);
      toast({ title: 'Deleted', description: 'Prescription deleted successfully.' });
      setRetrievedPrescriptions(prev => prev.filter(p => p.appointmentId !== pendingDeleteId));
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Error', description: 'Failed to delete prescription.', variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Prescription Retrieval
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={handleQRScan}
              className="flex items-center gap-2"
              variant="outline"
            >
              <QrCode className="h-4 w-4" />
              Scan QR Code
            </Button>
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Enter Appointment ID manually"
                value={appointmentId}
                onChange={(e) => setAppointmentId(e.target.value)}
              />
              <Button 
                onClick={handleManualSearch}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Scanner Dialog */}
      <QRScanner isOpen={isScanning} onClose={() => setIsScanning(false)} onScanSuccess={handleScanSuccess} />

      {/* Prescription Management Dashboard for retrieved appointment */}
      {retrievedAppointmentId && (
        <Card>
          <CardHeader>
            <CardTitle>Prescription Management</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingPage text="Loading prescriptions..." />
            ) : retrievalError ? (
              <div className="text-center text-muted-foreground py-8">{retrievalError}</div>
            ) : (
              <Table className="w-full text-xs sm:text-sm md:text-base">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Appointment ID</TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Patient Name</TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Doctor Name</TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Date</TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Status</TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retrievedPrescriptions.map((prescription) => (
                    <TableRow key={prescription.id} className="text-xs sm:text-sm md:text-base">
                      <TableCell className="font-mono px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">{
                        prescription.appointmentId.length > 8
                          ? `${prescription.appointmentId.slice(0, 4)}...${prescription.appointmentId.slice(-4)}`
                          : prescription.appointmentId
                      }</TableCell>
                      <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">{prescription.patientName}</TableCell>
                      <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">{prescription.doctorName}</TableCell>
                      <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">{new Date(prescription.date).toLocaleDateString()}</TableCell>
                      <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                        <Badge variant={prescription.dispenseStatus ? "default" : "secondary"} className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 md:px-3 py-0.5 sm:py-1">
                          {prescription.dispenseStatus ? "Dispensed" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                        <div className="flex gap-1 sm:gap-2">
                          <Dialog open={isPrescriptionDialogOpen} onOpenChange={setIsPrescriptionDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                size="icon"
                                className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 p-1 sm:p-2"
                                variant="outline"
                                onClick={() => handleViewPrescription(prescription)}
                              >
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'transparent', padding: 0 }}>
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
          Loading prescription details...
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Please wait while we fetch the data
        </div>
      </div>
    </div>
  ) : (
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
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Header */}
      <img src="/cura-full-header.jpg" alt="CURA Hospitals Header" style={{ width: '100%', marginBottom: 0 }} />
      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px 0 40px', minHeight: 400 }}>
      <div style={{ 
        fontWeight: 600, 
        fontSize: 18, 
        color: '#000000', 
        marginBottom: 16,
        textAlign: 'center',
        textTransform: 'uppercase'
      }}>PRESCRIPTION</div>
      
      {/* Patient Info Table */}
      <div style={{ 
        marginBottom: '16px',
        border: '1px solid #dee2e6', 
        borderRadius: '6px', 
        background: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '8px 12px', 
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <div style={{ 
            width: '3px', 
            height: '16px', 
            backgroundColor: '#e67e22', 
            borderRadius: '1px' 
          }}></div>
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#495057' }}>Patient Information</span>
        </div>
        
        <div style={{ padding: '0' }}>
          <Table>
            <TableBody>
              <TableRow style={{ borderBottom: '1px solid #f1f3f4' }}>
                <TableCell style={{ 
                  width: '120px', 
                  fontWeight: 600, 
                  fontSize: '13px',
                  color: '#495057',
                  backgroundColor: '#f8f9fa',
                  borderRight: '1px solid #dee2e6',
                  padding: '8px 12px'
                }}>
                  Patient:
                </TableCell>
                <TableCell style={{ 
                  fontWeight: 600, 
                  fontSize: '14px',
                  color: '#212529',
                  padding: '8px 12px'
                }}>
                  {selectedPrescription?.patientName || '-'}
                </TableCell>
              </TableRow>
              <TableRow style={{ borderBottom: '1px solid #f1f3f4' }}>
                <TableCell style={{ 
                  width: '120px', 
                  fontWeight: 600, 
                  fontSize: '13px',
                  color: '#495057',
                  backgroundColor: '#f8f9fa',
                  borderRight: '1px solid #dee2e6',
                  padding: '8px 12px'
                }}>
                  Doctor:
                </TableCell>
                <TableCell style={{ 
                  fontWeight: 600, 
                  fontSize: '14px',
                  color: '#212529',
                  padding: '8px 12px'
                }}>
                  {selectedPrescription?.doctorName || '-'}
                </TableCell>
              </TableRow>
              <TableRow style={{ borderBottom: '1px solid #f1f3f4' }}>
                <TableCell style={{ 
                  width: '120px', 
                  fontWeight: 600, 
                  fontSize: '13px',
                  color: '#495057',
                  backgroundColor: '#f8f9fa',
                  borderRight: '1px solid #dee2e6',
                  padding: '8px 12px'
                }}>
                  Date:
                </TableCell>
                <TableCell style={{ 
                  fontWeight: 600, 
                  fontSize: '14px',
                  color: '#212529',
                  padding: '8px 12px'
                }}>
                  {selectedPrescription ? new Date(selectedPrescription.date).toLocaleDateString() : '-'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell style={{ 
                  width: '120px', 
                  fontWeight: 600, 
                  fontSize: '13px',
                  color: '#495057',
                  backgroundColor: '#f8f9fa',
                  borderRight: '1px solid #dee2e6',
                  padding: '8px 12px'
                }}>
                  Appointment ID:
                </TableCell>
                <TableCell style={{ 
                  fontWeight: 600, 
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  color: '#007bff',
                  padding: '8px 12px'
                }}>
                  {selectedPrescription?.appointmentId || '-'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Enhanced Table Container */}
      <div style={{ 
        border: '1px solid #dee2e6', 
        borderRadius: '8px', 
        padding: '16px', 
        background: '#ffffff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{ 
          marginBottom: '12px', 
          padding: '8px 0', 
          borderBottom: '2px solid #e9ecef',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ 
            width: '4px', 
            height: '20px', 
            backgroundColor: '#e67e22', 
            borderRadius: '2px' 
          }}></div>
          <span style={{ fontWeight: 600, fontSize: '16px', color: '#495057' }}>Medications</span>
          <span style={{ 
            backgroundColor: '#e9ecef', 
            color: '#6c757d', 
            padding: '2px 8px', 
            borderRadius: '12px', 
            fontSize: '12px',
            fontWeight: 500
          }}>
            {selectedPrescription?.medications.length || 0} items
          </span>
        </div>
        
        <div style={{ 
          overflowX: 'auto',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <Table>
            <TableHeader style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1 }}>
              <TableRow style={{ backgroundColor: '#f8f9fa' }}>
                <TableHead style={{ 
                  width: '50px', 
                  textAlign: 'center', 
                  fontWeight: 600, 
                  fontSize: '14px',
                  color: '#495057',
                  backgroundColor: '#f8f9fa'
                }}>#</TableHead>
                <TableHead style={{ 
                  fontWeight: 600, 
                  fontSize: '14px',
                  color: '#495057',
                  minWidth: '200px',
                  backgroundColor: '#f8f9fa'
                }}>Medication Name</TableHead>
                <TableHead style={{ 
                  fontWeight: 600, 
                  fontSize: '14px',
                  color: '#495057',
                  minWidth: '120px',
                  backgroundColor: '#f8f9fa'
                }}>Dosage</TableHead>
                <TableHead style={{ 
                  fontWeight: 600, 
                  fontSize: '14px',
                  color: '#495057',
                  minWidth: '120px',
                  backgroundColor: '#f8f9fa'
                }}>Frequency</TableHead>
                <TableHead style={{ 
                  fontWeight: 600, 
                  fontSize: '14px',
                  color: '#495057',
                  minWidth: '120px',
                  backgroundColor: '#f8f9fa'
                }}>Duration</TableHead>
                <TableHead style={{ 
                  fontWeight: 600, 
                  fontSize: '14px',
                  color: '#495057',
                  minWidth: '200px',
                  backgroundColor: '#f8f9fa'
                }}>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedPrescription?.medications.map((med, index) => (
                <TableRow key={index} style={{ 
                  borderBottom: '1px solid #f1f3f4',
                  transition: 'background-color 0.2s ease'
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}>
                  <TableCell style={{ 
                    textAlign: 'center', 
                    fontWeight: 600, 
                    color: '#6c757d',
                    fontSize: '14px'
                  }}>
                    {index + 1}
                  </TableCell>
                  <TableCell style={{ 
                    fontWeight: 600, 
                    fontSize: '15px',
                    color: '#212529'
                  }}>
                    {med.name}
                  </TableCell>
                  <TableCell style={{ 
                    fontSize: '14px',
                    color: '#495057'
                  }}>
                    {med.dosage || '-'}
                  </TableCell>
                  <TableCell style={{ 
                    fontSize: '14px',
                    color: '#495057'
                  }}>
                    {med.frequency || '-'}
                  </TableCell>
                  <TableCell style={{ 
                    fontSize: '14px',
                    color: '#495057'
                  }}>
                    {med.duration || '-'}
                  </TableCell>
                  <TableCell style={{ 
                    fontSize: '14px',
                    color: '#6c757d',
                    maxWidth: '200px'
                  }}>
                    <div style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      cursor: 'help'
                    }} title={med.notes || '-'}>
                      {med.notes || '-'}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Show total count for large lists */}
        {selectedPrescription?.medications.length > 4 && (
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: '#f8f9fa', 
            borderTop: '1px solid #dee2e6',
            fontSize: '12px',
            color: '#6c757d',
            textAlign: 'center'
          }}>
            Showing {selectedPrescription?.medications.length} medications
          </div>
        )}
      </div>
      {/* Dispense button (if not dispensed) */}
      {!selectedPrescription?.dispenseStatus && (
        <Button 
          onClick={() => handleDispense(selectedPrescription.id)}
          className="w-full mt-6"
        >
          Dispense Prescription
        </Button>
      )}
    </div>
    {/* Footer always at the bottom */}
    <img src="/cura-footer.jpg" alt="CURA Hospitals Footer" style={{ width: '100%', marginTop: 'auto' }} />
  </div>
  )}
</DialogContent>
                          </Dialog>
                          <Button
                            size="icon"
                            className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 p-1 sm:p-2"
                            variant="outline"
                            onClick={() => handleDownloadPrescription(prescription)}
                          >
                            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            size="icon"
                            className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 p-1 sm:p-2"
                            variant="outline"
                            onClick={() => handleSMS(prescription)}
                            disabled={sendingSMS === prescription.id}
                          >
                            {sendingSMS === prescription.id ? (
                              <div className="h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                            ) : (
                              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                            )}
                          </Button>
                          {!prescription.dispenseStatus && (
                            <Button
                              size="icon"
                              className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 p-1 sm:p-2"
                              variant="destructive"
                              onClick={() => handleDelete(prescription)}
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bill Summary Modal */}
      {showBillModal && billPrescription && (
        <Dialog open={showBillModal} onOpenChange={handleCloseBillModal}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Bill Summary</DialogTitle>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billPrescription.medications.map((med, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{med.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{med.frequency || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{med.duration || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border rounded-md">
                          <button
                            type="button"
                            onClick={() => handleBillQuantityChange(med.name, (billQuantities[med.name] || 0) - 1)}
                            disabled={(billQuantities[med.name] || 0) <= 0}
                            className="px-2 py-1 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed border-r"
                          >
                            -
                          </button>
                          <Input
                            type="number"
                            min={0}
                            max={med.quantity || 999}
                            value={billQuantities[med.name] || 0}
                            onChange={e => handleBillQuantityChange(med.name, Number(e.target.value))}
                            className="w-16 h-8 text-sm border-0 text-center focus:ring-0"
                          />
                          <button
                            type="button"
                            onClick={() => handleBillQuantityChange(med.name, (billQuantities[med.name] || 0) + 1)}
                            disabled={(billQuantities[med.name] || 0) >= (med.quantity || 0)}
                            className="px-2 py-1 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed border-l"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          / {med.quantity || 0} available
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{med.price ? `₹${med.price}` : '-'}</TableCell>
                    <TableCell>{med.price ? `₹${(med.price * (billQuantities[med.name] || 0)).toFixed(2)}` : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end font-semibold mt-4">
              Total: ₹{
                billPrescription.medications.reduce((sum, med) => {
                  const qty = billQuantities[med.name] || 0;
                  return sum + (med.price ? med.price * qty : 0);
                }, 0).toFixed(2)
              }
            </div>
            {(() => {
              const total = billPrescription.medications.reduce((sum, med) => {
                const qty = billQuantities[med.name] || 0;
                return sum + (med.price ? med.price * qty : 0);
              }, 0);
              return total === 0 ? (
                <div className="text-center text-amber-600 text-sm mt-2 p-2 bg-amber-50 rounded-md">
                  ⚠️ No items selected for payment. Please add quantities to proceed.
                </div>
              ) : null;
            })()}
            <div className="flex gap-4 mt-4">
              <Button variant={paymentMode === 'cash' ? 'default' : 'outline'} onClick={() => setPaymentMode('cash')} disabled={isProcessingPayment}>Cash</Button>
              <Button variant={paymentMode === 'online' ? 'default' : 'outline'} onClick={() => setPaymentMode('online')} disabled={isProcessingPayment}>Online</Button>
            </div>
            <DialogFooter>
              <Button
                onClick={handleProceedToPayment}
                disabled={isProcessingPayment || (() => {
                  const total = billPrescription.medications.reduce((sum, med) => {
                    const qty = billQuantities[med.name] || 0;
                    return sum + (med.price ? med.price * qty : 0);
                  }, 0);
                  return total === 0;
                })()}
                className="w-full mt-2"
              >
                {isProcessingPayment ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  (() => {
                    const total = billPrescription.medications.reduce((sum, med) => {
                      const qty = billQuantities[med.name] || 0;
                      return sum + (med.price ? med.price * qty : 0);
                    }, 0);
                    return total === 0 ? 'No Items to Pay' : (paymentMode === 'online' ? 'Pay with Razorpay' : 'Complete Payment');
                  })()
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <ConfirmDialogContent>
          <ConfirmDialogHeader>
            <ConfirmDialogTitle>Delete Prescription?</ConfirmDialogTitle>
          </ConfirmDialogHeader>
          <div>Are you sure you want to delete this prescription? This action cannot be undone.</div>
          <ConfirmDialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </ConfirmDialogFooter>
        </ConfirmDialogContent>
      </ConfirmDialog>
    </div>
  );
};