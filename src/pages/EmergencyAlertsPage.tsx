import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2, RefreshCw, Search, Mail, User, Phone, MapPin, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface EmergencyAlert {
  id: number;
  created_at: string;
  triggered_at?: string;
  user_id: string | null;
  device_hash: string | null;
  last_location: any;
  activity_summary: string | null;
  status: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  notes: string | null;
  // User information
  user_phone: string | null;
  user_email: string | null;
  user_name: string | null;
  device_name: string | null;
  emergency_contacts: any[] | null;
  // Email tracking
  email_sent_to_user: boolean;
  email_sent_to_admin: boolean;
  email_sent_to_user_at: string | null;
  email_sent_to_admin_at: string | null;
  email_details: any;
  // Notification tracking
  users_notified_count: number;
  emergency_contacts_notified_count: number;
  emergency_contacts_notified: any[] | null;
  admins_notified: any[] | null;
}

export default function EmergencyAlertsPage() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();

  useEffect(() => {
    if (isAuthLoading) {
      setLoading(true);
      return;
    }
    if (isAuthenticated) {
      loadAlerts();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isAuthLoading]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading alerts:', error);
        toast({
          title: 'Error Loading Alerts',
          description: error.message,
          variant: 'destructive'
        });
        setAlerts([]);
        return;
      }

      setAlerts(data || []);
    } catch (err: any) {
      console.error('Failed to load alerts:', err);
      toast({
        title: 'Error Loading Alerts',
        description: err.message || 'Failed to load emergency alerts',
        variant: 'destructive'
      });
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = alerts.filter(alert =>
    alert.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.user_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.device_hash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'new':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'acknowledged':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const formatLocation = (location: any) => {
    if (!location) return '-';
    if (typeof location === 'string') return location;
    if (location.latitude && location.longitude) {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }
    return JSON.stringify(location);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Emergency Alerts</h1>
        <p className="text-gray-600 mt-2">Monitor and track all emergency alerts triggered by users</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">New Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {alerts.filter(a => a.status?.toLowerCase() === 'new').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {alerts.filter(a => a.email_sent_to_user || a.email_sent_to_admin).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Contacts Notified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {alerts.reduce((sum, a) => sum + (a.emergency_contacts_notified_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Search</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name, email, phone, device, or status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Button onClick={loadAlerts} variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Alerts</CardTitle>
          <CardDescription>Showing {filteredAlerts.length} of {alerts.length} alerts</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin w-8 h-8" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Triggered</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Email Status</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No alerts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <div>
                              <div>{formatDate(alert.triggered_at || alert.created_at)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{alert.user_name || 'Unknown User'}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {alert.user_email || '-'}
                            </div>
                            {alert.user_phone && (
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {alert.user_phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-mono">{alert.device_hash ? `${alert.device_hash.slice(0, 12)}...` : '-'}</div>
                            {alert.device_name && (
                              <div className="text-xs text-gray-500">{alert.device_name}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(alert.status)}>
                            {alert.status || 'new'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            {formatLocation(alert.last_location)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {alert.email_sent_to_user && (
                              <div className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                User
                              </div>
                            )}
                            {alert.email_sent_to_admin && (
                              <div className="flex items-center gap-1 text-xs text-blue-600">
                                <CheckCircle className="h-3 w-3" />
                                Admin
                              </div>
                            )}
                            {!alert.email_sent_to_user && !alert.email_sent_to_admin && (
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <XCircle className="h-3 w-3" />
                                Not sent
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Users: {alert.users_notified_count || 0}</div>
                            <div className="text-xs text-gray-500">
                              Contacts: {alert.emergency_contacts_notified_count || 0}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedAlert(alert)}
                              >
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Alert Details - #{alert.id}</DialogTitle>
                                <DialogDescription>
                                  Complete information about this emergency alert
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                {/* User Information */}
                                <div className="grid grid-cols-2 gap-4">
                                  <Card>
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-sm">User Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                      <div><strong>Name:</strong> {alert.user_name || '-'}</div>
                                      <div><strong>Email:</strong> {alert.user_email || '-'}</div>
                                      <div><strong>Phone:</strong> {alert.user_phone || '-'}</div>
                                      <div><strong>User ID:</strong> {alert.user_id ? `${alert.user_id.slice(0, 20)}...` : '-'}</div>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-sm">Device Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                      <div><strong>Device Hash:</strong> {alert.device_hash || '-'}</div>
                                      <div><strong>Device Name:</strong> {alert.device_name || '-'}</div>
                                    </CardContent>
                                  </Card>
                                </div>

                                {/* Timestamps */}
                                <Card>
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Timestamps</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2 text-sm">
                                    <div><strong>Created:</strong> {formatDate(alert.created_at)}</div>
                                    <div><strong>Triggered:</strong> {formatDate(alert.triggered_at || alert.created_at)}</div>
                                    {alert.acknowledged_at && (
                                      <div><strong>Acknowledged:</strong> {formatDate(alert.acknowledged_at)}</div>
                                    )}
                                  </CardContent>
                                </Card>

                                {/* Location & Activity */}
                                <Card>
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Location & Activity</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2 text-sm">
                                    <div><strong>Location:</strong> {formatLocation(alert.last_location)}</div>
                                    <div><strong>Activity Summary:</strong> {alert.activity_summary || '-'}</div>
                                  </CardContent>
                                </Card>

                                {/* Email Tracking */}
                                <Card>
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Email Notifications</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-3 text-sm">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          {alert.email_sent_to_user ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <XCircle className="h-4 w-4 text-gray-400" />
                                          )}
                                          <strong>User Email:</strong> {alert.email_sent_to_user ? 'Sent' : 'Not Sent'}
                                        </div>
                                        {alert.email_sent_to_user_at && (
                                          <div className="text-xs text-gray-500 ml-6">
                                            {formatDate(alert.email_sent_to_user_at)}
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          {alert.email_sent_to_admin ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <XCircle className="h-4 w-4 text-gray-400" />
                                          )}
                                          <strong>Admin Email:</strong> {alert.email_sent_to_admin ? 'Sent' : 'Not Sent'}
                                        </div>
                                        {alert.email_sent_to_admin_at && (
                                          <div className="text-xs text-gray-500 ml-6">
                                            {formatDate(alert.email_sent_to_admin_at)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {alert.email_details && Object.keys(alert.email_details).length > 0 && (
                                      <details className="mt-2">
                                        <summary className="cursor-pointer text-blue-600 hover:underline">
                                          View Email Details
                                        </summary>
                                        <pre className="mt-2 bg-gray-50 p-3 rounded text-xs overflow-auto">
                                          {JSON.stringify(alert.email_details, null, 2)}
                                        </pre>
                                      </details>
                                    )}
                                  </CardContent>
                                </Card>

                                {/* Emergency Contacts */}
                                <Card>
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Emergency Contacts</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2 text-sm">
                                    <div><strong>Total Contacts:</strong> {alert.emergency_contacts?.length || 0}</div>
                                    <div><strong>Notified Count:</strong> {alert.emergency_contacts_notified_count || 0}</div>
                                    {alert.emergency_contacts && alert.emergency_contacts.length > 0 && (
                                      <details className="mt-2">
                                        <summary className="cursor-pointer text-blue-600 hover:underline">
                                          View All Contacts
                                        </summary>
                                        <div className="mt-2 space-y-2">
                                          {alert.emergency_contacts.map((contact: any, idx: number) => (
                                            <div key={idx} className="bg-gray-50 p-2 rounded text-xs">
                                              <div><strong>Name:</strong> {contact.name || '-'}</div>
                                              <div><strong>Phone:</strong> {contact.phone || '-'}</div>
                                              <div><strong>Email:</strong> {contact.email || '-'}</div>
                                              {contact.relationship && (
                                                <div><strong>Relationship:</strong> {contact.relationship}</div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    )}
                                    {alert.emergency_contacts_notified && alert.emergency_contacts_notified.length > 0 && (
                                      <details className="mt-2">
                                        <summary className="cursor-pointer text-blue-600 hover:underline">
                                          View Notified Contacts
                                        </summary>
                                        <div className="mt-2 space-y-2">
                                          {alert.emergency_contacts_notified.map((contact: any, idx: number) => (
                                            <div key={idx} className="bg-green-50 p-2 rounded text-xs">
                                              <div><strong>Name:</strong> {contact.name || '-'}</div>
                                              <div><strong>Phone:</strong> {contact.phone || '-'}</div>
                                              {contact.notified_at && (
                                                <div><strong>Notified At:</strong> {formatDate(contact.notified_at)}</div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    )}
                                  </CardContent>
                                </Card>

                                {/* Admins Notified */}
                                {alert.admins_notified && alert.admins_notified.length > 0 && (
                                  <Card>
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-sm">Admins Notified</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-2">
                                        {alert.admins_notified.map((admin: any, idx: number) => (
                                          <div key={idx} className="bg-blue-50 p-2 rounded text-xs">
                                            <div><strong>Admin ID:</strong> {admin.admin_id ? `${admin.admin_id.slice(0, 20)}...` : '-'}</div>
                                            <div><strong>Email:</strong> {admin.email || '-'}</div>
                                            {admin.notified_at && (
                                              <div><strong>Notified At:</strong> {formatDate(admin.notified_at)}</div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}

                                {/* Status & Notes */}
                                <Card>
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Status & Notes</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2 text-sm">
                                    <div><strong>Status:</strong> <Badge className={getStatusColor(alert.status)}>{alert.status || 'new'}</Badge></div>
                                    {alert.acknowledged_by && (
                                      <div><strong>Acknowledged By:</strong> {alert.acknowledged_by.slice(0, 20)}...</div>
                                    )}
                                    {alert.notes && (
                                      <div>
                                        <strong>Notes:</strong>
                                        <div className="mt-1 bg-gray-50 p-2 rounded">{alert.notes}</div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

