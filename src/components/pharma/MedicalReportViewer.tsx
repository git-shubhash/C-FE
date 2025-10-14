import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, FileText } from 'lucide-react';
import { patientTestResultsApi, MedicalReportData as ApiMedicalReportData } from '@/services/api';
import { LoadingPage } from '@/components/ui/loading';
import { toast } from '@/hooks/use-toast';

interface TestResult {
  test_name: string;
  result: string;
  unit: string;
  reference_range: string;
  status?: 'normal' | 'high' | 'low';
}

interface MedicalReportData {
  patient_name: string;
  age: string;
  gender: string;
  ip_reg_no: string;
  lab_no: string;
  referred_by: string;
  specimen: string;
  verified_on: string;
  barcode_no: string;
  abha_address: string;
  bill_no: string;
  sample_collected: string;
  sample_received: string;
  report_on: string;
  bill_creation_date: string;
  barcode: string;
  passport_no: string;
  bed_cage_no: string;
  abha_number: string;
  test_category: string;
  test_results: TestResult[];
}

interface MedicalReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  patientServiceId: number;
  serviceName: string;
  appointmentId: string;
}

const MedicalReportViewer: React.FC<MedicalReportViewerProps> = ({
  isOpen,
  onClose,
  patientServiceId,
  serviceName,
  appointmentId
}) => {
  const [reportData, setReportData] = useState<ApiMedicalReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && patientServiceId) {
      fetchReportData();
    }
  }, [isOpen, patientServiceId]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const data = await patientTestResultsApi.getMedicalReportData(patientServiceId);
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
          <DialogHeader className="p-4 pb-0 bg-gray-50 border-b no-print sticky top-0 z-10">
            <div className="flex justify-between items-center w-full">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Medical Report - {serviceName}
              </DialogTitle>
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="p-6 bg-gray-100 min-h-screen">
            <div className="bg-white shadow-lg mx-auto flex flex-col items-center justify-center" style={{ 
              width: '100%',
              maxWidth: '210mm',
              minHeight: '297mm',
              padding: '2rem'
            }}>
              <div className="flex flex-col items-center justify-center h-full">
                <LoadingPage />
                <p className="mt-4 text-gray-500">Loading report data...</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
        <DialogHeader className="p-4 pb-0 bg-gray-50 border-b no-print sticky top-0 z-10">
          <div className="flex justify-between items-center w-full">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Medical Report - {serviceName}
            </DialogTitle>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        {/* A4 Paper Container */}
        <div className="p-6 bg-gray-100 min-h-screen print:p-0 print:bg-white">
          <div className="print-content bg-white shadow-lg mx-auto print:shadow-none flex flex-col" style={{ 
            width: '100%',
            maxWidth: '210mm',
            minHeight: '297mm',
            padding: '0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            {/* Header Section - Full width, no margin */}
            <div className="w-full text-center mb-0">
              <img 
                src="/cura-full-header.jpg" 
                alt="CURA Hospitals Header" 
                className="w-full h-auto" 
              />
            </div>

            {/* Content Container with proper padding */}
            <div className="px-3 sm:px-4 md:px-5 py-4 sm:py-5 md:py-6 flex-1">
              {/* Patient Information Table */}
              <div className="mb-6 sm:mb-8">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-xs sm:text-sm">
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2 sm:p-3 font-semibold text-gray-700 bg-gray-50 text-xs sm:text-sm">Patient Name</td>
                        <td className="border border-gray-300 p-2 sm:p-3 text-gray-900 text-xs sm:text-sm">{reportData.patient_info.patient_name}</td>
                        <td className="border border-gray-300 p-2 sm:p-3 font-semibold text-gray-700 bg-gray-50 text-xs sm:text-sm">Sample Collected</td>
                        <td className="border border-gray-300 p-2 sm:p-3 text-gray-900 text-xs sm:text-sm">
                          {reportData.patient_info.sample_collected ? 
                            new Date(reportData.patient_info.sample_collected).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'N/A'
                          }
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 sm:p-3 font-semibold text-gray-700 bg-gray-50 text-xs sm:text-sm">Phone</td>
                        <td className="border border-gray-300 p-2 sm:p-3 text-gray-900 text-xs sm:text-sm">{reportData.patient_info.phone || 'N/A'}</td>
                        <td className="border border-gray-300 p-2 sm:p-3 font-semibold text-gray-700 bg-gray-50 text-xs sm:text-sm">Sample Received</td>
                        <td className="border border-gray-300 p-2 sm:p-3 text-gray-900 text-xs sm:text-sm">
                          {reportData.patient_info.sample_received ? 
                            new Date(reportData.patient_info.sample_received).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'N/A'
                          }
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 sm:p-3 font-semibold text-gray-700 bg-gray-50 text-xs sm:text-sm">Referred By</td>
                        <td className="border border-gray-300 p-2 sm:p-3 text-gray-900 text-xs sm:text-sm">{reportData.patient_info.doctor_name}</td>
                        <td className="border border-gray-300 p-2 sm:p-3 font-semibold text-gray-700 bg-gray-50 text-xs sm:text-sm">Report Date</td>
                        <td className="border border-gray-300 p-2 sm:p-3 text-gray-900 text-xs sm:text-sm">
                          {reportData.patient_info.report_on ? 
                            new Date(reportData.patient_info.report_on).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'N/A'
                          }
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Test Results Section */}
              <div className="mb-6 sm:mb-8">
                {/* Section Title */}
                <div className="text-center mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 underline">
                    {reportData.service_info.sub_department_name.toUpperCase()}
                  </h3>
                </div>

                {/* Service Name */}
                <div className="mb-3 sm:mb-4">
                  <h4 className="text-base sm:text-lg font-semibold text-blue-600 text-left">
                    {reportData.service_info.service_type_name}
                  </h4>
                </div>

                {/* Test Results Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-gray-100 print:bg-gray-100">
                        <th className="border border-gray-300 p-2 sm:p-3 text-left font-semibold text-gray-700 bg-gray-50 print:bg-gray-50 text-xs sm:text-sm">
                          Test Name
                        </th>
                        <th className="border border-gray-300 p-2 sm:p-3 text-center font-semibold text-gray-700 bg-gray-50 print:bg-gray-50 text-xs sm:text-sm">
                          Results
                        </th>
                        <th className="border border-gray-300 p-2 sm:p-3 text-center font-semibold text-gray-700 bg-gray-50 print:bg-gray-50 text-xs sm:text-sm">
                          Units
                        </th>
                        <th className="border border-gray-300 p-2 sm:p-3 text-center font-semibold text-gray-700 bg-gray-50 print:bg-gray-50 text-xs sm:text-sm">
                          Bio. Ref. Interval
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.test_results.map((test, index) => {
                        const referenceRange = test.normal_min && test.normal_max 
                          ? `${test.normal_min} - ${test.normal_max}`
                          : 'N/A';
                        
                        // Determine status based on result value and normal range
                        let status = '';
                        let resultDisplay = test.result_value;
                        const resultValue = parseFloat(test.result_value);
                        if (!isNaN(resultValue) && test.normal_min && test.normal_max) {
                          if (resultValue < test.normal_min) {
                            status = '↓';
                            resultDisplay = `↓ ${test.result_value}`;
                          } else if (resultValue > test.normal_max) {
                            status = '↑';
                            resultDisplay = `↑ ${test.result_value}`;
                          }
                        }
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50 print:hover:bg-transparent">
                            <td className="border border-gray-300 p-2 sm:p-3 font-medium text-gray-900 text-xs sm:text-sm">
                              {test.test_name}
                            </td>
                            <td className="border border-gray-300 p-2 sm:p-3 text-center font-semibold text-gray-900 text-xs sm:text-sm">
                              {resultDisplay}
                            </td>
                            <td className="border border-gray-300 p-2 sm:p-3 text-center text-gray-700 text-xs sm:text-sm">
                              {test.unit || '-'}
                            </td>
                            <td className="border border-gray-300 p-2 sm:p-3 text-center text-gray-700 text-xs sm:text-sm">
                              {referenceRange}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* End of Report Divider */}
                <div className="text-center mt-6 sm:mt-8">
                  <div className="inline-block border-b-2 border-dashed border-gray-400 pb-2">
                    <span className="font-semibold text-gray-600 text-xs sm:text-sm">
                      ---End of the Report---
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Section - Print Date & Time */}
            <div className="w-full mt-auto mb-2 border-t border-gray-200">
              <div className="text-xs text-gray-500 text-left px-3 sm:px-4 md:px-5 pt-3 sm:pt-4">
                <p>Print D&T: {new Date().toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MedicalReportViewer;
