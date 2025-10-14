import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Search, Plus, Edit, Trash2, Settings, FileText, Filter, X, PlusCircle, Save, ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { radiologyServicesApi, RadiologyServiceType, RadiologyTemplate } from '@/services/api';
import TextEditor from '@/components/ui/TextEditor';

const RadiologyServicesTab: React.FC = () => {
  const [services, setServices] = useState<RadiologyServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Dialog states
  const [showAddService, setShowAddService] = useState(false);
  const [showEditService, setShowEditService] = useState(false);
  const [showEditTemplate, setShowEditTemplate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  
  // Template view state
  const [currentView, setCurrentView] = useState<'services' | 'template'>('services');
  
  // Form states
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [editingService, setEditingService] = useState<RadiologyServiceType | null>(null);
  
  // Template states
  const [selectedService, setSelectedService] = useState<RadiologyServiceType | null>(null);
  const [templates, setTemplates] = useState<RadiologyTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<RadiologyTemplate | null>(null);

  // Calculate items per page based on viewport height
  useEffect(() => {
    const calculateItemsPerPage = () => {
      const vh = window.innerHeight;
      const headerHeight = 200;
      const rowHeight = 60;
      const paginationHeight = 80;
      const availableHeight = vh - headerHeight - paginationHeight;
      const calculatedItems = Math.max(5, Math.floor(availableHeight / rowHeight));
      setItemsPerPage(calculatedItems);
    };

    calculateItemsPerPage();
    window.addEventListener('resize', calculateItemsPerPage);
    
    return () => window.removeEventListener('resize', calculateItemsPerPage);
  }, []);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      console.log('🔍 Fetching radiology services...');
      setLoading(true);
      
      console.log('📡 API call to radiologyServicesApi.getAll()');
      const servicesData = await radiologyServicesApi.getAll();
      
      console.log('✅ Services data received:', servicesData);
      setServices(servicesData);
      
    } catch (error) {
      console.error('❌ Error fetching services:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      toast({
        title: "Error",
        description: "Failed to load radiology services.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      console.log('🏁 Loading completed');
    }
  };

  const fetchTemplates = async (serviceId: string) => {
    try {
      const templatesData = await radiologyServicesApi.getTemplates(serviceId);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates.",
        variant: "destructive"
      });
    }
  };

  const handleAddService = async () => {
    if (!newServiceName.trim()) {
      toast({
        title: "Error",
        description: "Please fill in the service name.",
        variant: "destructive"
      });
      return;
    }

    try {
      const newService = await radiologyServicesApi.add({
        name: newServiceName.trim(),
        price: newServicePrice ? parseFloat(newServicePrice) : undefined
      });
      
      setServices(prevServices => [...prevServices, newService]);
      
      toast({
        title: "Success",
        description: "Radiology service added successfully.",
      });
      
      setNewServiceName('');
      setNewServicePrice('');
      setShowAddService(false);
    } catch (error) {
      console.error('Error adding service:', error);
      toast({
        title: "Error",
        description: "Failed to add radiology service.",
        variant: "destructive"
      });
    }
  };

  const handleEditService = async () => {
    if (!editingService || !newServiceName.trim()) {
      toast({
        title: "Error",
        description: "Please fill in the service name.",
        variant: "destructive"
      });
      return;
    }

    try {
      const updatedService = await radiologyServicesApi.update(editingService.service_id, {
        name: newServiceName.trim(),
        price: newServicePrice ? parseFloat(newServicePrice) : undefined
      });
      
      setServices(prevServices => 
        prevServices.map(service => 
          service.service_id === editingService.service_id ? updatedService : service
        )
      );
      
      toast({
        title: "Success",
        description: "Radiology service updated successfully.",
      });
      
      setShowEditService(false);
      setEditingService(null);
      setNewServiceName('');
      setNewServicePrice('');
    } catch (error) {
      console.error('Error updating service:', error);
      toast({
        title: "Error",
        description: "Failed to update radiology service.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      console.log('Attempting to delete service with ID:', serviceId);
      
      // First, check if there are any associated templates
      const templates = await radiologyServicesApi.getTemplates(serviceId);
      if (templates && templates.length > 0) {
        // Delete all templates first
        console.log(`Found ${templates.length} templates to delete`);
        await Promise.all(
          templates.map(template => 
            radiologyServicesApi.deleteTemplate(serviceId, template.template_id)
          )
        );
      }
      
      // Now delete the service
      await radiologyServicesApi.delete(serviceId);
      
      // Update the UI
      setServices(prevServices => {
        const updated = prevServices.filter(service => service.service_id !== serviceId);
        console.log('Services after deletion:', updated);
        return updated;
      });
      
      toast({
        title: "Success",
        description: "Radiology service and associated templates deleted successfully.",
      });
    } catch (error) {
      console.error('Error in handleDeleteService:', {
        error,
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete radiology service. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedService) return;

    try {
      // Use service name as template name
      const templateName = selectedService.name;
      
      // Create a simple template structure from the content
      const templateStructure = {
        title: templateName,
        content: newTemplateContent.trim(),
        sections: extractSections(newTemplateContent.trim())
      };

      if (templates.length > 0) {
        // Update existing template
        const existingTemplate = templates[0];
        const updatedTemplate = await radiologyServicesApi.updateTemplate(
          selectedService.service_id,
          existingTemplate.template_id,
          {
            template_name: templateName,
            template_structure: templateStructure
          }
        );
        
        setTemplates([updatedTemplate]);
        toast({
          title: "Success",
          description: "Template updated successfully.",
        });
      } else {
        // Create new template
        const newTemplate = await radiologyServicesApi.addTemplate(selectedService.service_id, {
          template_name: templateName,
          template_structure: templateStructure
        });
        
        setTemplates([newTemplate]);
        toast({
          title: "Success",
          description: "Template created successfully.",
        });
      }
      
      // Don't clear content after save - keep it for continued editing
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save template.",
        variant: "destructive"
      });
    }
  };

  const handleEditTemplate = async () => {
    if (!editingTemplate || !newTemplateContent.trim()) {
      toast({
        title: "Error",
        description: "Please fill in the template content.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedService) return;

    try {
      // Use service name as template name
      const templateName = selectedService.name;
      
      // Create a simple template structure from the content
      const templateStructure = {
        title: templateName,
        content: newTemplateContent.trim(),
        sections: extractSections(newTemplateContent.trim())
      };

      const updatedTemplate = await radiologyServicesApi.updateTemplate(
        selectedService.service_id,
        editingTemplate.template_id,
        {
          template_name: templateName,
          template_structure: templateStructure
        }
      );
      
      setTemplates(prevTemplates => 
        prevTemplates.map(template => 
          template.template_id === editingTemplate.template_id ? updatedTemplate : template
        )
      );
      
      toast({
        title: "Success",
        description: "Template updated successfully.",
      });
      
      setShowEditTemplate(false);
      setEditingTemplate(null);
      setNewTemplateContent('');
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update template.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!selectedService) return;

    try {
      await radiologyServicesApi.deleteTemplate(selectedService.service_id, templateId);
      setTemplates(prevTemplates => prevTemplates.filter(template => template.template_id !== templateId));
      
      toast({
        title: "Success",
        description: "Template deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template.",
        variant: "destructive"
      });
    }
  };

  const openEditService = (service: RadiologyServiceType) => {
    setEditingService(service);
    setNewServiceName(service.name);
    setNewServicePrice(service.price?.toString() || '');
    setShowEditService(true);
  };

  const openEditTemplate = (template: RadiologyTemplate) => {
    setEditingTemplate(template);
    setNewTemplateContent(template.template_structure.content || '');
    setShowEditTemplate(true);
  };

  const openTemplate = async (service: RadiologyServiceType) => {
    setSelectedService(service);
    
    // Auto-set template name to service name
    setNewTemplateName(service.name);
    
    try {
      // Fetch templates for this service
      const fetchedTemplates = await radiologyServicesApi.getTemplates(service.service_id);
      setTemplates(fetchedTemplates);
      
      // Initialize content based on existing template
      if (fetchedTemplates.length > 0) {
        const existingTemplate = fetchedTemplates[0];
        setNewTemplateContent(existingTemplate.template_structure.content || '');
      } else {
        setNewTemplateContent('');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
      setNewTemplateContent('');
    }
    
    setCurrentView('template');
  };

  // Helper function to extract sections from template content
  const extractSections = (content: string) => {
    const lines = content.split('\n');
    const sections: string[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && (trimmed.startsWith('#') || trimmed.startsWith('**') || trimmed.match(/^[A-Z][A-Z\s]+:$/))) {
        sections.push(trimmed);
      }
    });
    
    return sections;
  };

  // Helper function to render markdown-like content
  const renderTemplateContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('# ')) {
        return <h1 key={index} className="text-xl font-bold text-primary mt-4 mb-2">{trimmed.substring(2)}</h1>;
      }
      if (trimmed.startsWith('## ')) {
        return <h2 key={index} className="text-lg font-semibold text-primary mt-3 mb-2">{trimmed.substring(3)}</h2>;
      }
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        return <p key={index} className="font-bold my-1">{trimmed.substring(2, trimmed.length - 2)}</p>;
      }
      if (trimmed.startsWith('- ')) {
        return <p key={index} className="ml-4 my-1">• {trimmed.substring(2)}</p>;
      }
      if (trimmed === '') {
        return <div key={index} className="h-2"></div>;
      }
      
      return <p key={index} className="my-1">{trimmed}</p>;
    });
  };

  // Filter and sort services
  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedServices = [...filteredServices].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'price':
        aValue = a.price || 0;
        bValue = b.price || 0;
        break;
      default:
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentServices = sortedServices.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Radiology Service Management
            </CardTitle>
            <CardDescription>
              Manage radiology services and report templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading services...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentView === 'template') {
    return (
      <div className="space-y-6">
        {/* Template Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentView('services')}
                className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Services
              </Button>
              <Button
                onClick={handleSaveTemplate}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Template
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <TextEditor
                  value={newTemplateContent}
                  onChange={setNewTemplateContent}
                  placeholder={`# ${selectedService?.name?.toUpperCase()} REPORT

## CLINICAL HISTORY
- Patient presents with...

## TECHNIQUE
- Standard examination protocol

## FINDINGS
- [Enter findings here]

## IMPRESSION
- [Enter impression here]`}
                  className="mt-2"
                  onSave={handleSaveTemplate}
                  onCancel={() => setCurrentView('services')}
                />
              </div>
              
              <div className="flex gap-2">
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Services Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Radiology Service Management
          </CardTitle>
          <CardDescription>
            Manage radiology services and their associated report templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                                 <SelectContent>
                   <SelectItem value="name">Name</SelectItem>
                   <SelectItem value="price">Price</SelectItem>
                 </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
              <Button onClick={() => setShowAddService(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Service
              </Button>
            </div>
          </div>

          {/* Services Table */}
          <div className="rounded-md border">
            <Table>
                             <TableHeader>
                 <TableRow>
                   <TableHead>Service Name</TableHead>
                   <TableHead>Price</TableHead>
                   <TableHead>Template</TableHead>
                   <TableHead>Actions</TableHead>
                 </TableRow>
               </TableHeader>
              <TableBody>
                                 {currentServices.map((service) => (
                   <TableRow key={service.service_id}>
                    <TableCell className="font-medium text-justify">{service.name}</TableCell>
                    <TableCell className="text-justify">
                      {service.price ? `₹${service.price}` : 'N/A'}
                    </TableCell>
                   <TableCell className="text-justify">
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => openTemplate(service)}
                       className="flex items-center gap-2"
                     >
                       <FileText className="h-4 w-4" />
                       Template
                     </Button>
                   </TableCell>
                   <TableCell className="text-justify">
                     <AlertDialog>
                       <AlertDialogTrigger asChild>
                         <Button 
                           variant="outline" 
                           size="sm"
                           className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </AlertDialogTrigger>
                       <AlertDialogContent>
                         <AlertDialogHeader>
                           <AlertDialogTitle>Delete Service</AlertDialogTitle>
                           <AlertDialogDescription>
                             Are you sure you want to delete "{service.name}"? This action cannot be undone.
                           </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                           <AlertDialogCancel>Cancel</AlertDialogCancel>
                           <AlertDialogAction
                             onClick={() => handleDeleteService(service.service_id)}
                             className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                           >
                             Delete
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
            <DialogTitle>Add New Radiology Service</DialogTitle>
                         <DialogDescription>
               Create a new radiology service with name and optional price.
             </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="serviceName">Service Name *</Label>
              <Input
                id="serviceName"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="e.g., Chest X-Ray"
              />
            </div>
            
            <div>
              <Label htmlFor="servicePrice">Price (₹)</Label>
              <Input
                id="servicePrice"
                type="number"
                value={newServicePrice}
                onChange={(e) => setNewServicePrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddService(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddService}>Add Service</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={showEditService} onOpenChange={setShowEditService}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Radiology Service</DialogTitle>
                         <DialogDescription>
               Update the radiology service name and price.
             </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editServiceName">Service Name *</Label>
              <Input
                id="editServiceName"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="e.g., Chest X-Ray"
              />
            </div>
            
            <div>
              <Label htmlFor="editServicePrice">Price (₹)</Label>
              <Input
                id="editServicePrice"
                type="number"
                value={newServicePrice}
                onChange={(e) => setNewServicePrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditService(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditService}>Update Service</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>







       {/* Preview Dialog */}
       <Dialog open={showPreview} onOpenChange={setShowPreview}>
         <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <FileText className="h-5 w-5" />
               Template Preview
             </DialogTitle>
             <DialogDescription>
               Preview how your template will look when rendered
             </DialogDescription>
           </DialogHeader>
           
           <div className="border rounded-lg p-6 bg-white">
             <div className="prose max-w-none">
               {renderTemplateContent(previewContent)}
             </div>
           </div>
           
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowPreview(false)}>
               Close Preview
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 };

export default RadiologyServicesTab;
