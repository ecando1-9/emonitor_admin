import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Trash2, Edit2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Promotion {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number;
  uses: number;
  is_active: boolean;
  created_at: string;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    code: '',
    discount_percent: 10,
    max_uses: 100
  });

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('promotions')
        .select('id, code, discount_percent, max_uses, uses, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error loading promotions:', error);
        // Table might not exist or no access
        setPromotions([]);
        return;
      }
      setPromotions(data || []);
    } catch (error: any) {
      console.warn('Failed to load promotions:', error);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || formData.discount_percent <= 0) {
      toast({ title: 'Error', description: 'Please fill in all fields correctly' });
      return;
    }

    try {
      const { error } = await supabase
        .from('promotions')
        .insert({
          code: formData.code.toUpperCase(),
          discount_percent: formData.discount_percent,
          max_uses: formData.max_uses,
          uses: 0,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Promotion created'
      });

      setFormData({ code: '', discount_percent: 10, max_uses: 100 });
      setIsDialogOpen(false);
      loadPromotions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message
      });
    }
  };

  const togglePromotion = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: !current })
        .eq('id', id);

      if (error) throw error;
      loadEmails();
      toast({
        title: 'Success',
        description: `Promotion ${!current ? 'activated' : 'deactivated'}`
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message });
    }
  };

  const deletePromotion = async (id: string) => {
    if (!confirm('Delete this promotion?')) return;
    
    try {
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

  const loadEmails = () => loadPromotions();
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Promotion</DialogTitle>
              <DialogDescription>Add a new promotional discount code</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddPromotion} className="space-y-4">
              <div>
                <Label>Promo Code</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., SAVE10"
                />
              </div>
              <div>
                <Label>Discount (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.discount_percent}
                  onChange={(e) => setFormData({ ...formData, discount_percent: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Max Uses</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) })}
                />
              </div>
              <Button type="submit" className="w-full">Create Promotion</Button>
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
                    <TableHead>Discount</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.map((promo) => (
                    <TableRow key={promo.id}>
                      <TableCell className="font-bold text-blue-600">{promo.code}</TableCell>
                      <TableCell>{promo.discount_percent}%</TableCell>
                      <TableCell>{promo.uses} / {promo.max_uses}</TableCell>
                      <TableCell>
                        <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                          {promo.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(promo.created_at).toLocaleDateString()}</TableCell>
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
