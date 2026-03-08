import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers';
import { Search, Plus, Users, Phone, Mail, Star } from 'lucide-react';

export default function Customers() {
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const { data: customers, isLoading } = useCustomers(search || undefined);
  const createCustomer = useCreateCustomer();

  const handleAdd = async () => {
    if (!newName) return;
    await createCustomer.mutateAsync({
      name: newName,
      phone: newPhone || undefined,
      email: newEmail || undefined,
    });
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setAddOpen(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              Customers
            </h1>
            <p className="text-muted-foreground">{customers?.length || 0} customers</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Customer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Customer name" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Phone number" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email address" />
                </div>
                <Button onClick={handleAdd} disabled={!newName || createCustomer.isPending} className="w-full">
                  {createCustomer.isPending ? 'Adding...' : 'Add Customer'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Loyalty Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : customers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No customers found</TableCell>
                  </TableRow>
                ) : (
                  customers?.map(customer => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>
                        {customer.phone ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />{customer.phone}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {customer.email ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />{customer.email}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">{customer.total_orders}</TableCell>
                      <TableCell className="text-right">₹{Number(customer.total_spent).toFixed(0)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3" />{customer.loyalty_points}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
