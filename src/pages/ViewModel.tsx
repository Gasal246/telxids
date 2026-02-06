/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { useAppDispatch } from '@/store/hooks';
import { addGroupToCart } from '@/store/exportCartSlice';
import { Badge } from '@/components/ui/badge';
import { formatDatePretty } from '@/lib/utils';
import { Copy, CheckCircle2, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api';

const ViewModel = () => {
  const { modelNumber } = useParams();
  const dispatch = useAppDispatch();
  const [model, setModel] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [formData, setFormData] = useState({ count: 1, regionId: '', prefix: '' });
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isAllocateDialogOpen, setIsAllocateDialogOpen] = useState(false);
  const [isViewAllDialogOpen, setIsViewAllDialogOpen] = useState(false);
  const [viewAllGroup, setViewAllGroup] = useState<any | null>(null);
  const [isExportingModal, setIsExportingModal] = useState(false);
  const [isExportingModel, setIsExportingModel] = useState(false);

  const getErrorMessage = (err: unknown) => {
    if (!err) return 'Unknown error';
    if (err instanceof Error) {
      return err.message;
    }
    if (typeof err === 'string') return err;
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
      return (err as any).message;
    }
    return 'Unknown error';
  };

  const formatDateForFilename = (value: unknown) => {
    const d = value ? new Date(value as any) : new Date();
    if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    return d.toISOString().slice(0, 10);
  };

  const normalizeSerials = (serials: any[]) => {
    return serials.map((s: any) => ({
      serialNumber: s?.serialNumber ?? s?.serial_number ?? '',
      macIds: Array.isArray(s?.macIds) ? s.macIds : [],
      allocated: Boolean(s?.allocated),
    }));
  };

  useEffect(() => {
    if (modelNumber) {
      fetchModel();
      fetchGroups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelNumber]);

  const fetchModel = async () => {
    if (!modelNumber) return;
    try {
      const data = await api.getModel(modelNumber);
      setModel(data);
      setFormData((prev) => ({ ...prev, prefix: data?.prefix ?? '' }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const fetchGroups = async () => {
    if (!modelNumber) return;
    try {
      const data = await api.getGenerateGroups(modelNumber);
      setGroups(data || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!modelNumber) throw new Error('Missing model number');
      if (!formData.prefix) throw new Error('Model prefix is not set');
      await api.generate({ model_number: modelNumber, ...formData });
      toast.success('Identifiers generated successfully');
      fetchModel();
      fetchGroups();
    } catch (error: any) {
      console.error('Generate error:', error);
      toast.error(getErrorMessage(error));
    }
  };

  const copyMacId = (macId: string) => {
    navigator.clipboard.writeText(macId);
    toast.success('Mac ID copied', { description: macId });
  };

  const openViewAll = (group: any) => {
    setViewAllGroup(group);
    setIsViewAllDialogOpen(true);
  };

  const exportSerialsToExcel = async (opts: {
    sheetName: string;
    fileName: string;
    generatedAt?: unknown;
    serials: any[];
  }) => {
    const { sheetName, fileName, generatedAt, serials } = opts;

    const normalizedSerials = normalizeSerials(serials);
    const totalSerials = normalizedSerials.length;
    const allocatedSerials = normalizedSerials.filter((s) => s.allocated).length;
    const totalMacs = normalizedSerials.reduce((sum, s) => sum + s.macIds.length, 0);
    const allocatedMacs = normalizedSerials.reduce((sum, s) => sum + (s.allocated ? s.macIds.length : 0), 0);

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 4 }],
    });

    worksheet.columns = [
      { key: 'modelNumber', width: 18 },
      { key: 'telxModelNo', width: 18 },
      { key: 'prefix', width: 16 },
      { key: 'description', width: 52 },
      { key: 'chipset', width: 18 },
      { key: 'type', width: 14 },
      { key: 'macAddress', width: 18 },
      { key: 'serialAddress', width: 18 },
    ];

    worksheet.addRow([
      'Model Number',
      'TelX Model No',
      'Prefix',
      'Description',
      'Chipset',
      'Type',
      'Mac Address',
      'Serial Address',
    ]);

    worksheet.addRow([
      model?.model_number ?? '',
      model?.telx_model_number ?? '',
      model?.prefix ?? '',
      model?.description ?? '',
      model?.chipset_name ?? '',
      model?.type ?? '',
      `${allocatedMacs} | ${totalMacs}`,
      `${allocatedSerials} | ${totalSerials}`,
    ]);

    worksheet.addRow([]);
    worksheet.addRow(['MAC IDs', 'Serial Numbers']);

    normalizedSerials.forEach((s) => {
      worksheet.addRow([s.macIds[0] ?? '', s.serialNumber]);
    });

    const headerFill = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFEDEDED' },
    };

    const applyBorder = (fromRow: number, toRow: number, fromCol: number, toCol: number) => {
      for (let r = fromRow; r <= toRow; r += 1) {
        for (let c = fromCol; c <= toCol; c += 1) {
          const cell = worksheet.getCell(r, c);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        }
      }
    };

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).height = 20;
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).eachCell((cell) => {
      cell.fill = headerFill as any;
    });

    worksheet.getRow(2).height = 44;
    worksheet.getRow(2).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    worksheet.getCell(2, 4).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    worksheet.getCell(2, 7).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell(2, 8).alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.getRow(4).font = { bold: true };
    worksheet.getRow(4).height = 18;
    worksheet.getRow(4).alignment = { vertical: 'middle', horizontal: 'left' };
    [worksheet.getCell(4, 1), worksheet.getCell(4, 2)].forEach((cell) => {
      cell.fill = headerFill as any;
    });

    applyBorder(1, 2, 1, 8);
    const lastDataRow = worksheet.rowCount;
    applyBorder(4, Math.max(4, lastDataRow), 1, 2);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_${formatDateForFilename(generatedAt)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Excel export is ready', {
      description: `${model?.model_number ?? ''} · ${totalSerials} serials`,
    });
  };

  const exportGroupToExcel = async (group: any) => {
    if (!group) {
      toast.error('No data to export');
      return;
    }
    if (isExportingModal || isExportingModel) return;
    setIsExportingModal(true);

    try {
      await exportSerialsToExcel({
        sheetName: 'Export Modal',
        fileName: `${model?.model_number ?? 'model'}_modal`,
        generatedAt: group.generated_at,
        serials: Array.isArray(group.serials) ? group.serials : [],
      });
    } catch (error) {
      console.error('Modal export error:', error);
      toast.error('Failed to export modal data', { description: getErrorMessage(error) });
    } finally {
      setIsExportingModal(false);
    }
  };

  const handleExportModal = async () => {
    if (!viewAllGroup) {
      toast.error('No modal data to export');
      return;
    }
    await exportGroupToExcel(viewAllGroup);
  };

  const handleExportModel = async () => {
    if (!model) return;
    if (isExportingModal || isExportingModel) return;
    setIsExportingModel(true);

    try {
      const allSerials = groups.flatMap((g) => (Array.isArray(g?.serials) ? g.serials : []));
      const latestGeneratedAt =
        groups
          .map((g) => g?.generated_at)
          .filter(Boolean)
          .sort()
          .at(-1) ?? new Date();

      await exportSerialsToExcel({
        sheetName: 'Export Model',
        fileName: `${model?.model_number ?? 'model'}_model`,
        generatedAt: latestGeneratedAt,
        serials: allSerials,
      });
    } catch (error) {
      console.error('Model export error:', error);
      toast.error('Failed to export model', { description: getErrorMessage(error) });
    } finally {
      setIsExportingModel(false);
    }
  };

  const handleAllocate = async () => {
    if (selectedGroups.length === 0) {
      toast.error('Please select at least one group to allocate');
      return;
    }
    try {
      await api.allocate(selectedGroups);
      toast.success('Groups allocated successfully');
      setSelectedGroups([]);
      setIsAllocateDialogOpen(false);
      fetchGroups();
      fetchModel();
    } catch (error: any) {
      console.error('Allocate error:', error);
      toast.error(getErrorMessage(error));
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const unallocatedGroups = groups.filter(g =>
    (g.serials as any[]).some((s: any) => !s.allocated)
  );

  if (!model) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{model.model_number}</h1>
          <p className="text-muted-foreground">{model.telx_model_number}</p>
        </div>
        <Button
          variant="outline"
          onClick={handleExportModel}
          disabled={isExportingModel || isExportingModal}
        >
          <Download className="h-4 w-4 mr-2" />
          {isExportingModel ? 'Exporting…' : 'Export Model'}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Model Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><span className="font-medium">Category:</span> {model.category_name}</div>
          <div><span className="font-medium">Type:</span> {model.type}</div>
          <div><span className="font-medium">Chipset:</span> {model.chipset_name}</div>
          <div><span className="font-medium">MACs per Serial:</span> {model.macs_per_serial}</div>
          <div><span className="font-medium">Generated:</span> {model.generated_count}</div>
          <div><span className="font-medium">Allocated:</span> {model.allocated_count || 0}/{model.generated_count}</div>
          <div className="col-span-2"><span className="font-medium">Description:</span> {model.description}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Generate Identifiers</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="grid grid-cols-3 gap-4">
            <div>
              <Label>Count</Label>
              <Input type="number" min="1" value={formData.count} onChange={(e) => setFormData({ ...formData, count: +e.target.value })} required />
            </div>
            <div>
              <Label>Region ID</Label>
              <Input value={formData.regionId} onChange={(e) => setFormData({ ...formData, regionId: e.target.value })} />
            </div>
            <div>
              <Label>Prefix</Label>
              <Input value={formData.prefix} disabled onChange={(e) => setFormData({ ...formData, prefix: e.target.value })} required />
            </div>
            <Button type="submit" className="col-span-3">Generate</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Generated Groups</CardTitle>
          <Dialog open={isAllocateDialogOpen} onOpenChange={setIsAllocateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Allocate IDs</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Allocate Generated Groups</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {unallocatedGroups.length === 0 ? (
                  <p className="text-muted-foreground">No unallocated groups available</p>
                ) : (
                  <>
                    {unallocatedGroups.map((group) => (
                      <div key={group.id} className="flex items-start space-x-3 border-b pb-3">
                        <Checkbox
                          checked={selectedGroups.includes(group.id)}
                          onCheckedChange={() => toggleGroupSelection(group.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {formatDatePretty(group.generated_at)} - {(group.serials as any[]).length} Serials
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Region: {group.region_id} | Prefix: {group.suffix}
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button onClick={handleAllocate} disabled={selectedGroups.length === 0} className="w-full">
                      Allocate Selected Groups ({selectedGroups.length})
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Dialog
            open={isViewAllDialogOpen}
            onOpenChange={(open) => {
              setIsViewAllDialogOpen(open);
              if (!open) setViewAllGroup(null);
            }}
          >
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {viewAllGroup
                    ? `All Serials (${Array.isArray(viewAllGroup.serials) ? viewAllGroup.serials.length : 0}) · ${formatDatePretty(viewAllGroup.generated_at)}`
                    : 'All Serials'}
                </DialogTitle>
              </DialogHeader>

              {viewAllGroup ? (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    You’re doing great — here’s the complete list for this generated batch.
                  </div>

                  <div className="space-y-2">
                    {(Array.isArray(viewAllGroup.serials) ? viewAllGroup.serials : []).map((s: any, i: number) => (
                      <div key={i} className="text-sm border-b pb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="font-medium m-2 cursor-pointer select-none"
                            onClick={() => {
                              navigator.clipboard.writeText(s.serialNumber);
                              toast.success('Serial Number copied', { description: s.serialNumber });
                            }}
                          >
                            {s.serialNumber}
                          </div>
                          {s.allocated && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Allocated
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(Array.isArray(s.macIds) ? s.macIds : []).map((macId: string) => (
                            <Badge
                              key={macId}
                              className="group mr-2 bg-muted text-muted-foreground hover:bg-red-500 hover:text-white select-none cursor-pointer"
                              onClick={() => copyMacId(macId)}
                            >
                              {macId}
                              <Copy className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100" />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsViewAllDialogOpen(false)}
                      className="flex-1"
                    >
                      Done
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportModal}
                      disabled={isExportingModal}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isExportingModal ? 'Exporting…' : 'Export Modal'}
                    </Button>
                    <Button
                      onClick={() => {
                        dispatch(addGroupToCart(viewAllGroup));
                        toast.success('Added to export list');
                      }}
                      className="flex-1"
                    >
                      Add to Export List
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Loading…</div>
              )}
            </DialogContent>
          </Dialog>

          <Accordion type="single" collapsible>
            {groups.map((group) => {
              const allocatedCount = (group.serials as any[]).filter((s: any) => s.allocated).length;
              const totalCount = (group.serials as any[]).length;
              return (
              <AccordionItem key={group.id} value={group.id}>
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    {formatDatePretty(group.generated_at)} 👉🏼 [ {totalCount} Serial Numbers ]
                    {allocatedCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {allocatedCount}/{totalCount} Allocated
                      </Badge>
                    )}
                  </div>
	                </AccordionTrigger>
	                <AccordionContent>
	                  <div className="space-y-2">
	                    {(group.serials as any[]).slice(0, 5).map((s: any, i: number) => (
	                      <div key={i} className="text-sm border-b pb-2">
                        <div className="flex items-center gap-2">
                          <div className="font-medium m-2 cursor-pointer select-none" onClick={() => { navigator.clipboard.writeText(s.serialNumber); toast.success('Serial Number copied', { description: s.serialNumber }); }}>{s.serialNumber}</div>
                          {s.allocated && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Allocated
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {s.macIds.map((macId: string) => (
                            <Badge
                              key={macId}
                              className="group mr-2 bg-muted text-muted-foreground hover:bg-red-500 hover:text-white select-none cursor-pointer"
                              onClick={() => copyMacId(macId)}
                            >
                              {macId}
                              <Copy className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100" />
                            </Badge>
                          ))}
	                        </div>
	                      </div>
	                    ))}
                      {totalCount > 5 && (
                        <div className="pt-2">
                          <Button variant="outline" className="w-full" onClick={() => openViewAll(group)}>
                            View all {totalCount} serials
                          </Button>
                          <div className="mt-2 text-xs text-muted-foreground text-center">
                            Showing the first 5 for a clean view — you can review the full batch anytime.
                          </div>
                        </div>
                      )}
                      {totalCount <= 5 && (
                        <div className="pt-2">
                          <Button variant="outline" className="w-full" onClick={() => openViewAll(group)}>
                            View all {totalCount} serials
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => exportGroupToExcel(group)}
                          disabled={isExportingModal}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {isExportingModal ? 'Exporting…' : 'Export Modal'}
                        </Button>
                        <Button
                          onClick={() => {
                            dispatch(addGroupToCart(group));
                            toast.success('Added to cart');
                          }}
                          className="flex-1"
                        >
                          Add to Export List
                        </Button>
                      </div>
	                  </div>
	                </AccordionContent>
	              </AccordionItem>
	            );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default ViewModel;
