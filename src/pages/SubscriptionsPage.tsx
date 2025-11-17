import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase, secureAPI } from '@/lib/supabase';
import { Loader2, Edit2, Mail, AlertCircle, Sparkles, Ticket } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store'; 
import { Separator } from '@/components/ui/separator';

interface UserWithDetails {
  user_id: string;
  email: string;
  plan_id: string;
  plan_name: string;
  status: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null; 
  created_at: string; 
  device_hash: string;
  trial_count: number;
  sender_email?: string;
}

interface SenderAssignment {
  user_id: string;
  sender_id: string;
  sender_email: string;
  assigned_at: string; // This will now be a valid date string
}

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

export default function SubscriptionsPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [senders, setSenders] = useState<SenderAssignment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [newPlan, setNewPlan] = useState<string>('');
  const [upgrading, setUpgrading] = useState(false);
  const [assigningEmail, setAssigningEmail] = useState<string | null>(null); 
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore(); 

  const [promoCode, setPromoCode] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);

  useEffect(() => {
    if (isAuthLoading) {
      setLoading(true);
      return;
    }
    if (isAuthenticated) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isAuthLoading]); 

  const loadData = async () => {
    try {
      setLoading(true);

      const usersData = await secureAPI.getUsersWithSubscriptions();
      setUsers(usersData || []);

      const plansData = await secureAPI.getPlans();
      setPlans(plansData || []);

      // *** BUG FIX IS HERE ***
      // 1. Added "assigned_at" to the select query
      const { data: sendersData } = await supabase
        .from('sender_assignments')
        .select(`
          id,
          user_id,
          sender_id,
          assigned_at, 
          sender_pool (
            id,
            smtp_email
          )
        `);

      if (sendersData) {
        // 2. Used "s.assigned_at" instead of "s.id"
        const formatted = sendersData.map((s: any) => ({
          user_id: s.user_id,
          sender_id: s.sender_id,
          sender_email: s.sender_pool?.smtp_email,
          assigned_at: s.assigned_at // <-- This is the fix
        }));
        setSenders(formatted);
      }
    } catch (err: any) {
      console.error('Load error:', err);
      toast({
        title: 'Error Loading Data',
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePlan = async () => {
    if (!selectedUser || !newPlan) return;

    try {
      setUpgrading(true);
      await secureAPI.upgradePlanSecure(
        selectedUser.user_id,
        newPlan,
        `Plan upgraded from ${selectedUser.plan_id} to ${newPlan}`
      );
      toast({
        title: 'Success',
        description: `User ${selectedUser.email} plan upgraded to ${plans.find(p => p.id === newPlan)?.name}`
      });
      await loadData();
      setSelectedUser(null);
      setNewPlan('');
    } catch (err: any) {
      console.error('Upgrade error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to upgrade plan'
      });
    } finally {
      setUpgrading(false);
    }
  };

  const handleAssignEmail = async (userId: string) => {
    setAssigningEmail(userId);
    try {
      const result: any = await secureAPI.assignSenderSecure(userId);
      toast({
        title: 'Success',
        description: `Email ${result.sender_email} assigned to user.`
      });
      await loadData(); 
    } catch (err: any) {
      console.error('Email assignment error:', err);
      toast({
        title: 'Error Assigning Email',
        description: err.message,
      });
    } finally {
      setAssigningEmail(null);
    }
  };
  
  const handleApplyPromo = async () => {
    if (!selectedUser || !promoCode) return;

    setApplyingPromo(true);
    try {
      const result: any = await secureAPI.applyPromotionSecure(selectedUser.user_id, promoCode);
      toast({
        title: 'Promotion Applied',
        description: `Code ${result.promo_code} applied to user.`
      });
      await loadData(); 
      setPromoCode(''); 
    } catch (err: any) {
      console.error('Promo apply error:', err);
      toast({
        title: 'Error Applying Promotion',
        description: err.message,
      });
    } finally {
      setApplyingPromo(false);
    }
  };

  const getSenderEmail = (userId: string) => {
    const sender = senders.find(s => s.user_id === userId);
    return sender?.sender_email || null; 
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        <p className="text-gray-600 mt-2">Manage user subscriptions, plans, and email assignments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.status === 'trialing').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Plans (Paid)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.status === 'active').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Emails Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{senders.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users & Subscriptions</CardTitle>
          <CardDescription>View and manage user subscriptions and email assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trial Ends</TableHead>
                  <TableHead>Subscription Ends</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      {user.status === 'trialing' ? (
                          <span className="text-muted-foreground italic">N/A (Trial)</span>
                        ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {user.plan_name || 'N/A'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                        user.status === 'trialing' ? 'bg-yellow-100 text-yellow-800' :
                        user.status === 'active' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.trial_ends_at ? new Date(user.trial_ends_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      {user.subscription_ends_at ? new Date(user.subscription_ends_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewPlan(user.plan_id); 
                              setPromoCode(''); 
                            }}
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Manage {user.email}</DialogTitle>
                            <DialogDescription>
                              Current status: <strong>{user.status}</strong>
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Upgrade Plan</Label>
                              <Select value={newPlan} onValueChange={setNewPlan}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a plan" />
                                </SelectTrigger>
                                <SelectContent>
                                  {plans.map((plan) => (
                                    <SelectItem key={plan.id} value={plan.id}>
                                      {plan.name} - ${plan.price}/month
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button 
                              onClick={handleUpgradePlan}
                              disabled={upgrading || !newPlan || (newPlan === user.plan_id && user.status === 'active')}
                              className="w-full"
                            >
                              {upgrading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                              {user.status === 'trialing' ? 'Activate Plan' : (newPlan === user.plan_id ? 'Already on this Plan' : 'Change Plan')}
                            </Button>

                            <Separator className="my-4" />

                            <div className="space-y-2">
                              <Label>Apply Promotion</Label>
                              <p className="text-sm text-muted-foreground">
                                Manually apply a promo code (e.g., for trial days).
                              </p>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Enter promo code"
                                  value={promoCode}
                                  onChange={(e) => setPromoCode(e.target.value)}
                                  disabled={applyingPromo}
                                />
                                <Button
                                  variant="secondary"
                                  onClick={handleApplyPromo}
                                  disabled={applyingPromo || !promoCode}
                                >
                                  {applyingPromo ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Ticket className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Pool Assignments</CardTitle>
          <CardDescription>View and assign an email from the pool to a user</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Email</TableHead>
                  <TableHead>SMTP Email</TableHead>
                  <TableHead>Assigned At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const sender = senders.find(s => s.user_id === user.user_id);
                  const isLoading = assigningEmail === user.user_id;
                  
                  return (
                    <TableRow key={user.user_id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {sender?.sender_email || (
                            <span className="text-muted-foreground italic">Not assigned</span>
                          )}
                        </div>
                      </TableCell>
                      {/* *** BUG FIX IS HERE *** */}
                      {/* This will now show the correct date */}
                      <TableCell>{sender ? new Date(sender.assigned_at).toLocaleString() : '—'}</TableCell>
                      <TableCell className="text-right">
                        {!sender && (
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handleAssignEmail(user.user_id)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-1" />
                            )}
                            Assign
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
