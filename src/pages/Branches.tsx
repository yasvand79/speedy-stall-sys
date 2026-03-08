import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useBranches } from '@/hooks/useBranches';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Plus, 
  Edit, 
  Loader2,
  Hash
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Branches() {
  const { branches, isLoading, createBranch, updateBranch, toggleBranchStatus, isCreating, isUpdating } = useBranches();
  const { isAdmin } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<typeof branches[0] | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    code: '',
    phone: '',
    email: '',
  });

  const handleOpenDialog = (branch?: typeof branches[0]) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        location: branch.location,
        code: branch.code,
        phone: branch.phone || '',
        email: branch.email || '',
      });
    } else {
      setEditingBranch(null);
      setFormData({
        name: '',
        location: '',
        code: '',
        phone: '',
        email: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingBranch) {
      updateBranch({
        id: editingBranch.id,
        ...formData,
      });
    } else {
      createBranch(formData);
    }
    
    setIsDialogOpen(false);
  };

  const handleToggleStatus = (branch: typeof branches[0]) => {
    toggleBranchStatus({ id: branch.id, is_active: !branch.is_active });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Branch Management</h1>
            <p className="text-muted-foreground">
              {branches.filter(b => b.is_active).length} active branches • {branches.length} total
            </p>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Branch
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
                  <DialogDescription>
                    {editingBranch ? 'Update branch details below.' : 'Enter branch details to create a new branch.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Branch Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Main Branch"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Branch Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="MAIN"
                      required
                      disabled={!!editingBranch}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="123 Main Street, Downtown"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (Optional)</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="branch@example.com"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating || isUpdating}>
                      {isCreating || isUpdating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {editingBranch ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Branches Grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {branches.map((branch) => (
            <Card key={branch.id} className={!branch.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{branch.name}</CardTitle>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        {branch.code}
                      </div>
                    </div>
                  </div>
                  <Badge variant={branch.is_active ? 'default' : 'secondary'}>
                    {branch.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{branch.location}</span>
                </div>
                {branch.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{branch.phone}</span>
                  </div>
                )}
                {branch.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span>{branch.email}</span>
                  </div>
                )}
                
                {isAdmin && (
                  <div className="flex gap-2 pt-3 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleOpenDialog(branch)}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button 
                      variant={branch.is_active ? 'destructive' : 'default'}
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleToggleStatus(branch)}
                    >
                      {branch.is_active ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {branches.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium text-foreground">No branches yet</h3>
            <p className="mt-2 text-muted-foreground">
              Get started by creating your first branch.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
