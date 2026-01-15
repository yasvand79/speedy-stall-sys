import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChefHat, Mail, Lock, User, Ticket, AlertCircle, Clock, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateInviteCode } from '@/hooks/useInviteCodes';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const roleLabels: Record<AppRole, string> = {
  developer: 'Developer (Super Admin)',
  central_admin: 'Central Admin',
  branch_admin: 'Branch Admin',
  billing: 'Billing / Cashier',
};

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp, profile } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup fields
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  // Invite code validation state
  const [isValidating, setIsValidating] = useState(false);
  const [codeValidation, setCodeValidation] = useState<{
    valid: boolean;
    role?: AppRole;
    branch_id?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!loading && user && profile) {
      // Check if user is approved
      if (profile.status === 'approved') {
        navigate('/');
      }
    }
  }, [user, loading, navigate, profile]);

  // Validate invite code when it changes
  useEffect(() => {
    const validateCode = async () => {
      if (inviteCode.length >= 8) {
        setIsValidating(true);
        const result = await validateInviteCode(inviteCode);
        setCodeValidation(result);
        setIsValidating(false);
      } else if (inviteCode.length === 0) {
        // No invite code - allowed for billing only
        setCodeValidation(null);
      } else {
        setCodeValidation(null);
      }
    };

    const timeout = setTimeout(validateCode, 500);
    return () => clearTimeout(timeout);
  }, [inviteCode]);

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
    const { error, status } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else {
        toast.error(error.message);
      }
    } else if (status === 'pending') {
      toast.info('Your account is pending approval. Please wait for an admin to approve your registration.');
    } else if (status === 'rejected') {
      toast.error('Your registration was rejected. Please contact an administrator.');
    } else {
      toast.success('Welcome back!');
      navigate('/');
    }
    setIsSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
      if (!signupName.trim()) {
        toast.error('Please enter your full name');
        return;
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    // Determine registration type
    const hasInviteCode = inviteCode.trim().length > 0;
    
    // If invite code provided, validate it
    if (hasInviteCode) {
      if (!codeValidation?.valid) {
        toast.error(codeValidation?.error || 'Invalid invite code');
        return;
      }
    }

    setIsSubmitting(true);
    
    // If no invite code, register as billing with pending status
    // If invite code valid, use the role from the code (auto-approved)
    const role = hasInviteCode && codeValidation?.valid ? codeValidation.role! : 'billing';
    const branchId = hasInviteCode && codeValidation?.valid ? codeValidation.branch_id : undefined;
    
    const { error, autoApproved } = await signUp(
      signupEmail, 
      signupPassword, 
      signupName, 
      role,
      branchId,
      hasInviteCode ? inviteCode : undefined
    );
    
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please login instead.');
      } else {
        toast.error(error.message);
      }
    } else {
      if (autoApproved) {
        toast.success('Registration successful! You can now log in.', {
          duration: 5000,
        });
      } else {
        toast.success('Registration successful! Waiting for admin approval.', {
          duration: 5000,
        });
      }
      // Clear form
      setSignupEmail('');
      setSignupPassword('');
      setSignupName('');
      setInviteCode('');
      setCodeValidation(null);
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

  // Show pending status if user is logged in but pending
  if (user && profile && profile.status !== 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="font-display text-2xl">
                {profile.status === 'pending' ? 'Approval Pending' : 'Registration Rejected'}
              </CardTitle>
              <CardDescription>
                {profile.status === 'pending'
                  ? 'Your registration is waiting for admin approval.'
                  : 'Your registration was rejected. Please contact an administrator.'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              {profile.status === 'pending'
                ? 'You will be able to login once an admin approves your account.'
                : 'If you believe this was a mistake, please reach out to your organization admin.'}
            </p>
            <Button 
              variant="outline" 
              onClick={async () => {
                const { signOut } = useAuth();
                await signOut();
                window.location.reload();
              }}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
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
            <CardDescription>Staff portal - Internal access only</CardDescription>
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
                {/* Invite Code - Optional */}
                <div className="space-y-2">
                  <Label htmlFor="invite-code">Invite Code (optional)</Label>
                  <div className="relative">
                    <Ticket className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="invite-code"
                      type="text"
                      placeholder="Enter invite code if you have one"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="pl-10 font-mono uppercase"
                    />
                  </div>
                  {isValidating && (
                    <p className="text-xs text-muted-foreground">Validating code...</p>
                  )}
                  {inviteCode.length === 0 && (
                    <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-700 dark:text-blue-400 text-sm">
                        Without an invite code, you'll register as Billing Staff and require admin approval.
                      </AlertDescription>
                    </Alert>
                  )}
                  {codeValidation && (
                    codeValidation.valid ? (
                      <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-700 dark:text-green-400 flex flex-col gap-1">
                          <span className="flex items-center gap-2">
                            Valid code! Role: 
                            <Badge variant="outline" className="ml-1">
                              {roleLabels[codeValidation.role!]}
                            </Badge>
                          </span>
                          <span className="text-xs">You'll be approved immediately upon registration.</span>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {codeValidation.error || 'Invalid or expired invite code'}
                        </AlertDescription>
                      </Alert>
                    )
                  )}
                </div>

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

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting || (inviteCode.length > 0 && inviteCode.length < 8)}
                >
                  {isSubmitting ? 'Creating account...' : inviteCode.length > 0 ? 'Register with Invite Code' : 'Register as Billing Staff'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <p className="mt-4 text-center text-xs text-muted-foreground">
            This is a staff-only portal. Contact your administrator for access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}