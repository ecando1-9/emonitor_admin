import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Mail, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase, secureAPI } from '@/lib/supabase'; // Import secureAPI
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';

interface EmailEntry {
  id: string;
  email: string;
  smtp_host: string;
  smtp_port: number;
  username: string;
  is_active: boolean;
  created_at: string;
}

export default function EmailPoolPage() {
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore(); // Get auth state

  const [formData, setFormData] = useState({
    email: '',
    smtp_server: 'smtp.gmail.com',
    smtp_port: 587,
    username: '',
    password: ''
  });

  useEffect(() => {
    // Auth guard
    if (isAuthLoading) {
      setLoading(true);
      return;
    }
    if (isAuthenticated) {
      loadEmails();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isAuthLoading]); // Dependency on auth state

  const loadEmails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sender_pool')
        .select('id, smtp_email, smtp_server, smtp_port, assigned_count, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error loading emails:', error);
        setEmails([]);
        return;
      }
      
      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        email: item.smtp_email,
        smtp_host: item.smtp_server,
        smtp_port: item.smtp_port,
        username: item.smtp_email,
        is_active: item.is_active,
        created_at: item.created_at
      }));
      setEmails(mappedData);
    } catch (error: any) {
      console.warn('Failed to load email pool:', error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  // *** THIS FUNCTION IS NOW FIXED ***
  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.username || !formData.password) {
      toast({ title: 'Error', description: 'Please fill in all fields' });
      return;
    }

    try {
      // Use the secure RPC function instead of a direct insert
      await secureAPI.add_sender_secure(
        formData.email,
        formData.smtp_server,
        formData.smtp_port,
        formData.password
      );

      toast({
        title: 'Success',
        description: 'Email added to pool'
      });

      setFormData({
        email: '',
        smtp_server: 'smtp.gmail.com',
        smtp_port: 587,
        username: '',
        password: ''
      });
      setIsDialogOpen(false);
      loadEmails();
    } catch (error: any) {
      toast({
        title: 'Error Adding Email',
        description: error.message
      });
    }
  };

  const toggleEmailStatus = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('sender_pool')
        .update({ is_active: !current })
        .eq('id', id);

      if (error) throw error;
      loadEmails();
      toast({
        title: 'Success',
        description: `Email ${!current ? 'activated' : 'deactivated'}`
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeCount = emails.filter(e => e.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Email Pool</h1>
          <p className="text-muted-foreground">Manage SMTP email accounts for sending</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Email
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Email to Pool</DialogTitle>
              <DialogDescription>Add a new SMTP email account</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddEmail} className="space-y-4">
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="sender@example.com"
                />
              </div>
              <div>
                <Label>SMTP Server</Label>
                <Input
                  value={formData.smtp_server}
                  onChange={(e) => setFormData({ ...formData, smtp_server: e.target.value })}
                />
              </div>
              <div>
                <Label>SMTP Port</Label>
                <Input
                  type="number"
                  value={formData.smtp_port}
                  onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Username</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="smtp username"
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="smtp password"
                />
              </div>
              <Button type="submit" className="w-full">Add to Pool</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Emails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emails.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{emails.length - activeCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Accounts</CardTitle>
          <CardDescription>Manage SMTP credentials</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : emails.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No emails in pool. Add one to get started.</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>SMTP Server</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-500" />
                        {email.email}
                        <button
                          onClick={() => copyToClipboard(email.email, email.id)}
                          className="ml-2 p-1 hover:bg-gray-200 rounded"
                        >
                          {copiedId === email.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>{email.smtp_host}</TableCell>
                      <TableCell>{email.smtp_port}</TableCell>
                      <TableCell>
                        <Badge variant={email.is_active ? 'default' : 'secondary'}>
                          {email.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(email.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleEmailStatus(email.id, email.is_active)}
                        >
                          {email.is_active ? 'Deactivate' : 'Activate'}
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