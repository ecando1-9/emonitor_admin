import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Trash2, Shield, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string;
  created_at: string;
}

export default function SecurityPage() {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    ip_address: '',
    reason: ''
  });

  useEffect(() => {
    loadBlockedIPs();
  }, []);

  const loadBlockedIPs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blocked_ips')
        .select('id, ip_address, reason, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error loading blocked IPs:', error);
        // Table might not exist or no access
        setBlockedIPs([]);
        return;
      }
      setBlockedIPs(data || []);
    } catch (error: any) {
      console.warn('Failed to load blocked IPs:', error);
      setBlockedIPs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlockIP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ip_address) {
      toast({ title: 'Error', description: 'Please enter an IP address' });
      return;
    }

    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(formData.ip_address)) {
      toast({ title: 'Error', description: 'Invalid IP address format' });
      return;
    }

    try {
      const { error } = await supabase
        .from('blocked_ips')
        .insert({
          ip_address: formData.ip_address,
          reason: formData.reason || 'Manual block'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'IP address blocked'
      });

      setFormData({ ip_address: '', reason: '' });
      setIsDialogOpen(false);
      loadBlockedIPs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message
      });
    }
  };

  const unblockIP = async (id: string) => {
    if (!confirm('Unblock this IP address?')) return;

    try {
      const { error } = await supabase
        .from('blocked_ips')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: 'Success',
        description: 'IP address unblocked'
      });
      loadBlockedIPs();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Security Settings</h1>
          <p className="text-muted-foreground">Manage security policies and blocked access</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Block IP
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Block IP Address</DialogTitle>
              <DialogDescription>Prevent access from a specific IP address</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddBlockIP} className="space-y-4">
              <div>
                <Label>IP Address</Label>
                <Input
                  type="text"
                  value={formData.ip_address}
                  onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                  placeholder="192.168.1.1"
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Input
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g., Suspicious activity"
                />
              </div>
              <Button type="submit" className="w-full">Block IP</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Blocked IPs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold">{blockedIPs.length}</div>
              <Shield className="h-5 w-5 text-orange-500 mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Security Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-600">Protected</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">SSL/TLS</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-blue-600">Enabled</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Security Policies */}
      <Card>
        <CardHeader>
          <CardTitle>Security Policies</CardTitle>
          <CardDescription>Configure security settings for the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Session Timeout</p>
                  <p className="text-sm text-muted-foreground">Auto-logout after 30 minutes of inactivity</p>
                </div>
              </div>
              <Badge>Enabled</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Additional security layer for admin access</p>
                </div>
              </div>
              <Badge variant="secondary">Available</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">IP Whitelist</p>
                  <p className="text-sm text-muted-foreground">Restrict access to specific IP ranges</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blocked IPs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Blocked IP Addresses</CardTitle>
          <CardDescription>Manage IP address blocks and restrictions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : blockedIPs.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No blocked IP addresses</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Blocked Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedIPs.map((ip) => (
                    <TableRow key={ip.id}>
                      <TableCell className="font-mono font-bold">{ip.ip_address}</TableCell>
                      <TableCell>{ip.reason}</TableCell>
                      <TableCell>{new Date(ip.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => unblockIP(ip.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Unblock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
