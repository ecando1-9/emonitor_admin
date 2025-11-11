import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Zap, Users, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { secureAPI } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Plan {
  id: string;
  name: string;
  price: number;
  price_original?: number;
  features: string[];
}

interface PlanStats {
  plan_id: string;
  plan_name: string;
  subscriber_count: number;
  revenue_monthly: number;
  revenue_annual: number;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stats, setStats] = useState<PlanStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const plans = await secureAPI.getPlans();
      setPlans(plans || []);

      // Calculate stats from subscriptions
      const users = await secureAPI.getUsersWithSubscriptions();
      const statsMap = new Map<string, PlanStats>();

      users?.forEach(user => {
        const stat = statsMap.get(user.plan_id) || {
          plan_id: user.plan_id,
          plan_name: user.plan_name || 'Unknown',
          subscriber_count: 0,
          revenue_monthly: 0,
          revenue_annual: 0
        };
        stat.subscriber_count += 1;
        stat.revenue_monthly += user.price || 0;
        stat.revenue_annual += (user.price || 0) * 12;
        statsMap.set(user.plan_id, stat);
      });

      setStats(Array.from(statsMap.values()));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load plans'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStat = (planId: string) => {
    return stats.find(s => s.plan_id === planId) || {
      plan_id: planId,
      plan_name: '',
      subscriber_count: 0,
      revenue_monthly: 0,
      revenue_annual: 0
    };
  };

  const totalSubscribers = stats.reduce((sum, s) => sum + s.subscriber_count, 0);
  const totalRevenue = stats.reduce((sum, s) => sum + s.revenue_monthly, 0);

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Annual Revenue (Est.)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${(totalRevenue * 12).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : plans.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No plans found</AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const stat = getStat(plan.id);
            const isPopular = plan.name === 'Standard';

            return (
              <Card key={plan.id} className={`flex flex-col ${isPopular ? 'border-blue-500 border-2 ring-2 ring-blue-100' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
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
                    {plan.price_original && plan.price_original > plan.price && (
                      <p className="text-sm text-muted-foreground">
                        <span className="line-through">
                          ${plan.price_original}
                        </span>
                        <span className="ml-2 text-green-600 font-medium">
                          Save {Math.round((1 - plan.price / plan.price_original) * 100)}%
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 py-4 border-y">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Subscribers</span>
                      <Badge variant="secondary">{stat.subscriber_count}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Monthly Revenue</span>
                      <span className="font-bold">${stat.revenue_monthly.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Annual Revenue</span>
                      <span className="font-bold text-green-600">${stat.revenue_annual.toFixed(2)}</span>
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
                <Button className="w-full mt-4" variant={isPopular ? 'default' : 'outline'}>
                  View Details
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
