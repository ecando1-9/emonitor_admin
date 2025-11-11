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
import { Loader2, Edit2, Mail, AlertCircle } from 'lucide-react';

interface UserWithDetails {
  user_id: string;
  email: string;
  plan_id: string;
  plan_name: string;
  status: string;
  trial_ends_at: string;
  device_hash: string;
  trial_count: number;
  sender_email?: string;
}

interface SenderAssignment {
  user_id: string;
  sender_id: string;
  sender_email: string;
  assigned_at: string;
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load users with subscriptions
      const usersData = await secureAPI.getUsersWithSubscriptions();
      setUsers(usersData || []);

      // Load plans
      const plansData = await secureAPI.getPlans();
      setPlans(plansData || []);

      // Load sender assignments
      const { data: sendersData } = await supabase
        .from('sender_assignments')
        .select(`
          id,
          user_id,
          sender_id,
          sender_pool (
            id,
            smtp_email
          )
        `);

      if (sendersData) {
        const formatted = sendersData.map((s: any) => ({
          user_id: s.user_id,
          sender_id: s.sender_id,
          sender_email: s.sender_pool?.smtp_email,
          assigned_at: s.id
        }));
        setSenders(formatted);
      }

      toast({
        title: 'Data Loaded',
        description: `${usersData?.length || 0} users found`
      });
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

      // Update subscription using the secure API
      await secureAPI.upgradePlanSecure(
        selectedUser.user_id,
        newPlan,
        `Plan upgraded from ${selectedUser.plan_id} to ${newPlan}`
      );

      toast({
        title: 'Success',
        description: `User ${selectedUser.email} plan upgraded to ${plans.find(p => p.id === newPlan)?.name}`
      });

      // Reload data
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

  const getSenderEmail = (userId: string) => {
    const sender = senders.find(s => s.user_id === userId);
    return sender?.sender_email || 'Not assigned';
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

      {/* Summary Stats */}
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
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.status === 'active').length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Emails in Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{senders.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table with Management */}
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
                  <TableHead>Email Pool</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {user.plan_name}
                      </span>
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
                    <TableCell>{new Date(user.trial_ends_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="w-4 h-4" />
                        {getSenderEmail(user.user_id)}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{user.device_hash?.slice(0, 12)}...</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upgrade Plan for {user.email}</DialogTitle>
                            <DialogDescription>
                              Current plan: <strong>{user.plan_name}</strong>
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Select New Plan</Label>
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

                            {newPlan && (
                              <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-sm font-medium mb-2">Plan Features:</p>
                                <ul className="text-sm space-y-1">
                                  {plans.find(p => p.id === newPlan)?.features.map((feature) => (
                                    <li key={feature} className="flex items-center">
                                      <span className="mr-2">✓</span>
                                      {feature}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button 
                                onClick={handleUpgradePlan}
                                disabled={upgrading || !newPlan}
                              >
                                {upgrading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Update Plan
                              </Button>
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

      {/* Email Pool Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Email Pool Assignments</CardTitle>
          <CardDescription>View which email is assigned to each user</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Email</TableHead>
                  <TableHead>SMTP Email</TableHead>
                  <TableHead>Assigned At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const sender = senders.find(s => s.user_id === user.user_id);
                  return (
                    <TableRow key={user.user_id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {sender?.sender_email || 'Not assigned'}
                        </div>
                      </TableCell>
                      <TableCell>{sender ? new Date(sender.assigned_at).toLocaleString() : '-'}</TableCell>
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
