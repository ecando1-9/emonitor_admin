import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { secureAPI } from '@/lib/supabase';
import { Loader2, User, Mail, CheckCircle, XCircle } from 'lucide-react';

interface User {
  user_id: string;
  email: string;
  plan_id: string;
  plan_name: string;
  status: string;
  trial_ends_at: string;
  device_hash: string;
  trial_count: number;
}

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [extendingTrial, setExtendingTrial] = useState<string | null>(null);
  const [daysToAdd, setDaysToAdd] = useState(30);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await secureAPI.getUsersWithSubscriptions();
      setUsers(data || []);
      toast({
        title: 'Users Loaded',
        description: `${data?.length || 0} users found`
      });
    } catch (err: any) {
      console.error('Error loading users:', err);
      toast({
        title: 'Error Loading Users',
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExtendTrial = async (userId: string) => {
    try {
      setExtendingTrial(userId);
      const result = await secureAPI.extendTrialSecure(
        userId,
        daysToAdd,
        `Admin extended trial by ${daysToAdd} days`
      );

      if (result) {
        toast({
          title: 'Trial Extended',
          description: `Trial extended by ${daysToAdd} days`
        });
        await loadUsers();
        setDaysToAdd(30);
      }
    } catch (err: any) {
      console.error('Error extending trial:', err);
      toast({
        title: 'Error Extending Trial',
        description: err.message
      });
    } finally {
      setExtendingTrial(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.plan_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case 'trialing':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'suspended':
        return 'bg-red-200 text-red-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users Management</h1>
        <p className="text-gray-600 mt-2">View and manage all users</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.status === 'active').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="Search by email or plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>{filteredUsers.length} users matching criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trial Ends</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </TableCell>
                      <TableCell>{user.plan_name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(user.status)}`}>
                          {user.status}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(user.trial_ends_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs font-mono truncate max-w-xs">{user.device_hash?.slice(0, 16)}...</TableCell>
                      <TableCell>
                        {user.status === 'trialing' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Extend Trial
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Extend Trial for {user.email}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Days to Add</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={daysToAdd}
                                    onChange={(e) => setDaysToAdd(parseInt(e.target.value))}
                                  />
                                </div>
                                <Button
                                  onClick={() => handleExtendTrial(user.user_id)}
                                  disabled={extendingTrial === user.user_id}
                                >
                                  {extendingTrial === user.user_id ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : null}
                                  Extend Trial
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
