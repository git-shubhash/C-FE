import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from '@/components/ui/pagination';
import { Search, Plus, Edit, Trash2, Stethoscope, TestTube, Building2, Filter, Download, Printer, ArrowLeft, FileText, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { api, patientTestResultsApi } from '@/services/api';
import { LoadingPage } from '@/components/ui/loading';
import MedicalReportViewer from './MedicalReportViewer';

// Import PDF generation libraries
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

interface ReportViewTabProps {
  report: CompletedReport;
  onBack: () => void;
  department?: string;
}

const ReportViewTab: React.FC<ReportViewTabProps> = ({ report, onBack, department }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>(department || 'all');
  const [loading, setLoading] = useState(false);
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  
  // Service selection state
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set());
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Calculate items per page based on viewport height
  useEffect(() => {
    const calculateItemsPerPage = () => {
      const vh = window.innerHeight;
      const headerHeight = 300; // Approximate height of headers, patient info, search, filters
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

  // Filter services based on search and department
  const filteredServices = report.services.filter(service => {
    const matchesSearch = service.service_type_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.sub_department_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || 
      service.sub_department_name.toLowerCase().includes(selectedDepartment.toLowerCase());
    
    return matchesSearch && matchesDepartment;
  });

  // Get unique departments from services
  const uniqueDepartments = Array.from(new Set(report.services.map(service => service.sub_department_name)));

  // Pagination logic
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentServices = filteredServices.slice(startIndex, endIndex);

  // Group current services by department for display
  const currentGroupedServices = currentServices.reduce((acc, service) => {
    const department = service.sub_department_name;
    if (!acc[department]) {
      acc[department] = [];
    }
    acc[department].push(service);
    return acc;
  }, {} as Record<string, typeof currentServices>);
  
  const currentSortedDepartments = Object.keys(currentGroupedServices).sort();

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDepartment]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Service selection handlers
  const handleServiceSelection = (serviceId: number, checked: boolean) => {
    const newSelection = new Set(selectedServices);
    if (checked) {
      newSelection.add(serviceId);
    } else {
      newSelection.delete(serviceId);
    }
    setSelectedServices(newSelection);
  };



  const clearAllServices = () => {
    setSelectedServices(new Set());
  };

  // Print combined report with all selected services
  const printCombinedReport = async () => {
    if (selectedServices.size === 0) {
      toast({
        title: 'No Services Selected',
        description: 'Please select at least one service to print a report',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Group selected services by department
      console.log('Selected services for print:', selectedServices);
      
      const servicesWithResults = await Promise.all(
        Array.from(selectedServices).map(async (service) => {
          try {
            const testResults = await patientTestResultsApi.getTestResults(service);
            console.log('Test results for service', service, ':', testResults);
            return {
              ...report.services.find(s => s.patient_service_id === service),
              testResults: testResults || []
            };
          } catch (error) {
            console.error('Error fetching test results for service:', service, error);
            return {
              ...report.services.find(s => s.patient_service_id === service),
              testResults: []
            };
          }
        })
      );
      
      console.log('Services with results:', servicesWithResults);

      const groupedByDepartment = servicesWithResults.reduce((acc, service) => {
        const dept = service.sub_department_name;
        if (!acc[dept]) {
          acc[dept] = [];
        }
        acc[dept].push(service);
        return acc;
      }, {} as Record<string, typeof servicesWithResults>);

      // Calculate total pages (one page per department)
      const totalPages = Object.keys(groupedByDepartment).length;
      let currentPageNumber = 0;

      // Get patient information from the main report data (same for all departments)
      let globalPatientInfo = {
        phoneNumber: 'N/A',
        sampleCollected: 'N/A', 
        sampleReceived: 'N/A',
        patientName: report.patient_name || 'N/A',
        doctorName: report.doctor_name || 'N/A',
        appointmentDate: report.appointment_date || new Date().toISOString()
      };

      // Try to get additional patient info from the first service
      const firstService = servicesWithResults[0];
      if (firstService && firstService.patient_service_id) {
        try {
          const reportData = await patientTestResultsApi.getMedicalReportData(firstService.patient_service_id);
          console.log('Global patient report data:', reportData);
          
          if (reportData.patient_info) {
            globalPatientInfo.phoneNumber = reportData.patient_info.phone || globalPatientInfo.phoneNumber;
            globalPatientInfo.patientName = reportData.patient_info.patient_name || globalPatientInfo.patientName;
            globalPatientInfo.doctorName = reportData.patient_info.doctor_name || globalPatientInfo.doctorName;
            
            if (reportData.patient_info.sample_collected) {
              globalPatientInfo.sampleCollected = new Date(reportData.patient_info.sample_collected).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            }
            
            if (reportData.patient_info.sample_received) {
              globalPatientInfo.sampleReceived = new Date(reportData.patient_info.sample_received).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            }
          }
        } catch (error) {
          console.error('Error fetching global patient info:', error);
        }
      }

      console.log('Final global patient info:', globalPatientInfo);

      // Create department info with shared patient data
      const departmentPatientInfo = Object.entries(groupedByDepartment).map(([department, services]) => ({
        department,
        services,
        ...globalPatientInfo
      }));

      // Create combined report content for printing using A4 page layout
      const combinedContent = departmentPatientInfo.map((deptInfo) => {
        currentPageNumber++;
        const { department, services, phoneNumber, sampleCollected, sampleReceived, patientName, doctorName, appointmentDate } = deptInfo;
        
        console.log('Creating page for department:', department, 'with patient info:', {
          patientName, phoneNumber, sampleCollected, sampleReceived, doctorName, appointmentDate
        });
        
        return `
        <div class="page">
          <div class="content">
            <!-- Header Section -->
            <div style="width: 100%; text-center; margin-bottom: 20px;">
              <img src="/cura-full-header.jpg" alt="CURA Hospitals Header" style="width: 100%; height: auto;" />
            </div>

            <!-- Patient Information Table -->
            <div style="margin-bottom: 25px;">
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; font-size: 12px;">
                <tbody>
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-weight: 600; color: #374151; background-color: #f9fafb;">Patient Name</td>
                    <td style="border: 1px solid #d1d5db; padding: 6px 10px; color: #111827;">${patientName}</td>
                    <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-weight: 600; color: #374151; background-color: #f9fafb;">Sample Collected</td>
                    <td style="border: 1px solid #d1d5db; padding: 6px 10px; color: #111827;">${sampleCollected}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-weight: 600; color: #374151; background-color: #f9fafb;">Phone</td>
                    <td style="border: 1px solid #d1d5db; padding: 6px 10px; color: #111827;">${phoneNumber}</td>
                    <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-weight: 600; color: #374151; background-color: #f9fafb;">Sample Received</td>
                    <td style="border: 1px solid #d1d5db; padding: 6px 10px; color: #111827;">${sampleReceived}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-weight: 600; color: #374151; background-color: #f9fafb;">Referred By</td>
                    <td style="border: 1px solid #d1d5db; padding: 6px 10px; color: #111827;">${doctorName}</td>
                    <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-weight: 600; color: #374151; background-color: #f9fafb;">Report Date</td>
                    <td style="border: 1px solid #d1d5db; padding: 6px 10px; color: #111827;">${new Date(appointmentDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Department Title -->
            <div style="text-align: center; margin-bottom: 20px;">
              <h3 style="font-size: 18px; font-weight: bold; color: #1f2937; text-decoration: underline; margin: 0;">
                ${department.toUpperCase()}
              </h3>
            </div>

            <!-- Services for this department -->
            ${services.map((service, serviceIndex) => `
              <!-- Service Name -->
              <div style="margin-bottom: 15px; ${serviceIndex > 0 ? 'margin-top: 30px;' : ''}">
                <h4 style="font-size: 16px; font-weight: 600; color: #2563eb; text-align: left; margin: 0;">
                  ${service.service_type_name}
                </h4>
              </div>

              <!-- Test Results Table -->
              <div style="overflow-x: auto; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; font-size: 12px;">
                  <thead>
                    <tr style="background-color: #f3f4f6;">
                      <th style="border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; font-weight: 600; color: #374151; background-color: #f9fafb;">
                        Test Name
                      </th>
                      <th style="border: 1px solid #d1d5db; padding: 6px 10px; text-align: center; font-weight: 600; color: #374151; background-color: #f9fafb;">
                        Results
                      </th>
                      <th style="border: 1px solid #d1d5db; padding: 6px 10px; text-align: center; font-weight: 600; color: #374151; background-color: #f9fafb;">
                        Units
                      </th>
                      <th style="border: 1px solid #d1d5db; padding: 6px 10px; text-align: center; font-weight: 600; color: #374151; background-color: #f9fafb;">
                        Bio. Ref. Interval
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    ${service.testResults && service.testResults.length > 0 ? 
                      service.testResults.map(test => {
                        const referenceRange = test.normal_min && test.normal_max 
                          ? `${test.normal_min} - ${test.normal_max}`
                          : 'N/A';
                        
                        // Determine status based on result value and normal range
                        let resultDisplay = test.result_value;
                        let isAbnormal = false;
                        let arrowSymbol = '';
                        
                        const resultValue = parseFloat(test.result_value);
                        if (!isNaN(resultValue) && test.normal_min && test.normal_max) {
                          if (resultValue < test.normal_min) {
                            isAbnormal = true;
                            arrowSymbol = '<span style="color: #dc2626;">↓</span>';
                          } else if (resultValue > test.normal_max) {
                            isAbnormal = true;
                            arrowSymbol = '<span style="color: #dc2626;">↑</span>';
                          }
                        }
                        
                        if (isAbnormal) {
                          resultDisplay = `${arrowSymbol} <span style="font-weight: bold; color: #000000;">${test.result_value}</span>`;
                        }
                        
                        return `
                          <tr>
                            <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-weight: 500; color: #111827;">
                              ${test.test_name}
                            </td>
                            <td style="border: 1px solid #d1d5db; padding: 6px 10px; text-align: center; color: #111827;">
                              ${resultDisplay}
                            </td>
                            <td style="border: 1px solid #d1d5db; padding: 6px 10px; text-align: center; color: #374151;">
                              ${test.unit || '-'}
                            </td>
                            <td style="border: 1px solid #d1d5db; padding: 6px 10px; text-align: center; color: #374151;">
                              ${referenceRange}
                            </td>
                          </tr>
                        `;
                      }).join('')
                    : `
                      <tr>
                        <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-weight: 500; color: #111827;" colspan="4">
                          <div style="text-align: center; padding: 15px; font-style: italic; color: #6b7280;">
                            No test results available for ${service.service_type_name}
                          </div>
                        </td>
                      </tr>
                    `}
                  </tbody>
                </table>
              </div>
            `).join('')}

            <!-- End of Report Divider -->
            <div style="text-align: center; margin-top: 25px;">
              <div style="display: inline-block; border-bottom: 2px dashed #9ca3af; padding-bottom: 6px;">
                <span style="font-weight: 600; color: #6b7280; font-size: 12px;">
                  ---End of the Report---
                </span>
              </div>
            </div>
          </div>

          <!-- Footer Section -->
          <div class="footer">
            <div style="font-size: 10px; color: #6b7280; display: flex; justify-content: space-between; align-items: center;">
              <p style="margin: 0;">Print D&T: ${new Date().toLocaleString()}</p>
              <p style="margin: 0;">Page ${currentPageNumber} of ${totalPages}</p>
            </div>
          </div>
        </div>
        `;
      }).join('');

      // Create a hidden iframe for printing
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'absolute';
      printFrame.style.top = '-1000px';
      printFrame.style.left = '-1000px';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = 'none';
      
      document.body.appendChild(printFrame);
      
      const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (printDocument) {
        printDocument.open();
        printDocument.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Combined Medical Reports - ${report.patient_name}</title>
              <style>
                @page {
                  size: A4;
                  margin: 0;
                }
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 0; 
                  padding: 0;
                  width: 210mm;
                  max-width: 210mm;
                }
                .page {
                  width: 210mm;
                  min-height: 297mm;
                  padding: 0;
                  margin: 0 auto;
                  background: white;
                  display: flex;
                  flex-direction: column;
                }
                .content {
                  flex: 1;
                  padding: 10mm;
                }
                .footer {
                  margin-top: auto;
                  padding: 5mm 10mm;
                  border-top: 1px solid #e5e7eb;
                }
                @media print {
                  body { margin: 0; padding: 0; }
                  .page-break { page-break-before: always; }
                  .page { 
                    page-break-after: always; 
                    margin: 0;
                  }
                  .page:last-child {
                    page-break-after: avoid;
                  }
                }
              </style>
            </head>
            <body>
              ${combinedContent}
            </body>
          </html>
        `);
        printDocument.close();
        
        // Wait for content to load then print
        setTimeout(() => {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
          
          // Remove iframe after printing
          setTimeout(() => {
            document.body.removeChild(printFrame);
          }, 1000);
        }, 500);
      }
      
      // Report sent to printer successfully - no notification needed
    } catch (error) {
      console.error('Error printing combined report:', error);
      // Print failed - no notification needed, error logged to console
    } finally {
      setLoading(false);
    }
  };

  // Generate PDF with all selected services using the same format as print
  const generateCombinedPDF = async () => {
    if (selectedServices.size === 0) {
      toast({
        title: 'No Services Selected',
        description: 'Please select at least one service to generate a report',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Group selected services by department
      console.log('Selected services for PDF generation:', selectedServices);
      
      const servicesWithResults = await Promise.all(
        Array.from(selectedServices).map(async (service) => {
          try {
            const testResults = await patientTestResultsApi.getTestResults(service);
            console.log('Test results for service', service, ':', testResults);
            return {
              ...report.services.find(s => s.patient_service_id === service),
              testResults: testResults || []
            };
          } catch (error) {
            console.error('Error fetching test results for service:', service, error);
            return {
              ...report.services.find(s => s.patient_service_id === service),
              testResults: []
            };
          }
        })
      );
      
      console.log('Services with results for PDF:', servicesWithResults);

      const groupedByDepartment = servicesWithResults.reduce((acc, service) => {
        const dept = service.sub_department_name;
        if (!acc[dept]) {
          acc[dept] = [];
        }
        acc[dept].push(service);
        return acc;
      }, {} as Record<string, typeof servicesWithResults>);

      // Calculate total pages (one page per department)
      const totalPages = Object.keys(groupedByDepartment).length;
      let currentPageNumber = 0;

      // Get patient information from the main report data (same for all departments)
      let globalPatientInfo = {
        phoneNumber: 'N/A',
        sampleCollected: 'N/A', 
        sampleReceived: 'N/A',
        patientName: report.patient_name || 'N/A',
        doctorName: report.doctor_name || 'N/A',
        appointmentDate: report.appointment_date || new Date().toISOString()
      };

      // Try to get additional patient info from the first service
      const firstService = servicesWithResults[0];
      if (firstService && firstService.patient_service_id) {
        try {
          const reportData = await patientTestResultsApi.getMedicalReportData(firstService.patient_service_id);
          console.log('Global patient report data for PDF:', reportData);
          
          if (reportData.patient_info) {
            globalPatientInfo.phoneNumber = reportData.patient_info.phone || globalPatientInfo.phoneNumber;
            globalPatientInfo.patientName = reportData.patient_info.patient_name || globalPatientInfo.patientName;
            globalPatientInfo.doctorName = reportData.patient_info.doctor_name || globalPatientInfo.doctorName;
            
            if (reportData.patient_info.sample_collected) {
              globalPatientInfo.sampleCollected = new Date(reportData.patient_info.sample_collected).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            }
            
            if (reportData.patient_info.sample_received) {
              globalPatientInfo.sampleReceived = new Date(reportData.patient_info.sample_received).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            }
          }
        } catch (error) {
          console.error('Error fetching global patient info for PDF:', error);
        }
      }

      console.log('Final global patient info for PDF:', globalPatientInfo);

      // Create department info with shared patient data
      const departmentPatientInfo = Object.entries(groupedByDepartment).map(([department, services]) => ({
        department,
        services,
        ...globalPatientInfo
      }));

      // Create combined report content for PDF generation using the exact same format as print
      const combinedContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Combined Medical Reports - ${report.patient_name}</title>
            <style>
              @page {
                size: A4;
                margin: 0;
              }
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 0;
                width: 210mm;
                max-width: 210mm;
              }
              .page {
                width: 210mm;
                min-height: 297mm;
                padding: 0;
                margin: 0 auto;
                background: white;
                display: flex;
                flex-direction: column;
              }
              .content {
                flex: 1;
                padding: 10mm;
              }
              .footer {
                margin-top: auto;
                padding: 5mm 10mm;
                border-top: 1px solid #e5e7eb;
              }
              @media print {
                body { margin: 0; padding: 0; }
                .page-break { page-break-before: always; }
                .page { 
                  page-break-after: always; 
                  margin: 0;
                }
                .page:last-child {
                  page-break-after: avoid;
                }
              }
            </style>
          </head>
          <body>
            ${departmentPatientInfo.map((deptInfo, deptIndex) => {
              currentPageNumber++;
              const { department, services, phoneNumber, sampleCollected, sampleReceived, patientName, doctorName, appointmentDate } = deptInfo;
              
              console.log('Creating PDF page for department:', department, 'with patient info:', {
                patientName, phoneNumber, sampleCollected, sampleReceived, doctorName, appointmentDate
              });
              
              return `
                <div class="page" style="${deptIndex > 0 ? 'page-break-before: always;' : ''}">
                  <div class="content">
                    <!-- Header Section -->
                    <div style="width: 100%; text-align: center; margin-bottom: 20px;">
                      <img src="/cura-full-header.jpg" alt="CURA Hospitals Header" style="width: 100%; height: auto;" />
                    </div>

                    <!-- Patient Information Table -->
                    <div style="margin-bottom: 25px;">
                      <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; font-size: 12px;">
                        <tbody>
                          <tr>
                            <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-weight: 600; color: #374151; background-color: #f9fafb;">Patient Name</td>
                            <td style="border: 1px solid #d1d5db; padding: 6px 10px; color: #111827;">${patientName}</td>
                            <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-weight: 600; color: #374151; background-color: #f9fafb;">Sample Collected</td>
                            <td style="border: 1px solid #d1d5db; padding: 6px 10px; color: #111827;">${sampleCollected}</td>
                          </tr>
                          <tr>
                            <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-weight: 600; color: #374151; background-color: #f9fafb;">Phone</td>
                            <td style="border: 1px solid #d1d5db; padding: 6px 10px; color: #111827;">${phoneNumber}</td>
                            <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-weight: 600; color: #374151; background-color: #f9fafb;">Sample Received</td>
                            <td style="border: 1px solid #d1d5db; padding: 6px 10px; color: #111827;">${sampleReceived}</td>
                          </tr>
                          <tr>
                            <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-weight: 600; color: #374151; background-color: #f9fafb;">Referred By</td>
                            <td style="border: 1px solid #d1d5db; padding: 6px 10px; color: #111827;">${doctorName}</td>
                            <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-weight: 600; color: #374151; background-color: #f9fafb;">Report Date</td>
                            <td style="border: 1px solid #d1d5db; padding: 6px 10px; color: #111827;">${new Date(appointmentDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <!-- Department Title -->
                    <div style="text-align: center; margin-bottom: 20px;">
                      <h3 style="font-size: 18px; font-weight: bold; color: #1f2937; text-decoration: underline; margin: 0;">
                        ${department.toUpperCase()}
                      </h3>
                    </div>

                    <!-- Services for this department -->
                    ${services.map((service, serviceIndex) => `
                      <!-- Service Name -->
                      <div style="margin-bottom: 15px; ${serviceIndex > 0 ? 'margin-top: 30px;' : ''}">
                        <h4 style="font-size: 16px; font-weight: 600; color: #2563eb; text-align: left; margin: 0;">
                          ${service.service_type_name}
                        </h4>
                      </div>

                      <!-- Test Results Table -->
                      <div style="overflow-x: auto; margin-bottom: 20px;">
                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; font-size: 12px;">
                          <thead>
                            <tr style="background-color: #f3f4f6;">
                              <th style="border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; font-weight: 600; color: #374151; background-color: #f9fafb;">
                                Test Name
                              </th>
                              <th style="border: 1px solid #d1d5db; padding: 6px 10px; text-align: center; font-weight: 600; color: #374151; background-color: #f9fafb;">
                                Results
                              </th>
                              <th style="border: 1px solid #d1d5db; padding: 6px 10px; text-align: center; font-weight: 600; color: #374151; background-color: #f9fafb;">
                                Units
                              </th>
                              <th style="border: 1px solid #d1d5db; padding: 6px 10px; text-align: center; font-weight: 600; color: #374151; background-color: #f9fafb;">
                                Bio. Ref. Interval
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            ${service.testResults && service.testResults.length > 0 ? 
                              service.testResults.map(test => {
                                const referenceRange = test.normal_min && test.normal_max 
                                  ? `${test.normal_min} - ${test.normal_max}`
                                  : 'N/A';
                                
                                // Determine status based on result value and normal range
                                let resultDisplay = test.result_value;
                                let isAbnormal = false;
                                let arrowSymbol = '';
                                
                                const resultValue = parseFloat(test.result_value);
                                if (!isNaN(resultValue) && test.normal_min && test.normal_max) {
                                  if (resultValue < test.normal_min) {
                                    isAbnormal = true;
                                    arrowSymbol = '<span style="color: #dc2626;">↓</span>';
                                  } else if (resultValue > test.normal_max) {
                                    isAbnormal = true;
                                    arrowSymbol = '<span style="color: #dc2626;">↑</span>';
                                  }
                                }
                                
                                if (isAbnormal) {
                                  resultDisplay = `${arrowSymbol} <span style="font-weight: bold; color: #000000;">${test.result_value}</span>`;
                                }
                                
                                return `
                                  <tr>
                                    <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-weight: 500; color: #111827;">
                                      ${test.test_name}
                                    </td>
                                    <td style="border: 1px solid #d1d5db; padding: 6px 10px; text-align: center; color: #111827;">
                                      ${resultDisplay}
                                    </td>
                                    <td style="border: 1px solid #d1d5db; padding: 6px 10px; text-align: center; color: #374151;">
                                      ${test.unit || '-'}
                                    </td>
                                    <td style="border: 1px solid #d1d5db; padding: 6px 10px; text-align: center; color: #374151;">
                                      ${referenceRange}
                                    </td>
                                  </tr>
                                `;
                              }).join('')
                            : `
                              <tr>
                                <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-weight: 500; color: #111827;" colspan="4">
                                  <div style="text-align: center; padding: 15px; font-style: italic; color: #6b7280;">
                                    No test results available for ${service.service_type_name}
                                  </div>
                                </td>
                              </tr>
                            `}
                          </tbody>
                        </table>
                      </div>
                    `).join('')}

                    <!-- End of Report Divider -->
                    <div style="text-align: center; margin-top: 25px;">
                      <div style="display: inline-block; border-bottom: 2px dashed #9ca3af; padding-bottom: 6px;">
                        <span style="font-weight: 600; color: #6b7280; font-size: 12px;">
                          ---End of the Report---
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Footer Section -->
                  <div class="footer">
                    <div style="font-size: 10px; color: #6b7280; display: flex; justify-content: space-between; align-items: center;">
                      <p style="margin: 0;">Print D&T: ${new Date().toLocaleString()}</p>
                      <p style="margin: 0;">Page ${currentPageNumber} of ${totalPages}</p>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </body>
        </html>
      `;

      // Create an iframe to isolate the PDF generation
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '0';
      iframe.style.top = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      
      // Create a promise to handle the iframe load event
      const iframeLoadPromise = new Promise<void>((resolve) => {
        iframe.onload = () => resolve();
      });
      
      document.body.appendChild(iframe);
      
      // Wait for iframe to be ready
      await iframeLoadPromise;
      
      // Get the iframe document
      const iframeDoc = iframe.contentDocument || (iframe.contentWindow as any).document;
      
      // Set up the iframe document
      iframeDoc.open();
      iframeDoc.write(combinedContent);
      iframeDoc.close();
      
      // Wait for iframe content to be fully loaded
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get the container from the iframe
      const container = iframeDoc.body;

      // Create PDF with multiple pages
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Get all page elements from the iframe
      const pageElements = iframeDoc.querySelectorAll('.page');
      console.log('Number of pages to generate:', pageElements.length);
      console.log('Page elements found:', pageElements);
      
      // Verify each page element has the correct structure
      pageElements.forEach((page, index) => {
        const deptTitle = page.querySelector('h3')?.textContent;
        const patientTable = page.querySelector('table');
        console.log(`Page ${index + 1}: Department="${deptTitle}", Has Patient Table=${!!patientTable}`);
      });
      
      // Generate PDF page by page
      for (let i = 0; i < pageElements.length; i++) {
        const pageElement = pageElements[i] as HTMLElement;
        const deptName = pageElement.querySelector('h3')?.textContent || 'Unknown';
        console.log(`Generating page ${i + 1} for department:`, deptName);
        
        // Force a reflow to ensure the element is properly rendered
        const reflow = pageElement.offsetHeight;
        
        // Render each page individually with optimized settings
        const canvas = await html2canvas(pageElement, { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          removeContainer: false,
          windowWidth: 794, // A4 width in pixels at 72dpi
          windowHeight: 1123, // A4 height in pixels at 72dpi
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          width: 794, // A4 width in pixels at 72dpi
          height: pageElement.scrollHeight,
          onclone: (clonedDoc) => {
            // Ensure all images are loaded before capturing
            const images = clonedDoc.images;
            for (let img of images) {
              if (!img.complete) {
                img.style.visibility = 'hidden';
              }
            }
          }
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        // Add image to PDF page
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Check if image height exceeds A4 height (297mm)
        if (imgHeight > 297) {
          // If image is too tall, scale it down to fit
          const scale = 297 / imgHeight;
          const scaledWidth = imgWidth * scale;
          const scaledHeight = 297;
          const xOffset = (210 - scaledWidth) / 2; // Center horizontally
          pdf.addImage(imgData, 'PNG', xOffset, 0, scaledWidth, scaledHeight);
        } else {
          // If image fits, center it vertically
          const yOffset = (297 - imgHeight) / 2;
          pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, imgHeight);
        }
        
        // Add new page if not the last page
        if (i < pageElements.length - 1) {
          pdf.addPage();
        }
        
        console.log(`Page ${i + 1} completed successfully`);
      }
      
      // Generate filename with patient name and appointment date
      const patientName = report.patient_name || 'Unknown';
      const appointmentDate = new Date(report.appointment_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');
      
      const filename = `Combined_Report_${patientName.replace(/\s+/g, '_')}_${appointmentDate}.pdf`;
      
      // Download PDF
      pdf.save(filename);
      
      // Clean up the iframe
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
      
      // PDF downloaded successfully - no notification needed
    } catch (error) {
      console.error('Error generating combined PDF:', error);
      // PDF generation failed - no notification needed, error logged to console
    } finally {
      setLoading(false);
    }
  };

  // Smart pagination - generate page numbers with ellipsis
  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <LoadingPage text="Loading report details..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </Button>
      </div>

      {/* Patient Information Card */}
      <div className="mb-4 border border-gray-300 rounded-md bg-white shadow-sm overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-300 flex items-center gap-1.5">
          <div className="w-0.5 h-4 bg-orange-500 rounded-sm"></div>
          <span className="font-semibold text-sm text-gray-700">Patient Information</span>
        </div>
        
        <div className="p-0">
          <Table>
            <TableBody>
              <TableRow className="border-b border-gray-100">
                <TableCell className="w-32 font-semibold text-xs text-gray-700 bg-gray-50 border-r border-gray-300 px-3 py-2">
                  Patient:
                </TableCell>
                <TableCell className="font-semibold text-sm text-gray-900 px-3 py-2">
                  {report.patient_name || '-'}
                </TableCell>
              </TableRow>
              <TableRow className="border-b border-gray-100">
                <TableCell className="w-32 font-semibold text-xs text-gray-700 bg-gray-50 border-r border-gray-300 px-3 py-2">
                  Doctor:
                </TableCell>
                <TableCell className="font-semibold text-sm text-gray-900 px-3 py-2">
                  {report.doctor_name || '-'}
                </TableCell>
              </TableRow>
              <TableRow className="border-b border-gray-100">
                <TableCell className="w-32 font-semibold text-xs text-gray-700 bg-gray-50 border-r border-gray-300 px-3 py-2">
                  Date:
                </TableCell>
                <TableCell className="font-semibold text-sm text-gray-900 px-3 py-2">
                  {formatDate(report.appointment_date)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="w-32 font-semibold text-xs text-gray-700 bg-gray-50 border-r border-gray-300 px-3 py-2">
                  Appointment ID:
                </TableCell>
                <TableCell className="font-semibold text-sm font-mono text-blue-600 px-3 py-2">
                  {report.appointment_id || '-'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          

                     {/* Action Buttons - Only show when services are selected */}
           {selectedServices.size > 0 && (
             <>
               <div className="flex flex-wrap gap-3 mb-6">
                 <Button
                   onClick={generateCombinedPDF}
                   className="flex items-center gap-2"
                 >
                   <Download className="h-4 w-4" />
                   Download Combined PDF
                 </Button>
                 <Button
                   variant="outline"
                   onClick={printCombinedReport}
                   className="flex items-center gap-2"
                 >
                   <Printer className="h-4 w-4" />
                   Print Combined Report
                 </Button>
                 <Button
                   variant="outline"
                   onClick={clearAllServices}
                   className="flex items-center gap-2"
                 >
                   Clear Selection
                 </Button>
               </div>

             </>
           )}

          

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services or departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <select 
                value={selectedDepartment} 
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="flex h-10 w-[180px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="all">All Departments</option>
                {uniqueDepartments.map((dept, index) => (
                  <option key={index} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results summary */}
          <div className="flex justify-between items-center mb-4 text-sm text-muted-foreground">
            <span>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredServices.length)} of {filteredServices.length} services
            </span>
            {filteredServices.length > 0 && (
              <span>
                Page {currentPage} of {totalPages} ({itemsPerPage} per page)
              </span>
            )}
          </div>

          {filteredServices.length === 0 ? (
            <div className="text-center py-8">
              <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Services Found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No services match your search criteria.' : 'No services available.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table className="w-full text-xs sm:text-sm md:text-base">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 w-12">
                      <Checkbox
                        checked={selectedServices.size === filteredServices.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const allIds = new Set(filteredServices.map(s => s.patient_service_id));
                            setSelectedServices(allIds);
                          } else {
                            setSelectedServices(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Service Name</TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Completed At</TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Status</TableHead>
                    <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const rows: JSX.Element[] = [];
                    
                    currentSortedDepartments.forEach((department) => {
                      // Add department header row
                      rows.push(
                        <TableRow key={`dept-${department}`}>
                          <TableCell colSpan={5} className="px-1 py-2 sm:px-2 sm:py-3 md:px-4 md:py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
                              <span className="text-lg font-semibold text-gray-700">{department}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                      
                      // Add service rows for this department
                      currentGroupedServices[department].forEach((service) => {
                        rows.push(
                          <TableRow key={service.patient_service_id} className="text-xs sm:text-sm md:text-base">
                            <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                              <Checkbox
                                checked={selectedServices.has(service.patient_service_id)}
                                onCheckedChange={(checked) => handleServiceSelection(service.patient_service_id, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                              <div className="font-medium text-sm">{service.service_type_name}</div>
                            </TableCell>
                            <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                              <span className="text-sm font-medium text-gray-600">
                                {service.report_completed_at ? formatDate(service.report_completed_at) : 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                              <span className="text-sm font-medium text-green-600">
                                Completed
                              </span>
                            </TableCell>
                            <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedService(service);
                                  setShowReportViewer(true);
                                }}
                                className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 w-20 sm:w-24 md:w-32 h-7 sm:h-8"
                              >
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                <span className="sm:hidden">View</span>
                                <span className="hidden sm:inline md:hidden">Report</span>
                                <span className="hidden md:inline">View Report</span>
                              </Button>
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

      {/* Medical Report Viewer */}
      {showReportViewer && selectedService && (
        <MedicalReportViewer
          isOpen={showReportViewer}
          onClose={() => {
            setShowReportViewer(false);
            setSelectedService(null);
          }}
          patientServiceId={selectedService.patient_service_id}
          serviceName={selectedService.service_type_name}
          appointmentId={report.appointment_id}
        />
      )}
    </div>
  );
};

export default ReportViewTab;
