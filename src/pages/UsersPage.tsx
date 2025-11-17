import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { secureAPI } from '@/lib/supabase';
import { Loader2, User, Mail, CheckCircle, XCircle, Edit } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface User {
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
}

export default function UsersPage() {
  const { toast } = useToast();
  const { canDelete, isAuthenticated, isLoading: isAuthLoading } = useAuthStore(); 
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isTrialDialogOpen, setIsTrialDialogOpen] = useState(false);
  const [extendingTrial, setExtendingTrial] = useState(false);
  const [daysToAdd, setDaysToAdd] = useState(30);

  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [settingStatus, setSettingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [justification, setJustification] = useState('');

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (isAuthLoading) {
      setLoading(true);
      return;
    }
    if (isAuthenticated) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isAuthLoading]); 

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await secureAPI.getUsersWithSubscriptions();
      setUsers(data || []);
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

  const handleExtendTrial = async () => {
    if (!selectedUser) return;
    try {
      setExtendingTrial(true);
      await secureAPI.extendTrialSecure(
        selectedUser.user_id,
        daysToAdd,
        `Admin extended trial by ${daysToAdd} days`
      );
      toast({
        title: 'Trial Extended',
        description: `Trial extended by ${daysToAdd} days`
      });
      await loadUsers();
      setIsTrialDialogOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error('Error extending trial:', err);
      toast({
        title: 'Error Extending Trial',
        description: err.message
      });
    } finally {
      setExtendingTrial(false);
    }
  };

  const handleSetUserStatus = async () => {
    if (!selectedUser || !newStatus || !justification) {
      toast({ title: 'Error', description: 'Please select a status and provide a justification.' });
      return;
    }
    try {
      setSettingStatus(true);
      await secureAPI.adminSetUserStatusSecure(selectedUser.user_id, newStatus, justification);
      toast({
        title: 'Status Updated',
        description: `User status set to ${newStatus}`
      });
      await loadUsers();
      setIsStatusDialogOpen(false);
      setSelectedUser(null);
      setNewStatus('');
      setJustification('');
    } catch (err: any) {
      console.error('Error setting status:', err);
      toast({
        title: 'Error Setting Status',
        description: err.message
      });
    } finally {
      setSettingStatus(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.plan_name || '').toLowerCase().includes(searchTerm.toLowerCase())
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

  // Helper to format the correct end date
  const getEndDate = (user: User) => {
    if (user.status === 'trialing' && user.trial_ends_at) {
      return `(Trial) ${new Date(user.trial_ends_at).toLocaleDateString()}`;
    }
    if (user.status === 'active' && user.subscription_ends_at) {
      return `(Paid) ${new Date(user.subscription_ends_at).toLocaleDateString()}`;
    }
    return '—'; // No end date for expired, suspended, etc.
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
        <p className="text-gray-600 mt-2">View and manage all users and their status</p>
      </div>

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
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
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
                      {/* *** LOGIC FIX HERE *** */}
                      <TableCell>
                        {user.status === 'trialing' ? (
                          <span className="text-muted-foreground italic">N/A (Trial)</span>
                        ) : (
                          user.plan_name || 'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(user.status)}`}>
                          {user.status}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      {/* *** LOGIC FIX HERE *** */}
                      <TableCell>{getEndDate(user)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {user.status === 'trialing' && (
                            <Button variant="outline" size="sm" onClick={() => {
                              setSelectedUser(user);
                              setIsTrialDialogOpen(true);
                            }}>
                              Extend Trial
                            </Button>
                          )}
                          {canDelete() && ( 
                            <Button variant="secondary" size="sm" onClick={() => {
                              setSelectedUser(user);
                              setNewStatus(user.status);
                              setIsStatusDialogOpen(true);
                            }}>
                              <Edit className="w-4 h-4 mr-1" />
                              Set Status
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Extend Trial Dialog */}
      <Dialog open={isTrialDialogOpen} onOpenChange={setIsTrialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Trial for {selectedUser?.email}</DialogTitle>
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
              onClick={handleExtendTrial}
              disabled={extendingTrial}
              className="w-full"
            >
              {extendingTrial ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Extension
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Set Status Dialog (SuperAdmin only) */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Status for {selectedUser?.email}</DialogTitle>
            <DialogDescription>
              Warning: This is a powerful action that overrides all subscription logic.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trialing">Trialing (Resets trial to 30 days)</SelectItem>
                  <SelectItem value="active">Active (Sets paid plan for 1 month)</SelectItem>
                  <SelectItem value="suspended">Suspended (Blocks access)</SelectItem>
                  <SelectItem value="expired">Expired (Blocks access)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Justification (Required)</Label>
              <Textarea
                placeholder="Why are you manually changing this status?"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
              />
            </div>
            <Button
              variant="destructive"
              onClick={handleSetUserStatus}
              disabled={settingStatus || !justification || !newStatus}
              className="w-full"
            >
              {settingStatus ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Status Change
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}