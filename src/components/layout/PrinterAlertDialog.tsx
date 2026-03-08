import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PrinterCheck } from 'lucide-react';

interface PrinterAlertDialogProps {
  error: { title: string; message: string } | null;
  onClose: () => void;
}

export function PrinterAlertDialog({ error, onClose }: PrinterAlertDialogProps) {
  return (
    <AlertDialog open={!!error} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="items-center text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <PrinterCheck className="h-8 w-8 text-destructive" />
          </div>
          <AlertDialogTitle className="text-xl">{error?.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base leading-relaxed">
            {error?.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction onClick={onClose} className="min-w-[120px] text-base">
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
