import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from '@/components/ui/pagination';
import { FileText, Search, Eye, TestTube, User, Calendar, Stethoscope, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { labTestsApi, PendingLabTest, PatientTest, PatientTestResult } from '@/services/api';
import { LoadingPage } from '@/components/ui/loading';

// Define the type for grouped tests
interface GroupedTest {
  appointment_id: string;
  patient_name: string;
  doctor_name: string;
  appointment_date: string;
  services: Array<{
    patient_service_id: number;
    service_type_name: string;
    sub_department_name: string;
    sample_collected_at: string | null;
  }>;
}

const LabTestsTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingTests, setPendingTests] = useState<PendingLabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<GroupedTest | null>(null);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [patientTests, setPatientTests] = useState<PatientTest[]>([]);
  const [testResults, setTestResults] = useState<Record<number, string>>({});
  const [activeView, setActiveView] = useState<'main' | 'services' | 'tests'>('main');
  const [isServiceLoading, setIsServiceLoading] = useState(false);
  const [isTestLoading, setIsTestLoading] = useState(false);
  
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
      const data = await labTestsApi.getPendingTests();
      setPendingTests(data);
    } catch (error) {
      console.error('Error fetching pending tests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch pending lab tests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePatientClick = (patient: GroupedTest) => {
    setSelectedPatient(patient);
    setActiveView('services');
    setIsServiceLoading(false); // Reset loading state
  };

  const handleServiceClick = async (patientServiceId: number) => {
    try {
      setIsTestLoading(true);
      const tests = await labTestsApi.getTestsByService(patientServiceId);
      setPatientTests(tests);
      setSelectedService(patientServiceId);
      setActiveView('tests');
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tests for this service',
        variant: 'destructive',
      });
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleBackToServices = () => {
    setActiveView('services');
    setSelectedService(null);
    setPatientTests([]);
    setTestResults({});
  };

  const handleBackToMain = () => {
    setActiveView('main');
    setSelectedPatient(null);
    setSelectedService(null);
    setPatientTests([]);
    setTestResults({});
  };

  const handleCompleteService = async () => {
    if (!selectedService) return;

    // Check if all tests have results
    const testsWithoutResults = patientTests.filter(test => !testResults[test.patient_test_id]?.trim());
    if (testsWithoutResults.length > 0) {
      toast({
        title: 'Error',
        description: `Please fill in results for ${testsWithoutResults.length} test(s) before completing`,
        variant: 'destructive',
      });
      return;
    }

    try {
      // Save all test results first
      const savePromises = patientTests.map(test => 
        labTestsApi.saveTestResult(test.patient_test_id, testResults[test.patient_test_id].trim())
      );
      await Promise.all(savePromises);

      // Then mark the service as completed
      await labTestsApi.updateReportStatus(selectedService, 'Completed');
      
      toast({
        title: 'Success',
        description: 'All test results saved and service marked as completed',
      });
      
      handleBackToMain();
      fetchPendingTests(); // Refresh the list
    } catch (error) {
      console.error('Error completing service:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete service',
        variant: 'destructive',
      });
    }
  };

  // Group tests by appointment ID to show unique patients
  const groupedTests = pendingTests.reduce((acc, test) => {
    if (!acc[test.appointment_id]) {
      acc[test.appointment_id] = {
        appointment_id: test.appointment_id,
        patient_name: test.patient_name,
        doctor_name: test.doctor_name,
        appointment_date: test.appointment_date,
        services: []
      };
    }
    acc[test.appointment_id].services.push({
      patient_service_id: test.patient_service_id,
      service_type_name: test.service_type_name,
      sub_department_name: test.sub_department_name,
      sample_collected_at: test.sample_collected_at
    });
    return acc;
  }, {} as Record<string, GroupedTest>);

  const filteredTests = Object.values(groupedTests).filter(group => {
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
  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTests = filteredTests.slice(startIndex, endIndex);

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
    return <LoadingPage text="Loading pending lab tests..." />;
  }

  // Main view - Pending Tests List
  if (activeView === 'main') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pending Lab Tests
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
                Showing {startIndex + 1}-{Math.min(endIndex, filteredTests.length)} of {filteredTests.length} tests
              </span>
              {filteredTests.length > 0 && (
                <span>
                  Page {currentPage} of {totalPages} ({itemsPerPage} per page)
                </span>
              )}
            </div>

            {filteredTests.length === 0 ? (
              <div className="text-center py-8">
                <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Tests</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'No tests match your search criteria.' : 'All collected samples have been processed.'}
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
                    {currentTests.map((group) => (
                      <TableRow key={group.appointment_id} className="text-xs sm:text-sm md:text-base cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-mono px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">{
                          group.appointment_id.length > 8
                            ? `${group.appointment_id.slice(0, 4)}...${group.appointment_id.slice(-4)}`
                            : group.appointment_id
                        }</TableCell>
                        <TableCell className="font-medium px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">{group.patient_name}</TableCell>
                        <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">{group.doctor_name}</TableCell>
                        <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                          <Badge variant="default" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 md:px-3 py-0.5 sm:py-1">
                            {group.services.length} Services
                          </Badge>
                        </TableCell>
                        <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                          <div className="flex gap-1 sm:gap-2">
                            <Button
                              size="icon"
                              className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 p-1 sm:p-2"
                              variant="outline"
                              onClick={() => handlePatientClick(group)}
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
  }

  // Services view
  if (activeView === 'services') {
    return (
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
                <p className="text-sm font-semibold">{selectedPatient?.patient_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Doctor Name</label>
                <p className="text-sm font-semibold">{selectedPatient?.doctor_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Appointment Date</label>
                <p className="text-sm font-semibold">
                  {selectedPatient?.appointment_date ? 
                    new Date(selectedPatient.appointment_date).toLocaleDateString() : 'N/A'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Appointment ID</label>
                <p className="text-sm font-mono text-blue-600">{selectedPatient?.appointment_id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Available Services by Department
            </CardTitle>
            <CardDescription>
              Select a service to view and fill in test results
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isServiceLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading patient services...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Services by Department */}
                {selectedPatient && (() => {
                  const departmentGroups = selectedPatient.services.reduce((acc: any, service: any) => {
                    if (!acc[service.sub_department_name]) {
                      acc[service.sub_department_name] = [];
                    }
                    acc[service.sub_department_name].push(service);
                    return acc;
                  }, {});
                  
                  return Object.entries(departmentGroups).map(([deptName, services]: [string, any]) => (
                    <div key={deptName} className="space-y-4">
                      <div className="flex items-center gap-3 py-2">
                        <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-700">{deptName}</h3>
                      </div>
                      <div className="space-y-3">
                        {services.map((service: any) => (
                          <div key={service.patient_service_id} 
                               className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border hover:bg-muted transition-all cursor-pointer"
                               onClick={() => handleServiceClick(service.patient_service_id)}>
                            <div>
                              <p className="font-semibold text-foreground">
                                {service.service_type_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Sample: {service.sample_collected_at ? 
                                  new Date(service.sample_collected_at).toLocaleDateString() : 
                                  'Collected'
                                }
                              </p>
                            </div>
                            <Button variant="outline" size="sm" className="border-orange-500 text-orange-600 hover:bg-orange-50">
                              View Tests
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tests view
  if (activeView === 'tests') {
    return (
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleBackToServices}
            className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Services
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
                <p className="text-sm font-semibold">{selectedPatient?.patient_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Doctor Name</label>
                <p className="text-sm font-semibold">{selectedPatient?.doctor_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Appointment Date</label>
                <p className="text-sm font-semibold">
                  {selectedPatient?.appointment_date ? 
                    new Date(selectedPatient.appointment_date).toLocaleDateString() : 'N/A'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Appointment ID</label>
                <p className="text-sm font-mono text-blue-600">{selectedPatient?.appointment_id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              {selectedPatient?.services.find(s => s.patient_service_id === selectedService)?.service_type_name || 'Test Results Form'}
            </CardTitle>
            <CardDescription>
              Enter the test results for each parameter below. All results will be saved when you click "Complete Service".
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isTestLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading test details...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Test Results Form */}
                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Enter the test results for each parameter below. All results will be saved when you click "Complete Service".
                    </p>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="px-4 py-3 font-semibold">Test Parameter</TableHead>
                          <TableHead className="px-4 py-3 font-semibold">Unit</TableHead>
                          <TableHead className="px-4 py-3 font-semibold">Normal Range</TableHead>
                          <TableHead className="px-4 py-3 font-semibold">Test Result</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientTests.map((test, index) => (
                          <TableRow 
                            key={test.patient_test_id} 
                            className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                          >
                            <TableCell className="px-4 py-3 font-medium">
                              {test.test_name}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-muted-foreground">
                              {test.unit || '-'}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-muted-foreground">
                              {test.normal_min !== undefined && test.normal_max !== undefined ? (
                                <span className="text-green-600 font-medium">
                                  {test.normal_min} - {test.normal_max}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <Input
                                placeholder={`Enter result${test.unit ? ` (${test.unit})` : ''}...`}
                                value={testResults[test.patient_test_id] || ''}
                                onChange={(e) => setTestResults(prev => ({
                                  ...prev,
                                  [test.patient_test_id]: e.target.value
                                }))}
                                className="max-w-xs"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={handleBackToServices}
                    className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                  >
                    Back to Services
                  </Button>
                  <Button 
                    onClick={handleCompleteService}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Service
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default LabTestsTab;
