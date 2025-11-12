import { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Ban, CheckCircle, ShieldAlert, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase, secureAPI } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';

// Define the Device type based on your schema
interface Device {
  id: string;
  device_hash: string;
  trial_count: number;
  first_seen: string;
  last_seen: string;
  last_user_id: string | null;
  is_blocked: boolean;
  blocked_reason: string | null;
  updated_at: string;
}

type ActionType = 'block' | 'unblock' | 'resetTrial';

interface ActionDialogState {
  open: boolean;
  type: ActionType | null;
  device: Device | null;
}

export default function DevicesPage() {
  const { admin, canDelete } = useAuthStore(); // canDelete maps to SuperAdmin
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'blocked' | 'ok'>('all');
  
  const [actionDialog, setActionDialog] = useState<ActionDialogState>({ open: false, type: null, device: null });
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('last_seen', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load devices',
        // 'variant' property removed as it caused the error
      });
    } finally {
      setLoading(false);
    }
  };

  const openActionDialog = (type: ActionType, device: Device) => {
    setActionDialog({ open: true, type, device });
    setJustification('');
  };

  const closeActionDialog = () => {
    setActionDialog({ open: false, type: null, device: null });
    setJustification('');
  };

  const handleAction = async () => {
    if (!actionDialog.device || !actionDialog.type) return;

    if (!justification.trim()) {
      toast({ title: 'Error', description: 'Justification is required for all device actions' }); // 'variant' property removed
      return;
    }

    try {
      setSubmitting(true);
      const { device, type } = actionDialog;

      switch (type) {
        case 'block':
          await secureAPI.blockDeviceSecure(device.device_hash, justification);
          toast({ title: 'Success', description: 'Device has been blocked' });
          break;
        
        case 'unblock':
          await secureAPI.unblockDeviceSecure(device.device_hash, justification);
          toast({ title: 'Success', description: 'Device has been unblocked' });
          break;
        
        case 'resetTrial':
          await secureAPI.resetDeviceTrialCount(device.device_hash, justification);
          toast({ title: 'Success', description: 'Device trial count has been reset' });
          break;
      }

      closeActionDialog();
      fetchDevices(); 
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Action failed',
        // 'variant' property removed as it caused the error
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (is_blocked: boolean) => {
    if (is_blocked) {
      return <Badge variant="destructive">Blocked</Badge>;
    }
    return <Badge variant="secondary">OK</Badge>;
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.device_hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (device.last_user_id || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'blocked' ? device.is_blocked : !device.is_blocked);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Devices & Trial Management</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and control device-based trial limits
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Devices</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {devices.filter(d => d.is_blocked).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Trial Limit (5+)</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {devices.filter(d => d.trial_count >= 5).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by device hash or user ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ok">OK</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchDevices} variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading devices...</div>
          ) : filteredDevices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No devices found</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device Hash</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trial Count</TableHead>
                    <TableHead>Last User ID</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-mono text-xs">
                        {device.device_hash.substring(0, 20)}...
                      </TableCell>
                      <TableCell>{getStatusBadge(device.is_blocked)}</TableCell>
                      <TableCell>
                        <Badge variant={device.trial_count >= 5 ? "destructive" : "outline"}>
                          {device.trial_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {device.last_user_id ? `${device.last_user_id.substring(0, 12)}...` : 'None'}
                      </TableCell>
                      <TableCell>
                        {new Date(device.last_seen).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {device.is_blocked ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openActionDialog('unblock', device)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Unblock
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-yellow-600 hover:text-yellow-700"
                              onClick={() => openActionDialog('block', device)}
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Block
                            </Button>
                          )}
                          {canDelete() && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => openActionDialog('resetTrial', device)}
                            >
                              Reset Trial
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={actionDialog.open} onOpenChange={closeActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'block' && 'Block Device'}
              {actionDialog.type === 'unblock' && 'Unblock Device'}
              {actionDialog.type === 'resetTrial' && 'Reset Trial Count (SuperAdmin)'}
            </DialogTitle>
            <DialogDescription>
              Device: <span className="font-mono text-xs">{actionDialog.device?.device_hash}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="justification">Justification * (Required for audit)</Label>
              <Textarea
                id="justification"
                placeholder="Enter the reason for this action..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeActionDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleAction} 
              disabled={submitting || !justification.trim()}
              variant={actionDialog.type === 'block' || actionDialog.type === 'resetTrial' ? 'destructive' : 'default'}
            >
              {submitting ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}