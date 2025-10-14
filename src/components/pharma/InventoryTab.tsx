import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, RefreshCw, Download, AlertTriangle, Package, CheckCircle, ArrowDown, ArrowUp } from 'lucide-react';
import { LoadingPage } from '@/components/ui/loading';
import { medicinesApi } from '@/services/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface Medicine {
  id: number;
  name: string;
  price: number;
  quantity: number;
  stock_status: 'in_stock' | 'low_stock';
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

interface NewMedicine {
  name: string;
  price: string;
  quantity: string;
  expiry_date: string;
}

interface EditMedicineFields {
  name: string;
  price: string;
  expiry_date: string;
}

export default function InventoryTab() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRefillDialogOpen, setIsRefillDialogOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [refillQuantity, setRefillQuantity] = useState('');
  const [newMedicine, setNewMedicine] = useState<NewMedicine>({
    name: '',
    price: '',
    quantity: '',
    expiry_date: ''
  });
  const [editFields, setEditFields] = useState<EditMedicineFields>({ name: '', price: '', expiry_date: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock'>('all');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | 'expiring_soon' | 'valid'>('all');
  
  // Dynamic pagination state based on viewport height
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
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      const data = await medicinesApi.getAll();
      setMedicines(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch medicines",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedicine = async () => {
    if (!newMedicine.name || newMedicine.price === '' || newMedicine.quantity === '' || newMedicine.expiry_date === '' || Number(newMedicine.price) <= 0 || Number(newMedicine.quantity) < 0) {
      toast({
        title: "Error",
        description: "Please fill all fields with valid values",
        variant: "destructive"
      });
      return;
    }

    try {
      await medicinesApi.add({
        name: newMedicine.name,
        price: Number(newMedicine.price),
        quantity: Number(newMedicine.quantity),
        expiry_date: newMedicine.expiry_date || null
      });

      toast({
        title: "Success",
        description: "Medicine added successfully"
      });
      setIsAddDialogOpen(false);
      setNewMedicine({ name: '', price: '', quantity: '', expiry_date: '' });
      fetchMedicines();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add medicine",
        variant: "destructive"
      });
    }
  };

  const handleEditMedicine = async () => {
    if (!selectedMedicine || !editFields.name || editFields.price === '' || Number(editFields.price) <= 0) {
      toast({
        title: "Error",
        description: "Please fill all fields with valid values",
        variant: "destructive"
      });
      return;
    }

    try {
      const updateData = {
        name: editFields.name,
        price: Number(editFields.price),
        expiry_date: editFields.expiry_date || null
      };
      
      console.log('Updating medicine with data:', updateData);
      
      await medicinesApi.update(selectedMedicine.id, updateData);

      toast({
        title: "Success",
        description: "Medicine updated successfully"
      });
      setIsEditDialogOpen(false);
      setSelectedMedicine(null);
      fetchMedicines();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update medicine",
        variant: "destructive"
      });
    }
  };

  const handleRefillStock = async () => {
    if (!selectedMedicine || refillQuantity === '' || Number(refillQuantity) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid refill quantity",
        variant: "destructive"
      });
      return;
    }

    try {
      await medicinesApi.refill(selectedMedicine.id, Number(refillQuantity));

      toast({
        title: "Success",
        description: "Stock refilled successfully"
      });
      setIsRefillDialogOpen(false);
      setSelectedMedicine(null);
      setRefillQuantity('');
      fetchMedicines();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refill stock",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMedicine = async (medicine: Medicine) => {
    try {
      await medicinesApi.delete(medicine.id, medicine.name);

      toast({
        title: "Success",
        description: "Medicine deleted successfully"
      });
      setSelectedMedicine(null);
      fetchMedicines();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete medicine",
        variant: "destructive"
      });
    }
  };

  const exportInventory = () => {
    // Export based on current filters
    const dataToExport = filteredMedicines;

    // Convert to CSV format
    const csvData = dataToExport.map(med => ({
      'Medicine Name': med.name,
      'Quantity': med.quantity,
      'Price': `₹${med.price}`,
      'Expiry Date': med.expiry_date ? new Date(med.expiry_date).toLocaleDateString() : 'Not set',
      'Stock Status': med.stock_status === 'low_stock' ? 'Low Stock' : 'In Stock',
      'Last Updated': new Date(med.updated_at).toLocaleDateString()
    }));

    // Convert to CSV string
    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Generate filename based on current filters
    let filename = 'inventory';
    if (searchTerm) filename += `_${searchTerm.replace(/[^a-zA-Z0-9]/g, '_')}`;
    if (stockFilter !== 'all') filename += `_${stockFilter}`;
    if (expiryFilter !== 'all') filename += `_${expiryFilter}`;
    filename += '.csv';
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: `Filtered inventory exported as ${filename}`
    });
  };

  // Download CSV template


  // Process bulk upload




  const lowStockCount = medicines.filter(med => med.stock_status === 'low_stock').length;

  // Function to check if medicine is expired
  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    return expiry < today;
  };

  // Function to check if medicine is expiring soon (within 30 days)
  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    return expiry <= thirtyDaysFromNow && expiry > today;
  };

  // Function to format expiry date
  const formatExpiryDate = (expiryDate: string | null) => {
    if (!expiryDate) return 'Not set';
    return new Date(expiryDate).toLocaleDateString();
  };

  // Filtered and sorted medicines for display
  const filteredMedicines = medicines
    .filter(med => {
      const matchesSearch = med.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStock = stockFilter === 'all' || med.stock_status === stockFilter;
      
      // Expiry filter logic
      let matchesExpiryFilter = true;
      if (expiryFilter === 'expired') {
        matchesExpiryFilter = isExpired(med.expiry_date);
      } else if (expiryFilter === 'expiring_soon') {
        matchesExpiryFilter = isExpiringSoon(med.expiry_date);
      } else if (expiryFilter === 'valid') {
        // For valid filter, show medicines that are not expired and not expiring soon
        matchesExpiryFilter = !isExpired(med.expiry_date) && !isExpiringSoon(med.expiry_date);
      }
      
      return matchesSearch && matchesStock && matchesExpiryFilter;
    })
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

  // Pagination logic
  const totalPages = Math.ceil(filteredMedicines.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMedicines = filteredMedicines.slice(startIndex, endIndex);

  // Reset to first page when search term or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stockFilter, expiryFilter]);

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

  const StockStatusArrow = ({ status }: { status: 'in_stock' | 'low_stock' }) => {
    if (status === 'in_stock') {
      return (
        <div className="flex items-center gap-1 text-green-600" title="In Stock">
          <ArrowUp className="h-4 w-4" />
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-red-600" title="Low Stock">
          <ArrowDown className="h-4 w-4" />
        </div>
      );
    }
  };

  if (loading) {
    return <LoadingPage text="Loading medicines..." />;
  }

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              setNewMedicine({ name: '', price: '', quantity: '', expiry_date: '' });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Medicine
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Medicine</DialogTitle>
              <DialogDescription>
                Add a new medicine to the inventory with its details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Medicine Name</Label>
                <Input
                  id="name"
                  value={newMedicine.name}
                  onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                  placeholder="Enter medicine name"
                />
              </div>
              <div>
                <Label htmlFor="price">Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newMedicine.price}
                  onChange={e => setNewMedicine({ ...newMedicine, price: e.target.value })}
                  placeholder="Enter price"
                />
              </div>
              <div>
                <Label htmlFor="quantity">Initial Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={newMedicine.quantity}
                  onChange={e => setNewMedicine({ ...newMedicine, quantity: e.target.value })}
                  placeholder="Enter quantity"
                />
              </div>
              <div>
                <Label htmlFor="expiry-date">Expiry Date</Label>
                <Input
                  id="expiry-date"
                  type="date"
                  value={newMedicine.expiry_date}
                  onChange={e => setNewMedicine({ ...newMedicine, expiry_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddMedicine} className="flex-1">Add Medicine</Button>
                <Button variant="outline" onClick={() => {
                  setIsAddDialogOpen(false);
                  setNewMedicine({ name: '', price: '', quantity: '', expiry_date: '' });
                }} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>


        </div>

        <div className="flex gap-2 overflow-x-auto whitespace-nowrap flex-nowrap">
          <Button variant="outline" onClick={() => exportInventory()} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3 bg-gray-50 rounded-lg">
        <Input
          placeholder="Search medicines..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2">
          <Select value={stockFilter} onValueChange={(value) => setStockFilter(value as 'all' | 'in_stock' | 'low_stock')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="low_stock">Low Stock</SelectItem>
            </SelectContent>
          </Select>
          <Select value={expiryFilter} onValueChange={(value) => setExpiryFilter(value as 'all' | 'expired' | 'expiring_soon' | 'valid')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Expiry</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
              <SelectItem value="valid">Valid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Inventory Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Medicine Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center justify-start mb-2 text-sm">
            <span className="font-medium">Total Medicines:</span> <span className="font-bold text-blue-700">{medicines.length}</span>
            <span className="font-medium">In Stock:</span> <span className="font-bold text-green-700">{medicines.filter(med => med.stock_status === 'in_stock').length}</span>
            <span className="font-medium">Low Stock:</span> <span className="font-bold text-red-700">{medicines.filter(med => med.stock_status === 'low_stock').length}</span>
            <span className="font-medium">Expired:</span> <span className="font-bold text-red-600">{medicines.filter(med => isExpired(med.expiry_date)).length}</span>
            <span className="font-medium">Expiring Soon:</span> <span className="font-bold text-orange-600">{medicines.filter(med => isExpiringSoon(med.expiry_date)).length}</span>
          </div>

          {/* Results summary */}
          <div className="flex justify-between items-center mb-4 text-sm text-muted-foreground">
            <span>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredMedicines.length)} of {filteredMedicines.length} medicines
            </span>
            {filteredMedicines.length > 0 && (
              <span>
                Page {currentPage} of {totalPages} ({itemsPerPage} per page)
              </span>
            )}
          </div>

          <div className="rounded-md border">
            <Table className="w-full text-xs sm:text-sm md:text-base">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Medicine Name</TableHead>
                  <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Quantity</TableHead>
                  <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden sm:table-cell">Price</TableHead>
                  <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden md:table-cell">Expiry Date</TableHead>
                  <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Status</TableHead>
                  <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden lg:table-cell">Updated</TableHead>
                  <TableHead className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentMedicines.map((medicine) => (
                  <TableRow key={medicine.id} className={`text-xs sm:text-sm md:text-base ${
                    isExpired(medicine.expiry_date) ? 'bg-red-50' : 
                    isExpiringSoon(medicine.expiry_date) ? 'bg-orange-50' : ''
                  }`}>
                    <TableCell className="font-medium px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">{medicine.name}</TableCell>
                    <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">{medicine.quantity}</TableCell>
                    <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden sm:table-cell">₹{medicine.price}</TableCell>
                    <TableCell className={`px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden md:table-cell ${
                      isExpired(medicine.expiry_date) ? 'text-red-600 font-semibold' : 
                      isExpiringSoon(medicine.expiry_date) ? 'text-orange-600 font-semibold' : ''
                    }`}>
                      <div className="flex flex-col">
                        <span>{formatExpiryDate(medicine.expiry_date)}</span>
                        {isExpired(medicine.expiry_date) && <span className="text-xs font-bold text-red-600">EXPIRED</span>}
                        {isExpiringSoon(medicine.expiry_date) && <span className="text-xs font-bold text-orange-600">EXPIRING</span>}
                      </div>
                    </TableCell>
                    <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                      <StockStatusArrow status={medicine.stock_status} />
                    </TableCell>
                    <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 hidden lg:table-cell">{new Date(medicine.updated_at).toLocaleDateString()}</TableCell>
                    <TableCell className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3">
                      <div className="flex gap-1 sm:gap-2">
                        {/* Refill Stock */}
                        <Dialog open={isRefillDialogOpen && selectedMedicine?.id === medicine.id} 
                                onOpenChange={(open) => {
                                  setIsRefillDialogOpen(open);
                                  if (!open) {
                                    setSelectedMedicine(null);
                                    setRefillQuantity('');
                                  }
                                }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 p-1 sm:p-2"
                              onClick={() => setSelectedMedicine(medicine)}
                            >
                              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Refill Stock - {medicine.name}</DialogTitle>
                              <DialogDescription>
                                Add more quantity to the existing stock.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Current Stock: {medicine.quantity}</Label>
                              </div>
                              <div>
                                <Label htmlFor="refill-quantity">Refill Quantity</Label>
                                <Input
                                  id="refill-quantity"
                                  type="number"
                                  min="1"
                                  value={refillQuantity}
                                  onChange={e => setRefillQuantity(e.target.value)}
                                  placeholder="Enter quantity to add"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={handleRefillStock} className="flex-1">
                                  Refill Stock
                                </Button>
                                <Button variant="outline" onClick={() => {
                                  setIsRefillDialogOpen(false);
                                  setSelectedMedicine(null);
                                  setRefillQuantity('');
                                }} className="flex-1">
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Edit Medicine */}
                        <Dialog open={isEditDialogOpen && selectedMedicine?.id === medicine.id} 
                                onOpenChange={(open) => {
                                  setIsEditDialogOpen(open);
                                  if (open && medicine) {
                                    setEditFields({ 
                                      name: medicine.name, 
                                      price: medicine.price === 0 ? '' : String(medicine.price),
                                      expiry_date: medicine.expiry_date || ''
                                    });
                                  }
                                  if (!open) {
                                    setSelectedMedicine(null);
                                    setEditFields({ name: '', price: '', expiry_date: '' });
                                  }
                                }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 p-1 sm:p-2"
                              onClick={() => setSelectedMedicine({ ...medicine })}
                            >
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Medicine</DialogTitle>
                              <DialogDescription>
                                Update the medicine details.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit-name">Medicine Name</Label>
                                <Input
                                  id="edit-name"
                                  value={editFields.name}
                                  onChange={e => setEditFields(prev => ({ ...prev, name: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-price">Price (₹)</Label>
                                <Input
                                  id="edit-price"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editFields.price}
                                  onChange={e => setEditFields(prev => ({ ...prev, price: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-expiry-date">Expiry Date</Label>
                                <Input
                                  id="edit-expiry-date"
                                  type="date"
                                  value={editFields.expiry_date}
                                  onChange={e => setEditFields(prev => ({ ...prev, expiry_date: e.target.value }))}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={handleEditMedicine} className="flex-1">
                                  Update Medicine
                                </Button>
                                <Button variant="outline" onClick={() => {
                                  setIsEditDialogOpen(false);
                                  setSelectedMedicine(null);
                                  setEditFields({ name: '', price: '', expiry_date: '' });
                                }} className="flex-1">
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Delete Medicine */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 p-1 sm:p-2">
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Medicine</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <strong>{medicine.name}</strong>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteMedicine(medicine)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete Medicine
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
    </div>
  );
}