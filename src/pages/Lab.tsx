import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LogOut, TestTube, FileText, Stethoscope, RefreshCw, ClipboardList } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { LabPrescriptionsTab } from '@/components/pharma/LabPrescriptionsTab';
import LabTestsTab from '@/components/pharma/LabTestsTab';
import ServicesTab from '@/components/pharma/ServicesTab';
import ReportsTab from '@/components/pharma/ReportsTab';

const Lab: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    const storedTab = localStorage.getItem('labActiveTab');
    return storedTab || 'lab_prescriptions';
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    localStorage.setItem('labActiveTab', activeTab);
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate('/login');
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    handleLogout();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 48, width: 48 }}>
                <img src="/cura-logo.png" alt="CURA Hospitals Logo" style={{ height: 40, width: 40, objectFit: 'contain', display: 'block' }} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Laboratory Dashboard</h1>
                <p className="text-sm text-muted-foreground">Powered by SVCE</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  window.dispatchEvent(new Event('lab-refresh'));
                  window.location.reload();
                }}
                className="flex items-center gap-2"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={handleLogoutClick}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-fit lg:grid-cols-4 justify-center">
            <TabsTrigger value="lab_prescriptions" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              <span className="hidden sm:inline">Lab Prescriptions</span>
            </TabsTrigger>
            <TabsTrigger value="lab_tests" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Lab Tests</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              <span className="hidden sm:inline">Services</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lab_prescriptions" className="space-y-6">
            <LabPrescriptionsTab />
          </TabsContent>

          <TabsContent value="lab_tests" className="space-y-6">
            <LabTestsTab />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ReportsTab />
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <ServicesTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Confirm Logout
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to logout? You will be redirected to the login page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Lab;
