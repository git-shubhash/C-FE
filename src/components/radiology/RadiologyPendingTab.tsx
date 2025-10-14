import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from '@/components/ui/pagination';
import { FileText, Search, Eye, User, Calendar, Stethoscope, CheckCircle, ArrowLeft, Save, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { radiologyPrescriptionsApi, radiologyServicesApi, radiologyReportsApi, RadiologyService, RadiologyTemplate } from '@/services/api';
import { LoadingPage } from '@/components/ui/loading';
import TextEditor from '@/components/ui/TextEditor';

// Define the type for grouped radiology tests
interface GroupedRadiologyTest {
  appointment_id: string;
  patient_name: string;
  doctor_name: string;
  appointment_date: string;
  services: Array<{
    prescription_id: string;
    service_id: string;
    service_name: string;
    test_conducted: boolean;
    test_conducted_at: string | null;
    status: string;
  }>;
}

interface ReportDialogState {
  isOpen: boolean;
  prescriptionId: string;
  serviceId: string;
  serviceName: string;
  templateContent: string;
  templateId: string;
}

const RadiologyPendingTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingTests, setPendingTests] = useState<RadiologyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<GroupedRadiologyTest | null>(null);

  
  // Report state
  const [reportState, setReportState] = useState<{
    prescriptionId: string;
    serviceId: string;
    serviceName: string;
    templateContent: string;
    templateId: string;
  }>({    
    prescriptionId: '',
    serviceId: '',
    serviceName: '',
    templateContent: '',
    templateId: ''
  });
  
  // View state: 'main' (list of patients), 'services' (list of services for a patient), 'report' (report editor)
  const [activeView, setActiveView] = useState<'main' | 'services' | 'report'>('main');
  const [reportContent, setReportContent] = useState('');
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  
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
    fetchPendingTests();
  }, []);

  const fetchPendingTests = async () => {
    try {
      setLoading(true);
      // First, get all radiology prescriptions
      const allPrescriptions = await radiologyPrescriptionsApi.getAll();
      
      // Filter for tests that are conducted and have pending status
      const filteredTests = allPrescriptions.filter(
        (test: RadiologyService) => test.test_conducted && test.status === 'pending'
      );
      
      setPendingTests(filteredTests);
    } catch (error) {
      console.error('Error fetching pending radiology tests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch pending radiology tests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePatientClick = (patient: GroupedRadiologyTest) => {
    setSelectedPatient(patient);
    setActiveView('services');
  };

  const handleBackToMain = () => {
    setActiveView('main');
    setSelectedPatient(null);
  };

  const handleOpenReportView = async (prescriptionId: string, serviceId: string, serviceName: string) => {
    try {
      setLoadingTemplate(true);
      
      // Fetch templates for this service
      const templates = await radiologyServicesApi.getTemplates(serviceId);
      
      if (templates.length > 0) {
        const template = templates[0];
        setReportState({
          prescriptionId,
          serviceId,
          serviceName,
          templateContent: template.template_structure.content || '',
          templateId: template.template_id
        });
        setReportContent(template.template_structure.content || '');
      } else {
        // No template found, use a default template
        const defaultTemplate = `# ${serviceName.toUpperCase()} REPORT\n\n## CLINICAL HISTORY\n- Patient presents with...\n\n## TECHNIQUE\n- Standard examination protocol\n\n## FINDINGS\n- [Enter findings here]\n\n## IMPRESSION\n- [Enter impression here]`;
        
        setReportState({
          prescriptionId,
          serviceId,
          serviceName,
          templateContent: defaultTemplate,
          templateId: ''
        });
        setReportContent(defaultTemplate);
      }
      
      // Switch to report view
      setActiveView('report');
    } catch (error) {
      console.error('Error fetching template:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report template',
        variant: 'destructive',
      });
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleSaveReport = async () => {
    try {
      // Create report data structure
      const reportData = {
        content: reportContent,
        serviceName: reportState.serviceName,
        createdAt: new Date().toISOString()
      };
      
      // Save the report
      await radiologyReportsApi.create({
        prescription_id: reportState.prescriptionId,
        template_id: reportState.templateId,
        report_data: reportData
      });
      
      // Update the prescription status to completed
      await radiologyPrescriptionsApi.updateStatus(reportState.prescriptionId, 'completed');
      
      toast({
        title: 'Success',
        description: 'Radiology report saved successfully',
      });
      
      // Go back to services view and refresh
      setActiveView('services');
      fetchPendingTests(); // Refresh the list
    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: 'Error',
        description: 'Failed to save radiology report',
        variant: 'destructive',
      });
    }
  };

  const handleBackToServices = () => {
    setActiveView('services');
    setReportContent('');
  };

  // Group tests by patient
  const groupedTests = pendingTests.reduce((acc: Record<string, GroupedRadiologyTest>, test) => {
    const key = test.appointment_id;
    
    if (!acc[key]) {
      acc[key] = {
        appointment_id: test.appointment_id,
        patient_name: test.patient_name,
        doctor_name: test.doctor_name,
        appointment_date: test.appointment_date,
        services: []
      };
    }
    
    acc[key].services.push({
      prescription_id: test.prescription_id,
      service_id: test.service_id,
      service_name: test.service_name,
      test_conducted: test.test_conducted,
      test_conducted_at: test.test_conducted_at,
      status: test.status
    });
    
    return acc;
  }, {});

  // Convert to array and sort by appointment date (newest first)
  const groupedTestsArray = Object.values(groupedTests).sort((a, b) => 
    new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
  );

  // Filter based on search term
  const filteredTests = groupedTestsArray.filter(group => {
    const searchLower = searchTerm.toLowerCase();
    return (
      group.patient_name.toLowerCase().includes(searchLower) ||
      group.doctor_name.toLowerCase().includes(searchLower) ||
      group.appointment_id.toLowerCase().includes(searchLower) ||
      group.services.some(service => service.service_name.toLowerCase().includes(searchLower))
    );
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Smart pagination that shows ellipsis for many pages
  const renderPaginationItems = () => {
    const pages = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        // Show ellipsis if current page is far from start
        pages.push('ellipsis');
      }
      
      // Show pages around current page
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        // Show ellipsis if current page is far from end
        pages.push('ellipsis');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (loading) {
    return <LoadingPage text="Loading pending radiology tests..." />;
  }

  return (
    <>
      {/* Main content */}
      {activeView === 'report' ? (
        <div className="space-y-6">
          {/* Header with Back Button and Save Button */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBackToServices}
              className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Services
            </Button>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">Write Radiology Report - {reportState.serviceName}</h2>
              <p className="text-sm text-muted-foreground">Complete the report using the template below</p>
            </div>
            <Button onClick={handleSaveReport} className="gap-2">
              <Save className="h-4 w-4" />
              Save Report
            </Button>
          </div>
          
          {/* Report Editor Card */}
          <Card>
            <CardContent className="pt-6">
              {loadingTemplate ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading template...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <TextEditor
                    value={reportContent}
                    onChange={setReportContent}
                    placeholder="Enter report details here..."
                    className="min-h-[400px]"
                    onSave={handleSaveReport}
                    onCancel={handleBackToServices}
                  />
                  

                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : activeView === 'services' && selectedPatient ? (
        <div className="space-y-6">
          {/* Header with Back Button */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBackToMain}
              className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Tests
            </Button>
          </div>

          {/* Patient Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Patient Name</label>
                  <p className="text-sm font-semibold">{selectedPatient.patient_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Doctor Name</label>
                  <p className="text-sm font-semibold">{selectedPatient.doctor_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Appointment Date</label>
                  <p className="text-sm font-semibold">
                    {new Date(selectedPatient.appointment_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Appointment ID</label>
                  <p className="text-sm font-mono">{selectedPatient.appointment_id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Radiology Tests Card */}
          <Card>
            <CardHeader>
              <CardTitle>Radiology Tests</CardTitle>
              <CardDescription>
                View and manage radiology tests for this patient
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedPatient.services.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No radiology tests found for this patient</p>
                </div>
              ) : (
                <div>
                  {/* Group tests by department/type */}
                  {(() => {
                    // Group services by type for better organization
                    const serviceGroups = selectedPatient.services.reduce((acc: any, service: any) => {
                      const groupKey = service.service_name.split(' ')[0]; // Simple grouping by first word
                      if (!acc[groupKey]) {
                        acc[groupKey] = [];
                      }
                      acc[groupKey].push(service);
                      return acc;
                    }, {});
                    
                    return Object.entries(serviceGroups).map(([groupName, services]: [string, any]) => (
                      <div key={groupName} className="space-y-4 mb-6">
                        <div className="flex items-center gap-3 py-2">
                          <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
                          <h3 className="text-lg font-semibold text-gray-700">{groupName}</h3>
                        </div>
                        <div className="space-y-3">
                          {services.map((service: any) => (
                            <div key={service.prescription_id} 
                                 className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border hover:bg-muted transition-all">
                              <div>
                                <p className="font-semibold text-foreground">
                                  {service.service_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Test conducted on: {service.test_conducted_at ? 
                                    new Date(service.test_conducted_at).toLocaleDateString() : 
                                    'N/A'
                                  }
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleOpenReportView(service.prescription_id, service.service_id, service.service_name)}
                                  disabled={service.status === 'completed'}
                                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Write Report
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}

                  {/* No action buttons needed */}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pending Radiology Tests
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
                  Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTests.length)} of {filteredTests.length} tests
                </span>
                {filteredTests.length > 0 && (
                  <span>
                    Page {currentPage} of {totalPages} ({itemsPerPage} per page)
                  </span>
                )}
              </div>

              {currentItems.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Pending Tests</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No tests match your search criteria.' : 'All conducted tests have been processed.'}
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
                      {currentItems.map((group) => (
                        <TableRow key={group.appointment_id} className="text-xs sm:text-sm md:text-base cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-mono px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">{group.appointment_id.length > 8 ? `${group.appointment_id.slice(0, 4)}...${group.appointment_id.slice(-4)}` : group.appointment_id}</TableCell>
                          <TableCell className="font-medium px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                            {group.patient_name}
                          </TableCell>
                          <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">{group.doctor_name}</TableCell>
                          <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                            <Badge variant="default" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 md:px-3 py-0.5 sm:py-1">
                              {group.services.length} {group.services.length === 1 ? 'Service' : 'Services'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                            <div className="flex gap-1 sm:gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handlePatientClick(group)}
                                className="h-7 w-7 sm:h-8 sm:w-8"
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                      
                      {renderPaginationItems().map((page, index) => (
                        page === 'ellipsis' ? (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={page}>
                            <PaginationLink 
                              onClick={() => handlePageChange(page as number)}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default RadiologyPendingTab;
