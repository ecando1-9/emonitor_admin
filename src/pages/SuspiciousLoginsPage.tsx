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
    AlertTriangle,
    Shield,
    Search,
    Eye,
    Ban,
    CheckCircle2,
    XCircle,
    Clock,
    MapPin,
    Smartphone,
    Loader2,
    TrendingUp,
    Users,
    Activity
} from 'lucide-react';
import { secureAPI } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';

interface SuspiciousAccount {
    email: string;
    failed_attempts: number;
    last_attempt: string;
    ip_addresses: string[];
    device_hashes: string[];
    is_blocked: boolean;
}

interface LoginAttempt {
    id: string;
    email: string;
    device_hash: string | null;
    attempt_time: string;
    success: boolean;
    ip_address: string | null;
}

export default function SuspiciousLoginsPage() {
    const [suspiciousAccounts, setSuspiciousAccounts] = useState<SuspiciousAccount[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
    const [loginHistory, setLoginHistory] = useState<LoginAttempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [minAttempts, setMinAttempts] = useState(5);

    const { toast } = useToast();
    const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();

    useEffect(() => {
        if (isAuthLoading) {
            setLoading(true);
            return;
        }
        if (isAuthenticated) {
            loadSuspiciousAccounts();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated, isAuthLoading, minAttempts]);

    const loadSuspiciousAccounts = async () => {
        try {
            setLoading(true);
            const data = await secureAPI.getSuspiciousLogins(minAttempts);
            setSuspiciousAccounts(data || []);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to load suspicious accounts: ' + error.message,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const loadLoginHistory = async (email: string) => {
        try {
            setLoadingHistory(true);
            const data = await secureAPI.getLoginHistory(email);
            setLoginHistory(data || []);
            setSelectedEmail(email);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to load login history: ' + error.message,
                variant: 'destructive'
            });
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleBlockIP = async (ipAddress: string) => {
        try {
            await secureAPI.addBlockedIPSecure(ipAddress, 'Suspicious login activity detected');
            toast({
                title: 'Success',
                description: `IP ${ipAddress} has been blocked`,
            });
            loadSuspiciousAccounts();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to block IP: ' + error.message,
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

    const filteredAccounts = suspiciousAccounts.filter(account =>
        account.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalFailedAttempts = suspiciousAccounts.reduce((sum, acc) => sum + acc.failed_attempts, 0);
    const totalSuspiciousAccounts = suspiciousAccounts.length;
    const blockedAccounts = suspiciousAccounts.filter(acc => acc.is_blocked).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Suspicious Login Activity</h1>
                            <p className="text-muted-foreground">Monitor and manage accounts with failed login attempts</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Suspicious Accounts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2">
                            <div className="text-3xl font-bold text-red-600">{totalSuspiciousAccounts}</div>
                            <Users className="h-5 w-5 text-red-500 mb-1" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Failed Attempts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2">
                            <div className="text-3xl font-bold text-orange-600">{totalFailedAttempts}</div>
                            <XCircle className="h-5 w-5 text-orange-500 mb-1" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Blocked Accounts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2">
                            <div className="text-3xl font-bold">{blockedAccounts}</div>
                            <Ban className="h-5 w-5 text-muted-foreground mb-1" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Threshold</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2">
                            <div className="text-3xl font-bold text-blue-600">{minAttempts}+</div>
                            <Activity className="h-5 w-5 text-blue-500 mb-1" />
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
                            <label className="text-sm font-medium">Minimum Failed Attempts</label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    min="1"
                                    value={minAttempts}
                                    onChange={(e) => setMinAttempts(parseInt(e.target.value) || 5)}
                                    className="w-24"
                                />
                                <Button onClick={loadSuspiciousAccounts} variant="outline">
                                    Apply
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Suspicious Accounts Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Suspicious Accounts ({filteredAccounts.length})</CardTitle>
                    <CardDescription>
                        Accounts with {minAttempts} or more failed login attempts
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                            <p className="text-muted-foreground mt-2">Loading suspicious accounts...</p>
                        </div>
                    ) : filteredAccounts.length === 0 ? (
                        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-900 dark:text-green-100">
                                {searchTerm ? 'No accounts match your search.' : `No accounts with ${minAttempts}+ failed attempts. All clear! 🎉`}
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead className="text-center">Failed Attempts</TableHead>
                                        <TableHead>Last Attempt</TableHead>
                                        <TableHead>IP Addresses</TableHead>
                                        <TableHead>Devices</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAccounts.map((account, index) => (
                                        <TableRow key={index} className={account.is_blocked ? 'bg-red-50 dark:bg-red-950/10' : ''}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {account.failed_attempts >= 10 && (
                                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                                    )}
                                                    {account.email}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant={account.failed_attempts >= 10 ? 'destructive' : 'secondary'}
                                                    className="font-bold"
                                                >
                                                    {account.failed_attempts}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                    <span>{getTimeAgo(account.last_attempt)}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formatDate(account.last_attempt)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {(account.ip_addresses || []).slice(0, 2).map((ip, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs gap-1">
                                                            <MapPin className="h-3 w-3" />
                                                            {ip}
                                                        </Badge>
                                                    ))}
                                                    {(account.ip_addresses || []).length > 2 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{(account.ip_addresses || []).length - 2}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Smartphone className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-sm">{account.device_hashes.length}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {account.is_blocked ? (
                                                    <Badge variant="destructive" className="gap-1">
                                                        <Ban className="h-3 w-3" />
                                                        Blocked
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="gap-1">
                                                        <Shield className="h-3 w-3" />
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
                                                            onClick={() => loadLoginHistory(account.email)}
                                                            className="gap-2"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            View Details
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle className="flex items-center gap-2">
                                                                <Activity className="h-5 w-5" />
                                                                Login History: {selectedEmail}
                                                            </DialogTitle>
                                                            <DialogDescription>
                                                                Complete login attempt history for this account
                                                            </DialogDescription>
                                                        </DialogHeader>

                                                        {loadingHistory ? (
                                                            <div className="text-center py-8">
                                                                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                                                                    <div>
                                                                        <p className="text-sm text-muted-foreground">Total Attempts</p>
                                                                        <p className="text-2xl font-bold">{loginHistory.length}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm text-muted-foreground">Failed</p>
                                                                        <p className="text-2xl font-bold text-red-600">
                                                                            {loginHistory.filter(l => !l.success).length}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm text-muted-foreground">Successful</p>
                                                                        <p className="text-2xl font-bold text-green-600">
                                                                            {loginHistory.filter(l => l.success).length}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="rounded-md border">
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow>
                                                                                <TableHead>Time</TableHead>
                                                                                <TableHead>Status</TableHead>
                                                                                <TableHead>IP Address</TableHead>
                                                                                <TableHead>Device</TableHead>
                                                                                <TableHead>Actions</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {loginHistory.map((attempt) => (
                                                                                <TableRow key={attempt.id}>
                                                                                    <TableCell>
                                                                                        <div className="text-sm">{formatDate(attempt.attempt_time)}</div>
                                                                                        <div className="text-xs text-muted-foreground">
                                                                                            {getTimeAgo(attempt.attempt_time)}
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        {attempt.success ? (
                                                                                            <Badge variant="default" className="gap-1 bg-green-600">
                                                                                                <CheckCircle2 className="h-3 w-3" />
                                                                                                Success
                                                                                            </Badge>
                                                                                        ) : (
                                                                                            <Badge variant="destructive" className="gap-1">
                                                                                                <XCircle className="h-3 w-3" />
                                                                                                Failed
                                                                                            </Badge>
                                                                                        )}
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <MapPin className="h-3 w-3 text-muted-foreground" />
                                                                                            <span className="text-sm font-mono">
                                                                                                {attempt.ip_address || 'Unknown'}
                                                                                            </span>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Smartphone className="h-3 w-3 text-muted-foreground" />
                                                                                            <span className="text-xs font-mono text-muted-foreground">
                                                                                                {attempt.device_hash?.substring(0, 8) || 'Unknown'}...
                                                                                            </span>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        {attempt.ip_address && !attempt.success && (
                                                                                            <Button
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                onClick={() => handleBlockIP(attempt.ip_address!)}
                                                                                                className="gap-1"
                                                                                            >
                                                                                                <Ban className="h-3 w-3" />
                                                                                                Block IP
                                                                                            </Button>
                                                                                        )}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
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
