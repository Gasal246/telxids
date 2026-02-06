import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { removeGroupFromCart, clearCart } from '@/store/exportCartSlice';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { ShoppingCart, X, Download } from 'lucide-react';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

const ExportCart = () => {
  const groups = useAppSelector((state) => state.exportCart.groups);
  const dispatch = useAppDispatch();
  const [isExporting, setIsExporting] = useState(false);

  const handleRemoveGroup = (groupId: string) => {
    dispatch(removeGroupFromCart(groupId));
  };

  const handleExport = async () => {
    if (groups.length === 0) {
      toast.error('No groups in cart to export');
      return;
    }

    setIsExporting(true);
    try {
      const ExcelJS = await import('exceljs');
      // Create workbook
      const workbook = new ExcelJS.Workbook();

      // Add a sheet for each group
      groups.forEach((group) => {
        const sheetName = `${group.category_name}_${group.telx_model_number}_${group.model_number}`.substring(0, 31);
        const worksheet = workbook.addWorksheet(sheetName);

        // Add headers
        worksheet.columns = [
          { header: 'SerialID', key: 'serialId', width: 20 },
          { header: 'FirstMacID', key: 'firstMacId', width: 20 },
        ];

        // Add data
        const serials = group.serials as Array<{ serialNumber: string; macIds: string[] }>;
        serials.forEach((serial) => {
          worksheet.addRow({
            serialId: serial.serialNumber,
            firstMacId: serial.macIds[0] || '',
          });
        });

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
      });

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `device_identifiers_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Excel file exported successfully!');
      dispatch(clearCart());
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export Excel file');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          <ShoppingCart className="h-6 w-6" />
          {groups.length > 0 && (
            <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
              {groups.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-96">
        <SheetHeader>
          <SheetTitle>Export Cart</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No groups added yet</p>
          ) : (
            <>
              {groups.map((group) => (
                <Card key={group.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{group.model_number}</p>
                      <p className="text-sm text-muted-foreground">{group.telx_model_number}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Array.isArray(group.serials) ? group.serials.length : 0} serials
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveGroup(group.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
              <Button
                className="w-full"
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export to Excel'}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ExportCart;
