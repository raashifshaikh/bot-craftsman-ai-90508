import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Power, Trash2, RefreshCw } from 'lucide-react';

interface BotSettingsProps {
  project: any;
  onUpdate: () => void;
  onDelete: () => void;
}

export default function BotSettings({ project, onUpdate, onDelete }: BotSettingsProps) {
  const [isActive, setIsActive] = useState(project.is_active);
  const [loading, setLoading] = useState(false);

  const toggleBotStatus = async () => {
    setLoading(true);
    
    try {
      const newStatus = !isActive;
      const { error } = await supabase
        .from('bot_projects')
        .update({ 
          is_active: newStatus,
          bot_status: newStatus ? 'active' : 'paused'
        })
        .eq('id', project.id);

      if (error) throw error;

      setIsActive(newStatus);
      toast({
        title: 'Success',
        description: `Bot ${newStatus ? 'activated' : 'paused'}`,
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update bot status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const setupWebhook = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('setup-webhook', {
        body: {
          projectId: project.id,
          botToken: project.telegram_bot_token,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Bot @${data.botUsername} is now live!`,
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to setup webhook',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('bot_projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Bot deleted successfully',
      });
      
      onDelete();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete bot',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bot Status */}
      <Card>
        <CardHeader>
          <CardTitle>Bot Status</CardTitle>
          <CardDescription>Control whether your bot is active or paused</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Bot Active</Label>
              <p className="text-sm text-muted-foreground">
                {isActive ? 'Bot is responding to messages' : 'Bot is paused'}
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={toggleBotStatus}
              disabled={loading}
            />
          </div>

          <div className="pt-4 border-t">
            <div className="space-y-2">
              <Label>Current Status</Label>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium capitalize">{project.bot_status || 'draft'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bot Information */}
      <Card>
        <CardHeader>
          <CardTitle>Bot Information</CardTitle>
          <CardDescription>Your bot details and settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Bot Name</Label>
            <Input value={project.name} disabled />
          </div>

          {project.bot_username && (
            <div className="space-y-2">
              <Label>Bot Username</Label>
              <div className="flex items-center gap-2">
                <Input value={`@${project.bot_username}`} disabled />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://t.me/${project.bot_username}`, '_blank')}
                >
                  Open
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={project.description} disabled />
          </div>

          <div className="space-y-2">
            <Label>Created</Label>
            <Input value={new Date(project.created_at).toLocaleDateString()} disabled />
          </div>
        </CardContent>
      </Card>

      {/* Webhook Management */}
      {(!project.webhook_url || project.bot_status === 'draft') && (
        <Card>
          <CardHeader>
            <CardTitle>Deploy Bot</CardTitle>
            <CardDescription>Make your bot live and ready to receive messages</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={setupWebhook} disabled={loading}>
              <Power className="w-4 h-4 mr-2" />
              Activate Bot
            </Button>
          </CardContent>
        </Card>
      )}

      {project.webhook_url && (
        <Card>
          <CardHeader>
            <CardTitle>Webhook</CardTitle>
            <CardDescription>Telegram webhook configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input value={project.webhook_url} disabled />
            </div>
            <Button variant="outline" onClick={setupWebhook} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Webhook
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={loading}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Bot
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your bot
                  and remove all associated data including commands, messages, and analytics.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
