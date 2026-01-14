import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChefHat, Mail, Lock, User, Shield, Building2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';

type AppRole = Database['public']['Enums']['app_role'];

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const roleLabels: Record<AppRole, string> = {
  developer: 'Developer (Super Admin)',
  central_admin: 'Central Admin',
  branch_admin: 'Branch Admin',
  billing: 'Billing / Cashier',
};

const roleDescriptions: Record<AppRole, string> = {
  developer: 'Full access to everything - manages all branches and staff',
  central_admin: 'Manages all branches, staff, menus, and reports',
  branch_admin: 'Full control over assigned branch only',
  billing: 'Can add orders, process payments, and download invoices',
};

// Roles that require branch assignment
const branchRequiredRoles: AppRole[] = ['branch_admin', 'billing'];

// Roles that should be approved (not self-selectable in open signup)
const restrictedRoles: AppRole[] = ['developer', 'central_admin'];

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupRole, setSignupRole] = useState<AppRole>('billing');
  const [signupBranchId, setSignupBranchId] = useState<string>('');

  // Fetch active branches for branch selection
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, location, code')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const requiresBranch = branchRequiredRoles.includes(signupRole);
  const isRestrictedRole = restrictedRoles.includes(signupRole);

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Reset branch selection when role changes to one that doesn't require it
  useEffect(() => {
    if (!requiresBranch) {
      setSignupBranchId('');
    }
  }, [requiresBranch]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Welcome back!');
      navigate('/');
    }
    setIsSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
      if (!signupName.trim()) {
        toast.error('Please enter your full name');
        return;
      }
      if (requiresBranch && !signupBranchId) {
        toast.error('Please select your branch');
        return;
      }
      if (requiresBranch && branches.length === 0) {
        toast.error('No branches available. Please contact an administrator.');
        return;
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);
    const { error } = await signUp(
      signupEmail, 
      signupPassword, 
      signupName, 
      signupRole,
      requiresBranch ? signupBranchId : undefined
    );
    
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please login instead.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Account created! You can now login.');
      navigate('/');
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <ChefHat className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="font-display text-2xl">FoodShop Manager</CardTitle>
            <CardDescription>Sign in to manage your food shop</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-role">Role</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
                    <Select value={signupRole} onValueChange={(value: AppRole) => setSignupRole(value)}>
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="billing">{roleLabels.billing}</SelectItem>
                        <SelectItem value="branch_admin">{roleLabels.branch_admin}</SelectItem>
                        <SelectItem value="central_admin">{roleLabels.central_admin}</SelectItem>
                        <SelectItem value="developer">{roleLabels.developer}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">{roleDescriptions[signupRole]}</p>
                </div>

                {/* Branch Selection - shown for branch-restricted roles */}
                {requiresBranch && (
                  <div className="space-y-2">
                    <Label htmlFor="signup-branch">Branch *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
                      <Select value={signupBranchId} onValueChange={setSignupBranchId}>
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select your branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name} - {branch.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {branches.length === 0 && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No branches available. Contact a Developer or Central Admin to create branches first.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Warning for restricted roles */}
                {isRestrictedRole && (
                  <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-700 dark:text-amber-400">
                      {signupRole === 'developer' 
                        ? 'Developer role has full system access. This should only be assigned to system administrators.'
                        : 'Central Admin role has access to all branches. This should only be assigned to senior management.'}
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting || (requiresBranch && branches.length === 0)}
                >
                  {isSubmitting ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Select your role and branch based on your job function.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
