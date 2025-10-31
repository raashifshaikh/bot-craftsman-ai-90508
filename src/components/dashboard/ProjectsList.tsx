import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Code, Trash2, Calendar, Settings, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import CodePreview from '@/components/code-viewer/CodePreview';
import { BotEditDialog } from '@/components/bot-management/BotEditDialog';

export default function ProjectsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [editingBot, setEditingBot] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    try {
      let query = supabase
        .from('bot_projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (user) {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bot_projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });

      loadProjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  if (selectedProject) {
    return (
      <div>
        <Button
          variant="outline"
          onClick={() => setSelectedProject(null)}
          className="mb-4"
        >
          ← Back to Projects
        </Button>
        <CodePreview code={null} projectId={selectedProject} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No projects yet. Create your first bot to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
        <Card key={project.id}>
          <CardHeader>
            <CardTitle className="line-clamp-1">{project.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {project.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              <Calendar className="h-3 w-3" />
              {new Date(project.created_at).toLocaleDateString()}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/bot/${project.id}`)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingBot(project)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedProject(project.id)}
              >
                <Code className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(project.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
          </Card>
        ))}
      </div>

      {editingBot && (
        <BotEditDialog
          open={!!editingBot}
          onOpenChange={(open) => !open && setEditingBot(null)}
          bot={editingBot}
          onUpdate={loadProjects}
        />
      )}
    </>
  );
}
