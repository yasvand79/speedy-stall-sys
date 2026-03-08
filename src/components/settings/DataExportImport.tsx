import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Database, Download, Upload, Loader2, FileJson, FileSpreadsheet } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DataExportImportProps {
  autoBackup: boolean;
  onToggleAutoBackup: (value: boolean) => void;
  canEdit: boolean;
  isSaving: boolean;
}

type ExportTable = 'menu_items' | 'orders' | 'inventory' | 'payments';

const EXPORT_TABLES: { key: ExportTable; label: string; desc: string }[] = [
  { key: 'menu_items', label: 'Menu Items', desc: 'All menu items with prices and categories' },
  { key: 'orders', label: 'Orders', desc: 'All orders with totals and status' },
  { key: 'inventory', label: 'Inventory', desc: 'Stock items and quantities' },
  { key: 'payments', label: 'Payments', desc: 'Payment records and methods' },
];

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function convertToCSV(data: Record<string, any>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h];
      const str = val === null || val === undefined ? '' : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function DataExportImport({ autoBackup, onToggleAutoBackup, canEdit, isSaving }: DataExportImportProps) {
  const [selectedTables, setSelectedTables] = useState<ExportTable[]>(['menu_items', 'orders']);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('csv');

  const toggleTable = (table: ExportTable) => {
    setSelectedTables(prev =>
      prev.includes(table) ? prev.filter(t => t !== table) : [...prev, table]
    );
  };

  const handleExport = async () => {
    if (selectedTables.length === 0) {
      toast.error('Please select at least one data type to export');
      return;
    }

    setExporting(true);
    try {
      const exportData: Record<string, any[]> = {};

      for (const table of selectedTables) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        exportData[table] = data || [];
      }

      const timestamp = new Date().toISOString().slice(0, 10);

      if (exportFormat === 'json') {
        downloadFile(
          JSON.stringify(exportData, null, 2),
          `foodshop-export-${timestamp}.json`,
          'application/json'
        );
      } else {
        // CSV — export each table as separate file if multiple, or single if one
        if (selectedTables.length === 1) {
          const table = selectedTables[0];
          downloadFile(
            convertToCSV(exportData[table]),
            `${table}-${timestamp}.csv`,
            'text/csv'
          );
        } else {
          // Multiple tables — export as JSON with CSV note
          for (const table of selectedTables) {
            downloadFile(
              convertToCSV(exportData[table]),
              `${table}-${timestamp}.csv`,
              'text/csv'
            );
          }
        }
      }

      toast.success(`Exported ${selectedTables.length} table(s) successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setImporting(true);
      try {
        const text = await file.text();

        if (file.name.endsWith('.json')) {
          const data = JSON.parse(text);

          // Validate structure
          const validTables = ['menu_items', 'inventory'];
          const tablesToImport = Object.keys(data).filter(k => validTables.includes(k));

          if (tablesToImport.length === 0) {
            toast.error('No valid data found. Supported tables: menu_items, inventory');
            return;
          }

          let totalRows = 0;
          for (const table of tablesToImport) {
            const rows = data[table];
            if (!Array.isArray(rows) || rows.length === 0) continue;

            // Remove id and timestamps to let DB generate them
            const cleanRows = rows.map((row: any) => {
              const { id, created_at, updated_at, ...rest } = row;
              return rest;
            });

            const { error } = await supabase.from(table as any).upsert(cleanRows as any);
            if (error) {
              console.error(`Import error for ${table}:`, error);
              toast.error(`Failed to import ${table}: ${error.message}`);
              continue;
            }
            totalRows += cleanRows.length;
          }

          toast.success(`Imported ${totalRows} rows into ${tablesToImport.length} table(s)`);
        } else if (file.name.endsWith('.csv')) {
          // Parse CSV
          const lines = text.split('\n').filter(l => l.trim());
          if (lines.length < 2) {
            toast.error('CSV file is empty or has no data rows');
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          const rows = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => {
              if (h !== 'id' && h !== 'created_at' && h !== 'updated_at') {
                obj[h] = values[i] || '';
              }
            });
            return obj;
          });

          // Detect table from headers
          let targetTable = '';
          if (headers.includes('category') && headers.includes('price')) {
            targetTable = 'menu_items';
          } else if (headers.includes('quantity') && headers.includes('unit')) {
            targetTable = 'inventory';
          } else {
            toast.error('Cannot determine data type from CSV headers. Supported: menu_items, inventory');
            return;
          }

          const { error } = await supabase.from(targetTable as any).upsert(rows as any);
          if (error) throw error;

          toast.success(`Imported ${rows.length} rows into ${targetTable}`);
        }
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to import data. Check file format.');
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="font-display">Data & Security</CardTitle>
        </div>
        <CardDescription>Export, import, and backup your data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Auto Backup Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label>Auto Backup</Label>
            <p className="text-sm text-muted-foreground">Daily automatic cloud backup at 2 AM</p>
          </div>
          <Switch
            checked={autoBackup}
            onCheckedChange={onToggleAutoBackup}
            disabled={!canEdit || isSaving}
          />
        </div>

        <Separator />

        {/* Export Section */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Export Data</Label>
          <p className="text-sm text-muted-foreground">Select data to export and choose format</p>

          <div className="space-y-2">
            {EXPORT_TABLES.map(({ key, label, desc }) => (
              <label
                key={key}
                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  checked={selectedTables.includes(key)}
                  onCheckedChange={() => toggleTable(key)}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Badge variant="secondary" className="text-xs">{key}</Badge>
              </label>
            ))}
          </div>

          {/* Format Selection */}
          <div className="flex gap-2">
            <button
              onClick={() => setExportFormat('csv')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                exportFormat === 'csv' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="text-sm font-medium">CSV</span>
            </button>
            <button
              onClick={() => setExportFormat('json')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                exportFormat === 'json' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <FileJson className="h-4 w-4" />
              <span className="text-sm font-medium">JSON</span>
            </button>
          </div>

          <Button onClick={handleExport} disabled={exporting || selectedTables.length === 0} className="w-full">
            {exporting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" /> Export Selected Data</>
            )}
          </Button>
        </div>

        <Separator />

        {/* Import Section */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Import Data</Label>
          <p className="text-sm text-muted-foreground">
            Import menu items or inventory from a CSV or JSON file. Existing records with matching data will be updated.
          </p>
          <Button variant="outline" onClick={handleImport} disabled={importing || !canEdit} className="w-full">
            {importing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" /> Import Data (CSV / JSON)</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
