import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Users,
    Smartphone,
    Search,
    Eye,
    Ban,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Loader2,
    Monitor,
    Tablet,
    Laptop,
    Activity,
    UserX,
    Info
} from 'lucide-react';
import { secureAPI } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';

interface MultiDeviceUser {
    user_id: string;
    email: string;
    device_count: number;
    devices: Array<{
        device_hash: string;
        last_active: string;
        session_id: string | null;
    }>;
    is_active: boolean;
    last_login: string;
}

interface UserSession {
    user_id: string;
    email: string;
    device_hash: string;
    session_id: string | null;
    last_active: string;
    is_current: boolean;
}

export default function MultiDeviceLoginsPage() {
    const [multiDeviceUsers, setMultiDeviceUsers] = useState<MultiDeviceUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<MultiDeviceUser | null>(null);
    const [userSessions, setUserSessions] = useState<UserSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [minDevices, setMinDevices] = useState(2);

    const { toast } = useToast();
    const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();

    useEffect(() => {
        if (isAuthLoading) {
            setLoading(true);
            return;
        }
        if (isAuthenticated) {
            loadMultiDeviceUsers();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated, isAuthLoading, minDevices]);

    const loadMultiDeviceUsers = async () => {
        try {
            setLoading(true);
            const data = await secureAPI.getMultiDeviceLogins(minDevices);
            setMultiDeviceUsers(data || []);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to load multi-device users: ' + error.message,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const loadUserSessions = async (userId: string) => {
        try {
            setLoadingSessions(true);
            const data = await secureAPI.getUserSessions(userId);
            setUserSessions(data || []);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to load user sessions: ' + error.message,
                variant: 'destructive'
            });
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleTerminateSession = async (userId: string, deviceHash: string) => {
        try {
            await secureAPI.terminateUserSession(userId, deviceHash);
            toast({
                title: 'Success',
                description: 'Session terminated successfully',
            });
            loadUserSessions(userId);
            loadMultiDeviceUsers();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to terminate session: ' + error.message,
                variant: 'destructive'
            });
        }
    };

    const handleSuspendUser = async (userId: string, reason: string) => {
        try {
            await secureAPI.adminSetUserStatusSecure(userId, 'suspended', reason);
            toast({
                title: 'Success',
                description: 'User account suspended',
            });
            loadMultiDeviceUsers();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to suspend user: ' + error.message,
                variant: 'destructive'
            });
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(date);
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const getDeviceIcon = (index: number) => {
        const icons = [Monitor, Laptop, Tablet, Smartphone];
        const Icon = icons[index % icons.length];
        return <Icon className="h-4 w-4" />;
    };

    const filteredUsers = multiDeviceUsers.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalMultiDeviceUsers = multiDeviceUsers.length;
    const totalDevices = multiDeviceUsers.reduce((sum, user) => sum + user.device_count, 0);
    const avgDevicesPerUser = totalMultiDeviceUsers > 0
        ? (totalDevices / totalMultiDeviceUsers).toFixed(1)
        : '0';
    const suspendedUsers = multiDeviceUsers.filter(user => !user.is_active).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Multi-Device Logins</h1>
                            <p className="text-muted-foreground">Monitor users logged in on multiple devices</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Alert */}
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                    This page shows users who are currently logged in on {minDevices}+ devices simultaneously. This can help detect account sharing or unauthorized access.
                </AlertDescription>
            </Alert>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Multi-Device Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2">
                            <div className="text-3xl font-bold text-purple-600">{totalMultiDeviceUsers}</div>
                            <Users className="h-5 w-5 text-purple-500 mb-1" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Active Devices</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2">
                            <div className="text-3xl font-bold text-blue-600">{totalDevices}</div>
                            <Smartphone className="h-5 w-5 text-blue-500 mb-1" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg Devices/User</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2">
                            <div className="text-3xl font-bold text-green-600">{avgDevicesPerUser}</div>
                            <Activity className="h-5 w-5 text-green-500 mb-1" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Suspended</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2">
                            <div className="text-3xl font-bold">{suspendedUsers}</div>
                            <UserX className="h-5 w-5 text-muted-foreground mb-1" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search by Email</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search email addresses..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Minimum Devices</label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    min="2"
                                    value={minDevices}
                                    onChange={(e) => setMinDevices(parseInt(e.target.value) || 2)}
                                    className="w-24"
                                />
                                <Button onClick={loadMultiDeviceUsers} variant="outline">
                                    Apply
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Multi-Device Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Multi-Device Users ({filteredUsers.length})</CardTitle>
                    <CardDescription>
                        Users logged in on {minDevices} or more devices simultaneously
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                            <p className="text-muted-foreground mt-2">Loading multi-device users...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-900 dark:text-green-100">
                                {searchTerm ? 'No users match your search.' : `No users logged in on ${minDevices}+ devices. All clear! 🎉`}
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead className="text-center">Active Devices</TableHead>
                                        <TableHead>Last Login</TableHead>
                                        <TableHead>Last Active</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map((user) => (
                                        <TableRow key={user.user_id} className={!user.is_active ? 'bg-red-50 dark:bg-red-950/10' : ''}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {user.device_count >= 5 && (
                                                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                                                    )}
                                                    {user.email}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant={user.device_count >= 5 ? 'destructive' : user.device_count >= 3 ? 'default' : 'secondary'}
                                                    className="font-bold gap-1"
                                                >
                                                    <Smartphone className="h-3 w-3" />
                                                    {user.device_count}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {user.last_login ? formatDate(user.last_login) : 'Never'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                    <span>
                                                        {user.devices[0]?.last_active
                                                            ? getTimeAgo(user.devices[0].last_active)
                                                            : 'Unknown'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {!user.is_active ? (
                                                    <Badge variant="destructive" className="gap-1">
                                                        <Ban className="h-3 w-3" />
                                                        Suspended
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="default" className="gap-1 bg-green-600">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Active
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                loadUserSessions(user.user_id);
                                                            }}
                                                            className="gap-2"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            View Sessions
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle className="flex items-center gap-2">
                                                                <Activity className="h-5 w-5" />
                                                                Active Sessions: {selectedUser?.email}
                                                            </DialogTitle>
                                                            <DialogDescription>
                                                                All active device sessions for this user
                                                            </DialogDescription>
                                                        </DialogHeader>

                                                        {loadingSessions ? (
                                                            <div className="text-center py-8">
                                                                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                                                                    <div>
                                                                        <p className="text-sm text-muted-foreground">Total Devices</p>
                                                                        <p className="text-2xl font-bold">{userSessions.length}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm text-muted-foreground">Active Now</p>
                                                                        <p className="text-2xl font-bold text-green-600">
                                                                            {userSessions.filter(s => {
                                                                                const lastActive = new Date(s.last_active);
                                                                                const now = new Date();
                                                                                const diffMins = (now.getTime() - lastActive.getTime()) / 60000;
                                                                                return diffMins < 5;
                                                                            }).length}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm text-muted-foreground">Account Status</p>
                                                                        <p className="text-sm font-bold">
                                                                            {selectedUser?.is_active ? (
                                                                                <Badge variant="default" className="bg-green-600">Active</Badge>
                                                                            ) : (
                                                                                <Badge variant="destructive">Suspended</Badge>
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    {userSessions.map((session, index) => {
                                                                        const lastActive = new Date(session.last_active);
                                                                        const now = new Date();
                                                                        const diffMins = (now.getTime() - lastActive.getTime()) / 60000;
                                                                        const isActive = diffMins < 5;

                                                                        return (
                                                                            <div
                                                                                key={session.device_hash}
                                                                                className={`p-4 rounded-lg border ${isActive ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-gray-200'}`}
                                                                            >
                                                                                <div className="flex items-start justify-between">
                                                                                    <div className="flex items-start gap-3 flex-1">
                                                                                        <div className="p-2 rounded-lg bg-background">
                                                                                            {getDeviceIcon(index)}
                                                                                        </div>
                                                                                        <div className="flex-1">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <h4 className="font-semibold">Device {index + 1}</h4>
                                                                                                {isActive && (
                                                                                                    <Badge variant="default" className="bg-green-600 text-xs">
                                                                                                        Active Now
                                                                                                    </Badge>
                                                                                                )}
                                                                                                {session.is_current && (
                                                                                                    <Badge variant="outline" className="text-xs">
                                                                                                        Current
                                                                                                    </Badge>
                                                                                                )}
                                                                                            </div>
                                                                                            <p className="text-xs text-muted-foreground font-mono mt-1">
                                                                                                {session.device_hash.substring(0, 16)}...
                                                                                            </p>
                                                                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                                                                <div className="flex items-center gap-1">
                                                                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                                                                    <span className="text-muted-foreground">
                                                                                                        Last active: {getTimeAgo(session.last_active)}
                                                                                                    </span>
                                                                                                </div>
                                                                                                {session.session_id && (
                                                                                                    <div className="text-xs text-muted-foreground">
                                                                                                        Session: {session.session_id.substring(0, 8)}...
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <Button
                                                                                        variant="destructive"
                                                                                        size="sm"
                                                                                        onClick={() => handleTerminateSession(session.user_id, session.device_hash)}
                                                                                        className="gap-1"
                                                                                    >
                                                                                        <Ban className="h-3 w-3" />
                                                                                        Terminate
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {selectedUser && selectedUser.is_active && (
                                                                    <div className="pt-4 border-t">
                                                                        <Button
                                                                            variant="destructive"
                                                                            onClick={() => handleSuspendUser(selectedUser.user_id, 'Multiple device usage detected')}
                                                                            className="w-full gap-2"
                                                                        >
                                                                            <UserX className="h-4 w-4" />
                                                                            Suspend User Account
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </DialogContent>
                                                </Dialog>
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
