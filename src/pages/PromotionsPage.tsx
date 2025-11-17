import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Trash2, Edit2, Loader2, Ticket } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Promotion {
  id: string;
  code: string;
  promo_type: 'percentage' | 'fixed' | 'trial_days';
  discount_value: number | null;
  trial_days: number | null;
  uses: number;
  max_uses: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
}

const newPromoInitialState = {
  code: '',
  name: 'New Promotion', // 'name' field doesn't exist anymore, but we'll use code
  promo_type: 'trial_days' as 'trial_days',
  discount_value: 0,
  trial_days: 30,
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
  max_uses: 100,
  is_active: true,
};

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  
  const [formData, setFormData] = useState(newPromoInitialState);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthLoading) { setLoading(true); return; }
    if (isAuthenticated) {
      loadPromotions();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isAuthLoading]);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('promotions')
        .select('*') // Select all fields to match the interface
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromotions(data || []);
    } catch (error: any) {
      console.warn('Failed to load promotions:', error);
      setPromotions([]);
      toast({ title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.start_date || !formData.end_date) {
      toast({ title: 'Error', description: 'Please fill in all required fields' });
      return;
    }
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('promotions')
        .insert({
          code: formData.code.toUpperCase(),
          promo_type: formData.promo_type,
          discount_value: formData.promo_type !== 'trial_days' ? formData.discount_value : null,
          trial_days: formData.promo_type === 'trial_days' ? formData.trial_days : null,
          start_date: formData.start_date,
          end_date: formData.end_date,
          max_uses: formData.max_uses,
          is_active: formData.is_active,
          uses: 0,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Promotion created'
      });

      setFormData(newPromoInitialState);
      setIsDialogOpen(false);
      loadPromotions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  const togglePromotion = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: !current })
        .eq('id', id);

      if (error) throw error;
      loadPromotions();
      toast({
        title: 'Success',
        description: `Promotion ${!current ? 'activated' : 'deactivated'}`
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message });
    }
  };

  // *** THIS FUNCTION IS NOW FIXED ***
  const deletePromotion = async (id: string) => {
    if (!confirm('Delete this promotion? This action is permanent.')) return;
    
    try {
      // The typo '}_' has been removed from the line below
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Promotion deleted'
      });
      loadPromotions();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message });
    }
  };

  const activeCount = promotions.filter(p => p.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Promotions</h1>
          <p className="text-muted-foreground">Manage discount codes and promotional campaigns</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Promotion</DialogTitle>
              <DialogDescription>Add a new promotional discount code</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddPromotion} className="space-y-4">
              <div>
                <Label>Promo Code</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., TRIAL30"
                />
              </div>
              
              <div>
                <Label>Promotion Type</Label>
                <Select value={formData.promo_type} onValueChange={(val: any) => setFormData({ ...formData, promo_type: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial_days">Trial Days</SelectItem>
                    <SelectItem value="percentage">Percentage Discount</SelectItem>
                    <SelectItem value="fixed">Fixed Discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.promo_type === 'trial_days' && (
                <div>
                  <Label>Trial Days to Add</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.trial_days}
                    onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) })}
                  />
                </div>
              )}

              {formData.promo_type !== 'trial_days' && (
                <div>
                  <Label>Discount Value ({formData.promo_type === 'percentage' ? '%' : '$'})</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseInt(e.target.value) })}
                  />
                </div>
              )}

              <div>
                <Label>Max Uses</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : 'Create Promotion'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Promotions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promotions.length}</div>
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
            <div className="text-2xl font-bold text-red-600">{promotions.length - activeCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Promotion Codes</CardTitle>
          <CardDescription>Create and manage promotional discounts</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : promotions.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No promotions yet. Create one to get started.</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.map((promo) => (
                    <TableRow key={promo.id}>
                      <TableCell className="font-bold text-blue-600">{promo.code}</TableCell>
                      <TableCell>{promo.promo_type}</TableCell>
                      <TableCell>
                        {promo.promo_type === 'trial_days' ? `${promo.trial_days} days` :
                         promo.promo_type === 'percentage' ? `${promo.discount_value}%` :
                         `$${promo.discount_value}`}
                      </TableCell>
                      <TableCell>{promo.uses} / {promo.max_uses}</TableCell>
                      <TableCell>
                        <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                          {promo.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(promo.end_date).toLocaleDateString()}</TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePromotion(promo.id, promo.is_active)}
                        >
                          {promo.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deletePromotion(promo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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