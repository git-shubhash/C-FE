import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QrCode, Search, TestTube } from 'lucide-react';
import { patientServicesApi, PatientServicesResponse } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { QRScanner } from './QRScanner';
import { LoadingPage } from '@/components/ui/loading';



export const LabPrescriptionsTab: React.FC = () => {
  const [appointmentId, setAppointmentId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [patientData, setPatientData] = useState<PatientServicesResponse | null>(null);
  const [retrievedAppointmentId, setRetrievedAppointmentId] = useState<string | null>(null);
  const [retrievalError, setRetrievalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSampleUpdateLoading, setIsSampleUpdateLoading] = useState<number | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  const handleQRScan = () => {
    setIsScanning(true);
  };

  const handleScanSuccess = async (scannedAppointmentId: string) => {
    setIsScanning(false);
    setAppointmentId(scannedAppointmentId);
    setIsSearchLoading(true);
    await retrieveLabPrescriptions(scannedAppointmentId);
    setIsSearchLoading(false);
  };

  const handleManualSearch = async () => {
    if (!appointmentId.trim()) return;
    setIsSearchLoading(true);
    await retrieveLabPrescriptions(appointmentId.trim());
    setAppointmentId('');
    setIsSearchLoading(false);
  };

  const retrieveLabPrescriptions = async (id: string) => {
    setRetrievalError(null);
    setRetrievedAppointmentId(id);
    setIsLoading(true);
    try {
      const data = await patientServicesApi.getByAppointmentId(id);
      if (!data || !data.services || data.services.length === 0) {
        setPatientData(null);
        setRetrievalError('No lab prescriptions found for this appointment');
        return;
      }
      setPatientData(data);
    } catch (error) {
      setPatientData(null);
      setRetrievalError('No lab prescriptions found for this appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSampleCollected = async (id: number, sampleCollected: boolean) => {
    setIsSampleUpdateLoading(id);
    try {
      await patientServicesApi.updateSampleCollected(id, sampleCollected);
      toast({ title: 'Success', description: `Sample ${sampleCollected ? 'collected' : 'marked as not collected'}` });
      
      // Refresh the data
      if (retrievedAppointmentId) {
        await retrieveLabPrescriptions(retrievedAppointmentId);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update sample collection status', variant: 'destructive' });
    } finally {
      setIsSampleUpdateLoading(null);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Paid':
        return 'default';
      case 'InProgress':
        return 'secondary';
      case 'Partial':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Paid':
        return 'text-green-600';
      case 'InProgress':
        return 'text-blue-600';
      case 'Partial':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Lab Prescription Retrieval
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
                 disabled={isSearchLoading}
               >
                 {isSearchLoading ? (
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                 ) : (
                   <Search className="h-4 w-4" />
                 )}
                 {isSearchLoading ? 'Searching...' : 'Search'}
               </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Scanner Dialog */}
      <QRScanner isOpen={isScanning} onClose={() => setIsScanning(false)} onScanSuccess={handleScanSuccess} />

             {/* Patient Details and Services Table */}
       {retrievedAppointmentId && (
                 <div className="space-y-6">
           {isLoading ? (
             <LoadingPage text="Loading lab services..." />
           ) : patientData ? (
             <>
               {/* Patient Information Card */}
               <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Patient Name</label>
                  <p className="text-sm font-semibold">{patientData.patient.patient_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Doctor Name</label>
                  <p className="text-sm font-semibold">{patientData.patient.doctor_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Appointment Date</label>
                  <p className="text-sm font-semibold">{new Date(patientData.patient.appointment_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Appointment ID</label>
                  <p className="text-sm font-mono text-blue-600">{patientData.patient.appointment_id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

                                {/* All Services in One Card with Department Headers */}
           <Card>
             <CardHeader>
               <CardTitle>Lab Services</CardTitle>
             </CardHeader>
             <CardContent>
                                               <div className="rounded-md border">
                  <Table className="w-full text-xs sm:text-sm md:text-base">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Service</TableHead>
                        <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden sm:table-cell">Prescribed Date</TableHead>
                        <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Sample Status</TableHead>
                        <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden md:table-cell">Report Status</TableHead>
                        <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden lg:table-cell">Payment Status</TableHead>
                        <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Sample Collection</TableHead>
                      </TableRow>
                    </TableHeader>
                 <TableBody>
                   {(() => {
                     // Group services by department
                     const servicesByDepartment = patientData.services.reduce((acc, service) => {
                       const deptName = service.sub_department_name;
                       if (!acc[deptName]) {
                         acc[deptName] = [];
                       }
                       acc[deptName].push(service);
                       return acc;
                     }, {} as Record<string, typeof patientData.services>);

                     const rows: JSX.Element[] = [];
                     
                     Object.entries(servicesByDepartment).forEach(([deptName, services], deptIndex) => {
                                               // Add department header row
                        rows.push(
                          <TableRow key={`dept-${deptName}`}>
                            <TableCell colSpan={6} className="px-1 py-2 sm:px-2 sm:py-3 md:px-4 md:py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
                                <span className="text-lg font-semibold text-gray-700">{deptName}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                       
                       // Add service rows for this department
                       services.forEach((service) => {
                         const isPaid = service.payment_status === true;
                         
                         rows.push(
                           <TableRow 
                             key={service.patient_service_id} 
                             className={`text-xs sm:text-sm md:text-base ${
                               !isPaid ? 'bg-red-50' : ''
                             }`}
                           >
                                                           <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                                <div className="font-medium text-sm">{service.service_type_name}</div>
                              </TableCell>
                              <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden sm:table-cell">
                                {new Date(service.prescribed_date).toLocaleDateString()}
                              </TableCell>
                                                            <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                                 <span className={`text-sm font-medium ${service.sample_collected ? 'text-green-600' : 'text-orange-600'}`}>
                                   {service.sample_collected ? "Collected" : "Pending"}
                                 </span>
                               </TableCell>
                               <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden md:table-cell">
                                 <span className={`text-sm font-medium ${getStatusColor(service.report_status)}`}>
                                   {service.report_status}
                                 </span>
                               </TableCell>
                               <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden lg:table-cell">
                                 <span className={`text-sm font-medium ${isPaid ? 'text-green-600' : 'text-gray-600'}`}>
                                   {isPaid ? "Paid" : "Pending"}
                                 </span>
                               </TableCell>
                              <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                                {!isPaid ? (
                                  <span className="text-sm font-medium text-red-600">
                                    Unpaid
                                  </span>
                                ) : service.sample_collected ? (
                                 <span className="text-sm text-gray-600 font-medium">
                                   {service.sample_collected_at ? new Date(service.sample_collected_at).toLocaleString() : ''}
                                 </span>
                               ) : (
                                                                                                                                                                                                                                                                               <Button
                                      size="sm"
                                      onClick={() => handleUpdateSampleCollected(service.patient_service_id, true)}
                                      className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 w-20 sm:w-24 md:w-32 h-7 sm:h-8"
                                      disabled={isSampleUpdateLoading === service.patient_service_id}
                                    >
                                     {isSampleUpdateLoading === service.patient_service_id ? (
                                       <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                                                                          ) : (
                                        <>
                                          <span className="sm:hidden">Collect</span>
                                          <span className="hidden sm:inline md:hidden">Sample</span>
                                          <span className="hidden md:inline">Sample Collected</span>
                                        </>
                                      )}
                                   </Button>
                               )}
                             </TableCell>
                           </TableRow>
                         );
                       });
                     });
                     
                     return rows;
                   })()}
                                   </TableBody>
                </Table>
                </div>
              </CardContent>
           </Card>
             </>
           ) : retrievalError ? (
             <div className="text-center text-muted-foreground py-8">{retrievalError}</div>
           ) : null}
         </div>
       )}

      
    </div>
  );
};
