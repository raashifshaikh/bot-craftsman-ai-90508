import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import CodePreview from '@/components/code-viewer/CodePreview';
import { EnhancedPromptBuilder } from './EnhancedPromptBuilder';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProjectFormProps {
  onSuccess?: () => void;
}

export default function ProjectForm({ onSuccess }: ProjectFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [useSupabase, setUseSupabase] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<any>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      // Create project (works with or without auth)
      const projectData: any = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        telegram_bot_token: formData.get('telegram_token') as string,
        supabase_url: useSupabase ? (formData.get('supabase_url') as string) : null,
        supabase_anon_key: useSupabase ? (formData.get('supabase_anon_key') as string) : null,
      };

      if (user) {
        projectData.user_id = user.id;
      }

      const { data: project, error: projectError } = await supabase
        .from('bot_projects')
        .insert(projectData)
        .select()
        .single();

      if (projectError) throw projectError;
      setProjectId(project.id);

      // Analyze prompt
      const { data: analysis } = await supabase.functions.invoke('analyze-prompt', {
        body: { 
          prompt: promptValue,
          useSupabase 
        },
      });

      // Generate bot code
      const { data: codeData } = await supabase.functions.invoke('generate-bot', {
        body: {
          projectId: project.id,
          requirements: analysis.requirements,
          botToken: formData.get('telegram_token') as string,
          supabaseUrl: useSupabase ? formData.get('supabase_url') as string : null,
          supabaseKey: useSupabase ? formData.get('supabase_anon_key') as string : null,
        },
      });

      // Setup webhook and activate bot
      const { data: webhookData, error: webhookError } = await supabase.functions.invoke('setup-webhook', {
        body: { projectId: project.id, botToken: formData.get('telegram_token') as string }
      });

      if (webhookError) throw webhookError;

      toast({
        title: "Success!",
        description: `Bot @${webhookData.botUsername} is now live!`,
      });

      window.location.href = `/bot/${project.id}`;
      onSuccess?.();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate bot",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (generatedCode && projectId) {
    return <CodePreview code={generatedCode} projectId={projectId} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Telegram Bot</CardTitle>
        <CardDescription>
          Describe your bot in natural language and AI will generate the code
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!user && (
          <Alert className="mb-6 border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Guest Mode:</strong> You can create bots without signing in, but they'll only be saved in your browser. 
              Sign up to save bots permanently and access them from any device.
            </AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="My Awesome Bot"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Short Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="A brief one-line description"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegram_token">Telegram Bot Token</Label>
            <Input
              id="telegram_token"
              name="telegram_token"
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
              required
              type="password"
            />
            <p className="text-xs text-muted-foreground">
              Get your bot token from <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@BotFather</a> on Telegram
            </p>
          </div>

          <EnhancedPromptBuilder 
            value={promptValue}
            onChange={setPromptValue}
          />

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="use-supabase">Use Supabase Integration</Label>
              <p className="text-xs text-muted-foreground">
                Enable database features for your bot
              </p>
            </div>
            <Switch
              id="use-supabase"
              checked={useSupabase}
              onCheckedChange={setUseSupabase}
            />
          </div>

          {useSupabase && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label htmlFor="supabase_url">Supabase URL</Label>
                <Input
                  id="supabase_url"
                  name="supabase_url"
                  placeholder="https://xxxxx.supabase.co"
                  required={useSupabase}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supabase_anon_key">Supabase Anon Key</Label>
                <Input
                  id="supabase_anon_key"
                  name="supabase_anon_key"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  required={useSupabase}
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Bot...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Bot
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
