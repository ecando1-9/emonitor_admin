import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Zap, Users, TrendingUp, Loader2, Ticket } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { secureAPI } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

// This new interface matches the output of our get_plan_analytics() function
interface PlanAnalytics {
  plan_id: string;
  plan_name: string;
  price: number;
  features: string[];
  subscriber_count: number;
  trialing_count: number;
  active_count: number;
  estimated_monthly_revenue: number;
  promotions_used: Array<{
    code: string;
    type: string;
    value: number;
  }>;
}

export default function PlansPage() {
  const [analytics, setAnalytics] = useState<PlanAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();

  useEffect(() => {
    if (isAuthLoading) { setLoading(true); return; }
    if (isAuthenticated) {
      loadPlanAnalytics();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isAuthLoading]);

  const loadPlanAnalytics = async () => {
    try {
      setLoading(true);
      const data = await secureAPI.getPlanAnalytics();
      setAnalytics(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load plan analytics: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const totalSubscribers = analytics.reduce((sum, s) => sum + s.subscriber_count, 0);
  const totalRevenue = analytics.reduce((sum, s) => sum + s.estimated_monthly_revenue, 0);

  // Helper to count promo code uses
  const getPromoCounts = (promos: Array<{code: string}>) => {
    const counts = new Map<string, number>();
    for (const promo of promos) {
      counts.set(promo.code, (counts.get(promo.code) || 0) + 1);
    }
    return Array.from(counts.entries());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Plans & Pricing</h1>
        <p className="text-muted-foreground">Monitor plans and revenue metrics</p>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Subscribers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold">{totalSubscribers}</div>
              <Users className="h-5 w-5 text-blue-500 mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Est. Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold">${totalRevenue.toFixed(2)}</div>
              <TrendingUp className="h-5 w-5 text-green-500 mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Trials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analytics.reduce((sum, s) => sum + s.trialing_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </div>
      ) : analytics.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No plans found in the database.</AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {analytics.map((plan) => {
            const isPopular = plan.plan_name === 'Standard Plan';
            const promoCounts = getPromoCounts(plan.promotions_used);

            return (
              <Dialog key={plan.plan_id}>
                <Card className={`flex flex-col ${isPopular ? 'border-blue-500 border-2 ring-2 ring-blue-100' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-2xl">{plan.plan_name}</CardTitle>
                        {isPopular && (
                          <Badge className="mt-2 bg-blue-500">Most Popular</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    {/* Pricing */}
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">${plan.price}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2 py-4 border-y">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Subscribers</span>
                        <Badge variant="secondary">{plan.subscriber_count}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Active (Paid)</span>
                        <span className="font-bold">{plan.active_count}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Trialing</span>
                        <span className="font-bold">{plan.trialing_count}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Est. Monthly Revenue</span>
                        <span className="font-bold text-green-600">${plan.estimated_monthly_revenue.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-2">
                      <p className="font-medium text-sm">Features:</p>
                      <ul className="space-y-2">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                  <DialogTrigger asChild>
                    <Button className="w-full mt-4" variant={isPopular ? 'default' : 'outline'}>
                      View Details
                    </Button>
                  </DialogTrigger>
                </Card>
                
                {/* View Details Dialog Content */}
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{plan.plan_name} - Analytics</DialogTitle>
                    <DialogDescription>
                      Detailed breakdown of subscribers and promotions for this plan.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Separator />
                    <CardTitle className="text-lg">Subscriber Stats</CardTitle>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Subscribers:</span>
                      <span className="font-bold text-lg">{plan.subscriber_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Active (Paid):</span>
                      <span className="font-bold text-green-600">{plan.active_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Trialing:</span>
                      <span className="font-bold text-yellow-600">{plan.trialing_count}</span>
                    </div>
                    
                    <Separator />
                    <CardTitle className="text-lg">Revenue</CardTitle>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Est. Monthly Revenue:</span>
                      <span className="font-bold text-lg text-green-600">${plan.estimated_monthly_revenue.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Note: Revenue is estimated from active subscriptions and does not yet account for monetary discounts.
                    </p>

                    <Separator />
                    <CardTitle className="text-lg">Promotions Used</CardTitle>
                    {promoCounts.length > 0 ? (
                      <div className="space-y-2">
                        {promoCounts.map(([code, count]) => (
                          <div key={code} className="flex justify-between items-center">
                            <Badge variant="secondary" className="gap-1">
                              <Ticket className="h-3 w-3" />
                              {code}
                            </Badge>
                            <span className="text-sm">{count} uses</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No promotions have been applied to this plan yet.</p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>
      )}
    </div>
  );
}