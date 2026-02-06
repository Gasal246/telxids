/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const Models = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [chipsets, setChipsets] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category_name: '',
    type: '',
    chipset_name: '',
    model_number: '',
    prefix: '',
    telx_model_number: '',
    description: '',
    macs_per_serial: 1,
  });

  useEffect(() => {
    fetchModels();
    fetchCategories();
    fetchChipsets();
  }, []);

  const fetchModels = async () => {
    try {
      const data = await api.getModels();
      setModels(data || []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to fetch models');
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data || []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to fetch categories');
    }
  };

  const fetchChipsets = async () => {
    try {
      const data = await api.getChipsets();
      setChipsets(data || []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to fetch chipsets');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && editingModel) {
        await api.updateModel(editingModel, {
          category_name: formData.category_name,
          type: formData.type,
          chipset_name: formData.chipset_name,
          prefix: formData.prefix,
          telx_model_number: formData.telx_model_number,
          description: formData.description,
          macs_per_serial: formData.macs_per_serial,
        });

        toast.success('Model updated successfully');
        setIsDialogOpen(false);
        setIsEditMode(false);
        setEditingModel(null);
        setFormData({ category_name: '', type: '', chipset_name: '', model_number: '', prefix: '', telx_model_number: '', description: '', macs_per_serial: 1 });
        fetchModels();
        return;
      }

      await api.createModel({
        category_name: formData.category_name,
        type: formData.type,
        chipset_name: formData.chipset_name,
        model_number: formData.model_number,
        prefix: formData.prefix,
        telx_model_number: formData.telx_model_number,
        description: formData.description,
        macs_per_serial: formData.macs_per_serial,
      });

      toast.success('Model created successfully');
      setIsDialogOpen(false);
      setFormData({ category_name: '', type: '', chipset_name: '', model_number: '', prefix: '', telx_model_number: '', description: '', macs_per_serial: 1 });
      fetchModels();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save model');
    }
  };

  const handleEdit = (model: any) => {
    setFormData({
      category_name: model.category_name,
      type: model.type,
      chipset_name: model.chipset_name,
      model_number: model.model_number,
      prefix: model.prefix ?? '',
      telx_model_number: model.telx_model_number,
      description: model.description,
      macs_per_serial: model.macs_per_serial,
    });
    setEditingModel(model.model_number);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleDelete = async (model_number: string) => {
    if (!confirm('Delete this model?')) return;
    try {
      await api.deleteModel(model_number);
      toast.success('Deleted');
      fetchModels();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const selectedCategory = categories.find(c => c.category_name === formData.category_name);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Models</h1>
          <p className="text-muted-foreground">Manage device models</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setIsEditMode(false);
            setEditingModel(null);
            setFormData({ category_name: '', type: '', chipset_name: '', model_number: '', prefix: '', telx_model_number: '', description: '', macs_per_serial: 1 });
          }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Model</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{isEditMode ? 'Edit Model' : 'Add Model'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={formData.category_name} onValueChange={(v) => setFormData({ ...formData, category_name: v, type: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.category_name}>{c.category_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{selectedCategory?.types.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chipset</Label>
                <Select value={formData.chipset_name} onValueChange={(v) => setFormData({ ...formData, chipset_name: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{chipsets.map(c => <SelectItem key={c.id} value={c.chipset_name}>{c.chipset_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Model Number</Label>
                <Input value={formData.model_number} onChange={(e) => setFormData({ ...formData, model_number: e.target.value })} required disabled={isEditMode} />
              </div>
              <div>
                <Label>Prefix</Label>
                <Input value={formData.prefix} onChange={(e) => setFormData({ ...formData, prefix: e.target.value })} required />
              </div>
              <div>
                <Label>Telx Model Number</Label>
                <Input value={formData.telx_model_number} onChange={(e) => setFormData({ ...formData, telx_model_number: e.target.value })} />
              </div>
              <div>
                <Label>MACs per Serial</Label>
                <Input type="number" value={formData.macs_per_serial} onChange={(e) => setFormData({ ...formData, macs_per_serial: +e.target.value })} required />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <Button type="submit" className="col-span-2">{isEditMode ? 'Update Model' : 'Create Model'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Model Number</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Telx Model</TableHead>
                <TableHead>Chipset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Serials</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model) => (
                <TableRow key={model.id}>
                  <TableCell>{model.category_name}</TableCell>
                  <TableCell className="font-medium">{model.model_number}</TableCell>
                  <TableCell>{model.prefix}</TableCell>
                  <TableCell>{model.telx_model_number}</TableCell>
                  <TableCell>{model.chipset_name}</TableCell>
                  <TableCell>{model.type}</TableCell>
                  <TableCell>{model.allocated_count || 0}/{model.generated_count}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/models/${model.model_number}`)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(model)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(model.model_number)}><Trash2 className="h-4 w-4" /></Button>
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

export default Models;
