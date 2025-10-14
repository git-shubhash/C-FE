import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QrCode, Search, Activity, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { QRScanner } from '@/components/pharma/QRScanner';
import { LoadingPage } from '@/components/ui/loading';
import { radiologyPrescriptionsApi } from '@/services/api';

// Interfaces for Radiology Prescriptions
export interface RadiologyService {
  prescription_id: string;
  appointment_id: string;
  service_id: string;
  payment_status: boolean;
  test_conducted: boolean;
  test_conducted_at: string | null;
  service_name: string;
  prescribed_date: string;
}

export interface RadiologyPatientDetails {
  appointment_id: string;
  patient_name: string;
  doctor_name: string;
  appointment_date: string;
  patient_phone: string;
}

export interface RadiologyPrescriptionsResponse {
  patient: RadiologyPatientDetails;
  services: RadiologyService[];
}

export const RadiologyPrescriptionsTab: React.FC = () => {
  const [appointmentId, setAppointmentId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [patientData, setPatientData] = useState<RadiologyPrescriptionsResponse | null>(null);
  const [retrievedAppointmentId, setRetrievedAppointmentId] = useState<string | null>(null);
  const [retrievalError, setRetrievalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestUpdateLoading, setIsTestUpdateLoading] = useState<string | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  const handleQRScan = () => {
    setIsScanning(true);
  };

  const handleScanSuccess = async (scannedAppointmentId: string) => {
    setIsScanning(false);
    setAppointmentId(scannedAppointmentId);
    setIsSearchLoading(true);
    await retrieveRadiologyPrescriptions(scannedAppointmentId);
    setIsSearchLoading(false);
  };

  const handleManualSearch = async () => {
    if (!appointmentId.trim()) return;
    setIsSearchLoading(true);
    await retrieveRadiologyPrescriptions(appointmentId.trim());
    setAppointmentId('');
    setIsSearchLoading(false);
  };

  const retrieveRadiologyPrescriptions = async (id: string) => {
    setRetrievalError(null);
    setRetrievedAppointmentId(id);
    setIsLoading(true);
    try {
      const data = await radiologyPrescriptionsApi.getByAppointmentId(id);
      if (!data || !data.services || data.services.length === 0) {
        setPatientData(null);
        setRetrievalError('No radiology prescriptions found for this appointment');
        return;
      }
      setPatientData(data);
    } catch (error) {
      setPatientData(null);
      setRetrievalError('No radiology prescriptions found for this appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTestConducted = async (prescriptionId: string, testConducted: boolean) => {
    setIsTestUpdateLoading(prescriptionId);
    try {
      await radiologyPrescriptionsApi.updateTestConducted(prescriptionId, testConducted);
      toast({ title: 'Success', description: `Test ${testConducted ? 'conducted' : 'marked as not conducted'}` });
      
      // Refresh the data
      if (retrievedAppointmentId) {
        await retrieveRadiologyPrescriptions(retrievedAppointmentId);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update test conducted status', variant: 'destructive' });
    } finally {
      setIsTestUpdateLoading(null);
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Radiology Prescription Retrieval
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
            <LoadingPage text="Loading radiology services..." />
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

              {/* Radiology Services Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Radiology Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table className="w-full text-xs sm:text-sm md:text-base">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Service</TableHead>
                          <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden sm:table-cell">Prescribed By</TableHead>
                          <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden md:table-cell">Test Conducted</TableHead>
                          <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden lg:table-cell">Payment Status</TableHead>
                          <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientData.services.map((service) => {
                          const isPaid = service.payment_status === true;
                          
                          return (
                            <TableRow 
                              key={service.prescription_id} 
                              className={`text-xs sm:text-sm md:text-base ${
                                !isPaid ? 'bg-red-50' : ''
                              }`}
                            >
                              <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                                <div className="font-medium">{service.service_name}</div>
                              </TableCell>
                              <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden sm:table-cell">
                                <div className="font-medium">{patientData.patient.doctor_name}</div>
                                <div className="text-xs text-gray-500">{new Date(service.prescribed_date).toLocaleDateString()}</div>
                              </TableCell>
                              <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden md:table-cell">
                                <span className={`text-sm font-medium ${service.test_conducted ? 'text-green-600' : 'text-orange-600'}`}>
                                  {service.test_conducted ? "Conducted" : "Pending"}
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
                                ) : service.test_conducted ? (
                                  <span className="text-sm text-gray-600 font-medium">
                                    {service.test_conducted_at ? new Date(service.test_conducted_at).toLocaleString() : ''}
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateTestConducted(service.prescription_id, true)}
                                    className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 w-20 sm:w-24 md:w-32 h-7 sm:h-8"
                                    disabled={isTestUpdateLoading === service.prescription_id}
                                  >
                                    {isTestUpdateLoading === service.prescription_id ? (
                                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                                    ) : (
                                      <>
                                        <span className="sm:hidden">Conduct</span>
                                        <span className="hidden sm:inline md:hidden">Test</span>
                                        <span className="hidden md:inline">Conduct Test</span>
                                      </>
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
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
