import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
    Settings,
    Calendar,
    ToggleLeft,
    ToggleRight,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Clock,
    Save,
    Info
} from 'lucide-react';
import { secureAPI } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';

interface AppConfig {
    key: string;
    value: string;
    description: string | null;
    updated_at: string;
    updated_by: string | null;
}

export default function TrialSettingsPage() {
    const [trialDays, setTrialDays] = useState<number>(7);
    const [autoCreate, setAutoCreate] = useState<boolean>(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    const { toast } = useToast();
    const { isAuthenticated, isLoading: isAuthLoading, admin } = useAuthStore();

    // Track original values to detect changes
    const [originalTrialDays, setOriginalTrialDays] = useState<number>(7);
    const [originalAutoCreate, setOriginalAutoCreate] = useState<boolean>(true);

    useEffect(() => {
        if (isAuthLoading) {
            setLoading(true);
            return;
        }
        if (isAuthenticated) {
            loadSettings();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated, isAuthLoading]);

    // Detect changes
    useEffect(() => {
        const changed = trialDays !== originalTrialDays || autoCreate !== originalAutoCreate;
        setHasChanges(changed);
    }, [trialDays, autoCreate, originalTrialDays, originalAutoCreate]);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const settings = await secureAPI.getAppConfig(['free_trial_days', 'auto_create_trial']);

            settings.forEach((setting: AppConfig) => {
                if (setting.key === 'free_trial_days') {
                    const days = parseInt(setting.value);
                    setTrialDays(days);
                    setOriginalTrialDays(days);
                    setLastUpdated(setting.updated_at);
                }
                if (setting.key === 'auto_create_trial') {
                    const autoCreateValue = setting.value === 'true';
                    setAutoCreate(autoCreateValue);
                    setOriginalAutoCreate(autoCreateValue);
                    if (!lastUpdated) {
                        setLastUpdated(setting.updated_at);
                    }
                }
            });
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to load trial settings: ' + error.message,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // Validation
        if (trialDays < 1 || trialDays > 365) {
            toast({
                title: 'Invalid Input',
                description: 'Trial days must be between 1 and 365',
                variant: 'destructive'
            });
            return;
        }

        try {
            setSaving(true);

            await secureAPI.updateAppConfig(
                'free_trial_days',
                trialDays.toString(),
                admin?.id || null
            );

            await secureAPI.updateAppConfig(
                'auto_create_trial',
                autoCreate ? 'true' : 'false',
                admin?.id || null
            );

            // Update original values
            setOriginalTrialDays(trialDays);
            setOriginalAutoCreate(autoCreate);
            setLastUpdated(new Date().toISOString());

            toast({
                title: 'Success',
                description: 'Trial settings saved successfully!',
                variant: 'default'
            });
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to save settings: ' + error.message,
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setTrialDays(originalTrialDays);
        setAutoCreate(originalAutoCreate);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(date);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground">Loading trial settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                            <Settings className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Trial Settings</h1>
                            <p className="text-muted-foreground">Configure free trial options for new users</p>
                        </div>
                    </div>
                </div>
                {lastUpdated && (
                    <Badge variant="outline" className="gap-2">
                        <Clock className="h-3 w-3" />
                        Last updated: {formatDate(lastUpdated)}
                    </Badge>
                )}
            </div>

            {/* Info Alert */}
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                    These settings control how free trials are created for new users signing up through the desktop application.
                </AlertDescription>
            </Alert>

            {/* Settings Card */}
            <Card className="shadow-lg">
                <CardHeader className="border-b bg-muted/50">
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Trial Configuration
                    </CardTitle>
                    <CardDescription>
                        Manage trial duration and automatic trial creation settings
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                    {/* Trial Days Setting */}
                    <div className="space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                                <Label htmlFor="trial-days" className="text-base font-semibold flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    Free Trial Days
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Number of days new users receive for their free trial period
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative flex-1 max-w-xs">
                                <Input
                                    id="trial-days"
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={trialDays}
                                    onChange={(e) => setTrialDays(parseInt(e.target.value) || 1)}
                                    className="text-lg font-semibold h-12 pr-16"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                                    days
                                </span>
                            </div>

                            <div className="flex-1 p-4 rounded-lg bg-muted/50 border">
                                <p className="text-xs text-muted-foreground mb-1">Preview</p>
                                <p className="text-sm font-medium">
                                    New users will get <span className="text-primary font-bold">{trialDays} day{trialDays !== 1 ? 's' : ''}</span> of free trial
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AlertCircle className="h-3 w-3" />
                            <span>Valid range: 1-365 days</span>
                        </div>
                    </div>

                    <Separator />

                    {/* Auto-Create Trial Setting */}
                    <div className="space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                                <Label htmlFor="auto-create" className="text-base font-semibold flex items-center gap-2">
                                    {autoCreate ? (
                                        <ToggleRight className="h-5 w-5 text-green-600" />
                                    ) : (
                                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                                    )}
                                    Automatically Create Trial on Signup
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    When enabled, new users automatically receive a trial subscription upon registration
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button
                                id="auto-create"
                                variant={autoCreate ? "default" : "outline"}
                                size="lg"
                                onClick={() => setAutoCreate(!autoCreate)}
                                className="min-w-[200px] h-12 gap-2"
                            >
                                {autoCreate ? (
                                    <>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Enabled
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="h-4 w-4" />
                                        Disabled
                                    </>
                                )}
                            </Button>

                            <div className="flex-1 p-4 rounded-lg bg-muted/50 border">
                                <p className="text-xs text-muted-foreground mb-1">Current Status</p>
                                <p className="text-sm font-medium">
                                    {autoCreate ? (
                                        <span className="text-green-600">✓ Trials are created automatically</span>
                                    ) : (
                                        <span className="text-orange-600">⚠ Admins must manually assign subscriptions</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {!autoCreate && (
                            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                <AlertDescription className="text-orange-900 dark:text-orange-100">
                                    <strong>Warning:</strong> When disabled, new users will not receive automatic trials.
                                    You'll need to manually assign subscriptions from the Users or Subscriptions page.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 text-sm">
                    {hasChanges ? (
                        <>
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <span className="text-orange-600 font-medium">You have unsaved changes</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-muted-foreground">All changes saved</span>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={handleReset}
                        disabled={!hasChanges || saving}
                    >
                        Reset
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className="gap-2 min-w-[120px]"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Save Settings
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Additional Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex-shrink-0 mt-0.5">
                            1
                        </div>
                        <p>
                            <strong className="text-foreground">User Registration:</strong> When a new user signs up through the desktop application,
                            the system checks these settings.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex-shrink-0 mt-0.5">
                            2
                        </div>
                        <p>
                            <strong className="text-foreground">Trial Creation:</strong> If "Auto-Create Trial" is enabled, a trial subscription
                            is automatically created with the configured number of days.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex-shrink-0 mt-0.5">
                            3
                        </div>
                        <p>
                            <strong className="text-foreground">Trial Duration:</strong> The trial will be valid for the number of days specified
                            in "Free Trial Days" setting, starting from the registration date.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex-shrink-0 mt-0.5">
                            4
                        </div>
                        <p>
                            <strong className="text-foreground">Testing:</strong> After changing settings, create a new test account to verify
                            the trial is created correctly with the new configuration.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
