import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface GuestWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
}

export function GuestWarningDialog({ open, onOpenChange, onContinue }: GuestWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Guest Mode Warning
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p className="font-medium text-foreground">
              You're using BotForge AI without an account.
            </p>
            <div className="space-y-2 text-sm">
              <p className="text-destructive font-medium">⚠️ Important Limitations:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>All data is stored locally in your browser</li>
                <li>If you refresh the page, all bots will be lost</li>
                <li>Clearing browser data will delete everything</li>
                <li>No cloud backup or sync</li>
                <li>Cannot access bots from other devices</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Create a free account to save your bots permanently and access them from anywhere.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onContinue}>
            Continue as Guest
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
