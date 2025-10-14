import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Building2 } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'pharmacy' | 'laboratory' | 'radiology' | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    
    // Simulate loading time for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (!role) {
      toast({ title: 'Select Department', description: 'Please choose your department.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const success = login(username, password, role);
    
    if (success) {
      toast({
        title: "Login Successful",
        description: `Welcome to ${role.charAt(0).toUpperCase() + role.slice(1)} Dashboard!`,
      });
      if (role === 'pharmacy') {
        navigate('/pharma');
      } else if (role === 'laboratory') {
        navigate('/lab');
      } else if (role === 'radiology') {
        navigate('/radiology');
      } else {
        navigate('/');
      }
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      {/* Left Side - Branding (now empty for symmetry, or you can remove this div entirely) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src="/hospital.jpg" alt="CURA Hospital" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo above Welcome back (all screens) */}
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="inline-flex p-2 rounded-xl bg-white shadow-lg mb-2">
              <img src="/cura-logo.png" alt="CURA Hospitals Logo" className="h-16 w-16 object-contain" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-foreground">Welcome back</h2>
              <p className="text-muted-foreground mt-2">Sign in to access your department dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-foreground">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="h-12 text-base border-2 focus:border-primary shadow-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 text-base border-2 focus:border-primary shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm font-medium text-foreground">
                    Department
                  </Label>
                  <Select value={role} onValueChange={(val) => setRole(val as typeof role)}>
                    <SelectTrigger className="h-12 text-base border-2 focus:border-primary shadow-sm focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pharmacy">Pharmacy</SelectItem>
                      <SelectItem value="laboratory">Laboratory</SelectItem>
                      <SelectItem value="radiology">Radiology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-all duration-200 shadow-medical hover:shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing In...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;