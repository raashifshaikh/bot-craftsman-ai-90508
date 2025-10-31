import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Settings, Command, BarChart3, Bot } from 'lucide-react';
import CommandManager from '@/components/bot-management/CommandManager';
import BotAnalytics from '@/components/bot-management/BotAnalytics';
import BotSettings from '@/components/bot-management/BotSettings';
import BotEventViewer from '@/components/bot-management/BotEventViewer';
import { BotAssistantChat } from '@/components/bot-management/BotAssistantChat';
import { toast } from '@/hooks/use-toast';

export default function BotManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth is optional now
    if (!authLoading && id) {
      loadProject();
    }
  }, [authLoading, id]);

  const loadProject = async () => {
    try {
      let query = supabase
        .from('bot_projects')
        .select('*')
        .eq('id', id);
      
      if (user) {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.single();

      if (error) throw error;

      if (!data) {
        toast({
          title: 'Error',
          description: 'Bot not found',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }

      setProject(data);
    } catch (error: any) {
      console.error('Failed to load project:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bot',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading bot...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
              <p className="text-muted-foreground">{project.description}</p>
              {project.bot_username && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm">
                    Bot: <a
                      href={`https://t.me/${project.bot_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-primary hover:underline"
                    >
                      @{project.bot_username}
                    </a>
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {project.bot_status || 'draft'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs - Mobile Optimized */}
        <Tabs defaultValue="commands" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="commands" className="text-xs md:text-sm">
              <Command className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Commands</span>
            </TabsTrigger>
            <TabsTrigger value="assistant" className="text-xs md:text-sm">
              <Bot className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">AI Assistant</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs md:text-sm">
              <BarChart3 className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs md:text-sm">
              <Settings className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="commands">
            <CommandManager
              projectId={project.id}
              botDescription={project.description}
            />
          </TabsContent>

          <TabsContent value="assistant">
            <BotAssistantChat projectId={project.id} />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-6">
              <BotAnalytics projectId={project.id} />
              <BotEventViewer projectId={project.id} />
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <BotSettings
              project={project}
              onUpdate={loadProject}
              onDelete={() => navigate('/dashboard')}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
