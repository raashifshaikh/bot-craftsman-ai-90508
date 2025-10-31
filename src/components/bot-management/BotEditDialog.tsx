import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BotEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bot: any;
  onUpdate: () => void;
}

export function BotEditDialog({ open, onOpenChange, bot, onUpdate }: BotEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: bot?.name || '',
    description: bot?.description || '',
    telegram_bot_token: bot?.telegram_bot_token || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('bot_projects')
        .update({
          name: formData.name,
          description: formData.description,
          telegram_bot_token: formData.telegram_bot_token,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bot.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Bot updated successfully',
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update bot',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Bot</DialogTitle>
          <DialogDescription>
            Update your bot's information and settings
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Bot Name</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Awesome Bot"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what your bot does..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-token">Telegram Bot Token</Label>
            <Input
              id="edit-token"
              value={formData.telegram_bot_token}
              onChange={(e) => setFormData({ ...formData, telegram_bot_token: e.target.value })}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              type="password"
            />
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Changing the bot token will disconnect the current bot. Make sure to use a valid token.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
