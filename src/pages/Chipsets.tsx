import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api, type Chipset } from '@/lib/api';

const Chipsets = () => {
  const [chipsets, setChipsets] = useState<Chipset[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChipset, setEditingChipset] = useState<Chipset | null>(null);
  const [chipsetName, setChipsetName] = useState('');

  const fetchChipsets = async () => {
    try {
      const data = await api.getChipsets();
      setChipsets(data || []);
    } catch (error) {
      toast.error('Failed to fetch chipsets');
      console.error(error);
    }
  };

  useEffect(() => {
    fetchChipsets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingChipset) {
        await api.updateChipset(editingChipset.id, { chipset_name: chipsetName });
        toast.success('Chipset updated successfully');
      } else {
        await api.createChipset({ chipset_name: chipsetName });
        toast.success('Chipset created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchChipsets();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save chipset');
    }
  };

  const handleEdit = (chipset: Chipset) => {
    setEditingChipset(chipset);
    setChipsetName(chipset.chipset_name);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chipset?')) return;

    try {
      await api.deleteChipset(id);
      toast.success('Chipset deleted');
      fetchChipsets();
    } catch (error) {
      toast.error('Failed to delete chipset');
    }
  };

  const resetForm = () => {
    setChipsetName('');
    setEditingChipset(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Chipsets</h1>
          <p className="text-muted-foreground">Manage chipset types</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Chipset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingChipset ? 'Edit Chipset' : 'Add Chipset'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="chipset_name">Chipset Name</Label>
                <Input
                  id="chipset_name"
                  value={chipsetName}
                  onChange={(e) => setChipsetName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingChipset ? 'Update' : 'Create'} Chipset
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Chipsets</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chipset Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chipsets.map((chipset) => (
                <TableRow key={chipset.id}>
                  <TableCell className="font-medium">{chipset.chipset_name}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(chipset)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(chipset.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Chipsets;
