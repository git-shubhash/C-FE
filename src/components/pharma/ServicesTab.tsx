import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from '@/components/ui/pagination';
import { Search, Plus, Edit, Trash2, Stethoscope, TestTube, Building2, Filter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { api } from '@/services/api';

interface SubDepartment {
  sub_department_id: number;
  sub_department_name: string;
}

interface ServiceType {
  service_type_id: number;
  sub_department_id: number;
  service_type_name: string;
  sub_department_name?: string;
  test_count?: number;
}

interface Test {
  test_id: number;
  service_type_id: number;
  test_name: string;
  unit: string;
  normal_min: number;
  normal_max: number;
}

const ServicesTab: React.FC = () => {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'department' | 'tests'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Dialog states
  const [showAddService, setShowAddService] = useState(false);
  const [showAddTest, setShowAddTest] = useState(false);
  const [showViewTests, setShowViewTests] = useState(false);
  
  // Form states
  const [newServiceName, setNewServiceName] = useState('');
  const [selectedSubDepartment, setSelectedSubDepartment] = useState<number | ''>('');
  const [newTestName, setNewTestName] = useState('');
  const [newTestUnit, setNewTestUnit] = useState('');
  const [newTestNormalMin, setNewTestNormalMin] = useState('');
  const [newTestNormalMax, setNewTestNormalMax] = useState('');
  const [selectedServiceForTest, setSelectedServiceForTest] = useState<ServiceType | null>(null);
  const [selectedServiceTests, setSelectedServiceTests] = useState<Test[]>([]);

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
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [servicesResponse, departmentsResponse] = await Promise.all([
        api.get('/services/all'),
        api.get('/services/departments')
      ]);
      
      console.log('Services response:', servicesResponse);
      console.log('Departments response:', departmentsResponse);
      
      setServices(servicesResponse);
      setSubDepartments(departmentsResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load services data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async () => {
    if (!selectedSubDepartment || !newServiceName.trim()) {
      toast({
        title: "Error",
        description: "Please select a department and enter a service name.",
        variant: "destructive"
      });
      return;
    }

    try {
      const newService = await api.post('/services/service-types', {
        sub_department_id: selectedSubDepartment,
        service_type_name: newServiceName
      });
      
      // Update state directly instead of refetching
      setServices(prevServices => [...prevServices, {
        ...newService,
        sub_department_name: subDepartments.find(d => d.sub_department_id === selectedSubDepartment)?.sub_department_name,
        test_count: 0
      }]);
      
      toast({
        title: "Success",
        description: "Service added successfully.",
      });
      
      setNewServiceName('');
      setSelectedSubDepartment('');
      setShowAddService(false);
    } catch (error) {
      console.error('Error adding service:', error);
      toast({
        title: "Error",
        description: "Failed to add service.",
        variant: "destructive"
      });
    }
  };

  const handleAddTest = async () => {
    if (!selectedServiceForTest || !newTestName.trim() || !newTestUnit.trim() || !newTestNormalMin.trim() || !newTestNormalMax.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all test fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      const newTest = await api.post('/services/tests', {
        service_type_id: selectedServiceForTest.service_type_id,
        test_name: newTestName,
        unit: newTestUnit,
        normal_min: parseFloat(newTestNormalMin),
        normal_max: parseFloat(newTestNormalMax)
      });
      
      // Refetch services data to get accurate test counts
      const servicesResponse = await api.get('/services/all');
      setServices(servicesResponse);
      
      // Update selected service tests if dialog is open
      if (selectedServiceTests.length > 0) {
        setSelectedServiceTests(prevTests => [...prevTests, newTest]);
      }
      
      toast({
        title: "Success",
        description: "Test added successfully.",
      });
      
      setNewTestName('');
      setNewTestUnit('');
      setNewTestNormalMin('');
      setNewTestNormalMax('');
      setShowAddTest(false);
    } catch (error) {
      console.error('Error adding test:', error);
      toast({
        title: "Error",
        description: "Failed to add test.",
        variant: "destructive"
      });
    }
  };

  const handleViewTests = async (service: ServiceType) => {
    try {
      const testsResponse = await api.get(`/services/tests/${service.service_type_id}`);
      setSelectedServiceTests(testsResponse);
      setSelectedServiceForTest(service);
      setShowViewTests(true);
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast({
        title: "Error",
        description: "Failed to load tests.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    try {
      await api.delete(`/services/service-types/${serviceId}`);
      
      // Update state directly instead of refetching
      setServices(prevServices => prevServices.filter(service => service.service_type_id !== serviceId));
      
      toast({
        title: "Success",
        description: "Service deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        title: "Error",
        description: "Failed to delete service.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTest = async (testId: number) => {
    try {
      await api.delete(`/services/tests/${testId}`);
      
      // Update selected service tests state
      setSelectedServiceTests(prevTests => prevTests.filter(test => test.test_id !== testId));
      
      // Refetch services data to get accurate test counts
      const servicesResponse = await api.get('/services/all');
      setServices(servicesResponse);
      
      toast({
        title: "Success",
        description: "Test deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting test:', error);
      toast({
        title: "Error",
        description: "Failed to delete test.",
        variant: "destructive"
      });
    }
  };

  // Filter and sort services
  const filteredServices = services
    .filter(service => {
      const matchesSearch = service.service_type_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.sub_department_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartment = selectedDepartment === 'all' || 
        service.sub_department_id.toString() === selectedDepartment;
      
      return matchesSearch && matchesDepartment;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.service_type_name.localeCompare(b.service_type_name);
          break;
        case 'department':
          comparison = (a.sub_department_name || '').localeCompare(b.sub_department_name || '');
          break;
        case 'tests':
          comparison = (Number(a.test_count) || 0) - (Number(b.test_count) || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentServices = filteredServices.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDepartment, sortBy, sortOrder]);

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
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading services...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services.length}</div>
            <p className="text-xs text-muted-foreground">Available services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subDepartments.length}</div>
            <p className="text-xs text-muted-foreground">Active departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {services.reduce((sum, service) => sum + (Number(service.test_count) || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all services</p>
          </CardContent>
        </Card>
      </div>

      {/* Services Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Service Management
          </CardTitle>
          <CardDescription>
            Manage services and their associated tests
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {subDepartments.map((dept) => (
                    <SelectItem key={dept.sub_department_id} value={dept.sub_department_id.toString()}>
                      {dept.sub_department_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [newSortBy, newSortOrder] = value.split('-') as ['name' | 'department' | 'tests', 'asc' | 'desc'];
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="department-asc">Department (A-Z)</SelectItem>
                  <SelectItem value="department-desc">Department (Z-A)</SelectItem>
                  <SelectItem value="tests-asc">Tests (Low-High)</SelectItem>
                  <SelectItem value="tests-desc">Tests (High-Low)</SelectItem>
                </SelectContent>
              </Select>
                             <Button onClick={() => setShowAddService(true)} className="flex items-center gap-2">
                 <Plus className="h-4 w-4" />
                 Add Service
               </Button>
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

          {/* Services Table */}
          <div className="rounded-md border">
            <Table className="w-full text-xs sm:text-sm md:text-base">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 text-left">Department</TableHead>
                  <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 text-left">Service Name</TableHead>
                  <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 text-center">Tests</TableHead>
                  <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Stethoscope className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No services found</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowAddService(true)}
                        >
                          Add Your First Service
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentServices.map((service) => (
                    <TableRow key={service.service_type_id} className="text-xs sm:text-sm md:text-base">
                      <TableCell className="font-medium px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 text-left">
                        {service.sub_department_name || 'Unknown Department'}
                      </TableCell>
                      <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 text-left">
                        {service.service_type_name}
                      </TableCell>
                      <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 text-center">
                                                 <Badge variant="outline" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 md:px-3 py-0.5 sm:py-1">
                           {Number(service.test_count) || 0} 
                         </Badge>
                      </TableCell>
                      <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 text-center">
                        <div className="flex gap-1 sm:gap-2 justify-center">
                          <Button
                            size="icon"
                            className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 p-1 sm:p-2"
                            variant="outline"
                            onClick={() => {
                              setSelectedServiceForTest(service);
                              setShowAddTest(true);
                            }}
                          >
                            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            size="icon"
                            className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 p-1 sm:p-2"
                            variant="outline"
                            onClick={() => handleViewTests(service)}
                          >
                            <TestTube className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 p-1 sm:p-2"
                                variant="destructive"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Service</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{service.service_type_name}"? This will also delete all associated tests and cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteService(service.service_type_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete Service
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
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

      {/* Add Service Dialog */}
      <Dialog open={showAddService} onOpenChange={setShowAddService}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
            <DialogDescription>
              Create a new service by selecting a department and entering a service name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={selectedSubDepartment.toString()} onValueChange={(value) => setSelectedSubDepartment(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {subDepartments.map((dept) => (
                    <SelectItem key={dept.sub_department_id} value={dept.sub_department_id.toString()}>
                      {dept.sub_department_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceName">Service Name</Label>
              <Input
                id="serviceName"
                placeholder="Enter service name"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddService(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddService} disabled={!selectedSubDepartment || !newServiceName.trim()}>
              Add Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Test Dialog */}
      <Dialog open={showAddTest} onOpenChange={setShowAddTest}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Test</DialogTitle>
            <DialogDescription>
              Create a new test for {selectedServiceForTest?.service_type_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="testName">Test Name</Label>
              <Input
                id="testName"
                placeholder="Enter test name"
                value={newTestName}
                onChange={(e) => setNewTestName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="testUnit">Unit *</Label>
                <Input
                  id="testUnit"
                  placeholder="e.g., mg/dL, mmol/L"
                  value={newTestUnit}
                  onChange={(e) => setNewTestUnit(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="testNormalMin">Normal Min *</Label>
                <Input
                  id="testNormalMin"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 70"
                  value={newTestNormalMin}
                  onChange={(e) => setNewTestNormalMin(e.target.value)}
                />
              </div>
            </div>
                         <div className="space-y-2">
               <Label htmlFor="testNormalMax">Normal Max *</Label>
               <Input
                 id="testNormalMax"
                 type="number"
                 step="0.01"
                 placeholder="e.g., 100"
                 value={newTestNormalMax}
                 onChange={(e) => setNewTestNormalMax(e.target.value)}
               />
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTest(false)}>
              Cancel
            </Button>
                         <Button onClick={handleAddTest} disabled={!newTestName.trim() || !newTestUnit.trim() || !newTestNormalMin.trim() || !newTestNormalMax.trim()}>
               Add Test
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Tests Dialog */}
      <Dialog open={showViewTests} onOpenChange={setShowViewTests}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tests for {selectedServiceForTest?.service_type_name}</DialogTitle>
            <DialogDescription>
              View and manage tests for this service.
            </DialogDescription>
          </DialogHeader>
                     <div className="space-y-4 py-4">
             {selectedServiceTests.length === 0 ? (
               <div className="text-center py-8">
                 <TestTube className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                 <p className="text-muted-foreground">No tests found for this service</p>
               </div>
             ) : (
               <div className="rounded-md border">
                 <Table>
                                       <TableHeader>
                      <TableRow>
                        <TableHead className="text-left">Test Name</TableHead>
                        <TableHead className="text-center">Unit</TableHead>
                        <TableHead className="text-center">Normal Range</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                   <TableBody>
                     {selectedServiceTests.map((test) => (
                       <TableRow key={test.test_id}>
                         <TableCell className="font-medium">
                           <div className="flex items-center gap-2">
                             <TestTube className="h-4 w-4 text-muted-foreground" />
                             {test.test_name}
                           </div>
                         </TableCell>
                         <TableCell className="text-center">{test.unit}</TableCell>
                                                   <TableCell className="text-center">
                            <Badge variant="outline">
                              {test.normal_min} - {test.normal_max}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                           <AlertDialog>
                             <AlertDialogTrigger asChild>
                               <Button
                                 variant="destructive"
                                 size="sm"
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>Delete Test</AlertDialogTitle>
                                 <AlertDialogDescription>
                                   Are you sure you want to delete "{test.test_name}"? This action cannot be undone.
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Cancel</AlertDialogCancel>
                                 <AlertDialogAction
                                   onClick={() => handleDeleteTest(test.test_id)}
                                   className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                 >
                                   Delete Test
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
             )}
           </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewTests(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowViewTests(false);
              setShowAddTest(true);
            }}>
              Add Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicesTab;
