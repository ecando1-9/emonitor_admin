import { useState, useEffect } from 'react';
import { 
  Bell, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle, 
  MapPin, 
  Clock,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';

interface EmergencyAlert {
  id: string;
  user_id: string;
  user_email: string;
  device_name: string;
  status: 'new' | 'acknowledged' | 'resolved';
  triggered_at: string;
  location_lat?: number;
  location_lng?: number;
  details?: any;
}

export default function EmergencyAlertsPage() {
  const { admin } = useAuthStore();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (admin) {
      fetchAlerts();
    }
  }, [admin]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select('*')
        .order('triggered_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      // Re-applying fix: Removed 'variant' property to resolve TS2353 error
      toast({
        title: 'Error',
        description: error.message || 'Failed to load alerts',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      setProcessingId(alertId);
      const { error } = await supabase
        .from('emergency_alerts')
        .update({ status: 'acknowledged' })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: 'Acknowledged',
        description: 'The alert status has been updated.',
      });
      
      fetchAlerts();
    } catch (error: any) {
      // Re-applying fix: Removed 'variant' property to resolve TS2353 error
      toast({
        title: 'Action Failed',
        description: error.message || 'Could not update alert status',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="destructive" className="animate-pulse">NEW</Badge>;
      case 'acknowledged':
        return <Badge className="bg-blue-500 hover:bg-blue-600">ACKNOWLEDGED</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="text-green-600 border-green-600">RESOLVED</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8 text-red-600" />
            Emergency Alerts
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring of SOS triggers and safety breaches
          </p>
        </div>
        <Button onClick={fetchAlerts} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Unresolved Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {alerts.filter(a => a.status !== 'resolved').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent SOS Triggers</CardTitle>
          <CardDescription>View and manage incoming emergency signals</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground italic">Fetching alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No emergency alerts recorded.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>User Email</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id} className={alert.status === 'new' ? "bg-red-50/30" : ""}>
                      <TableCell>{getStatusBadge(alert.status)}</TableCell>
                      <TableCell className="font-medium">{alert.user_email}</TableCell>
                      <TableCell className="text-sm">{alert.device_name || 'Unknown Device'}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {new Date(alert.triggered_at).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {alert.location_lat ? (
                          <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                            <a 
                              href={`https://www.google.com/maps?q=${alert.location_lat},${alert.location_lng}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center gap-1"
                            >
                              <MapPin className="h-3 w-3" />
                              View Map
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic text-center">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {alert.status === 'new' ? (
                          <Button 
                            size="sm" 
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={processingId === alert.id}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Acknowledge
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" disabled>
                            Handled
                          </Button>
                        )}
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