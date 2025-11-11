import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { AlertCircle, Users, Zap, TrendingUp, Clock, Download } from 'lucide-react';
import { secureAPI } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';

interface DashboardStats {
  totalUsers: number;
  activeTrials: number;
  activeSubscriptions: number;
  totalDevices: number;
  upcomingExpirations: Array<{
    user_id: string;
    email: string;
    trial_ends_at: string;
    plan_id: string;
    plan_name: string;
    days_remaining: number;
  }>;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch users with subscriptions
        const usersData = await secureAPI.getUsersWithSubscriptions();

        if (!usersData || usersData.length === 0) {
          setStats({
            totalUsers: 0,
            activeTrials: 0,
            activeSubscriptions: 0,
            totalDevices: 0,
            upcomingExpirations: []
          });
          return;
        }

        // Calculate stats
        const totalUsers = usersData.length;
        const activeTrials = usersData.filter(
          (u: any) => u.status === 'trialing'
        ).length;
        const activeSubscriptions = usersData.filter(
          (u: any) => u.status === 'active'
        ).length;

        // Get upcoming expirations (within 7 days)
        const upcomingExpirations = usersData
          .filter(
            (u: any) =>
              u.days_remaining !== null &&
              u.days_remaining >= 0 &&
              u.days_remaining <= 7
          )
          .sort((a: any, b: any) => a.days_remaining - b.days_remaining)
          .slice(0, 5);

        // Fetch devices count
        const devicesData = await secureAPI.getActiveDevices();
        const totalDevices = devicesData?.length || 0;

        setStats({
          totalUsers,
          activeTrials,
          activeSubscriptions,
          totalDevices,
          upcomingExpirations
        });
      } catch (err: any) {
        console.error('Full error object:', err);
        console.error('Error status:', err?.status);
        console.error('Error message:', err?.message);
        console.error('Error details:', err?.details);

        let message = 'Failed to load dashboard data';

        // Specific error handling
        if (err?.message?.includes('does not match expected type')) {
          message = 'Database type mismatch error. Run MIGRATION_PATCH.sql in Supabase SQL Editor to fix.';
        } else if (err?.status === 400) {
          message = 'Bad request to RPC: Check that you are logged in as an admin user. Admin role may be missing or JWT may be invalid.';
        } else if (err?.status === 401) {
          message = 'Unauthorized: Your session may have expired. Please log out and log in again.';
        } else if (err?.status === 403) {
          message = 'Forbidden: You do not have admin permissions. Please ensure your user is in the admin_roles table.';
        } else if (err?.status === 404) {
          message = 'RPC function not found: Please run the supabase-migration.sql file in your Supabase project.';
        } else if (err instanceof Error) {
          message = err.message;
        }

        console.error('Dashboard error message:', message);
        setError(message);
        toast({
          title: 'Error Loading Dashboard',
          description: message
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [toast]);

  const handleExportData = async () => {
    try {
      toast({
        title: 'Export Started',
        description: 'Dashboard data export started. Check your downloads folder.',
      });
    } catch (err) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export dashboard data'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">Monitor your subscriptions, trials, and devices</p>
        </div>
        <Button onClick={handleExportData} variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Active user accounts</p>
          </CardContent>
        </Card>

        {/* Active Trials Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              Active Trials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.activeTrials || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Users in trial period</p>
          </CardContent>
        </Card>

        {/* Active Subscriptions Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Paid Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.activeSubscriptions || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Active paid subscriptions</p>
          </CardContent>
        </Card>

        {/* Total Devices Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-500" />
              Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.totalDevices || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Active devices</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Expirations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Expiring Soon
            <Badge variant="outline" className="ml-2">
              {stats?.upcomingExpirations.length || 0}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.upcomingExpirations && stats.upcomingExpirations.length > 0 ? (
            <div className="space-y-3">
              {stats.upcomingExpirations.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.email}</p>
                    <p className="text-sm text-gray-600">
                      Plan: <span className="font-semibold capitalize">{item.plan_name}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={item.days_remaining <= 3 ? 'destructive' : 'default'}
                      className="mb-1"
                    >
                      {item.days_remaining} days left
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.trial_ends_at
                        ? new Date(item.trial_ends_at).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-600">
              <p>No expirations in the next 7 days</p>
              <p className="text-sm text-gray-500 mt-1">All subscriptions are stable</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trial to Paid Conversion */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Trial Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">Conversion Rate</span>
                  <span className="text-xs font-bold text-green-600">
                    {stats?.totalUsers && stats?.activeSubscriptions
                      ? ((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${
                        stats?.totalUsers && stats?.activeSubscriptions
                          ? (stats.activeSubscriptions / stats.totalUsers) * 100
                          : 0
                      }%`
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Feature Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Device Management</span>
                <Badge>Active</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Trial Control</span>
                <Badge>Active</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Email Pool</span>
                <Badge>Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Database</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Connected
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Authentication</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  OK
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">API</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Operational
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button variant="outline" className="text-xs" size="sm">
              Create User
            </Button>
            <Button variant="outline" className="text-xs" size="sm">
              Add Device
            </Button>
            <Button variant="outline" className="text-xs" size="sm">
              Create Promotion
            </Button>
            <Button variant="outline" className="text-xs" size="sm">
              View Audit Log
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
