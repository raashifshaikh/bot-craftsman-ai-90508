import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function GenerationHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    try {
      const { data: projects } = await supabase
        .from('bot_projects')
        .select('id')
        .eq('user_id', user?.id);

      if (!projects || projects.length === 0) {
        setHistory([]);
        setLoading(false);
        return;
      }

      const projectIds = projects.map(p => p.id);

      const { data, error } = await supabase
        .from('generation_history')
        .select('*, bot_projects(name)')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No generation history yet. Create a bot to see your history here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">
                  {(item.bot_projects as any)?.name || 'Unknown Project'}
                </CardTitle>
                <CardDescription className="text-sm">
                  {item.user_prompt}
                </CardDescription>
              </div>
              <Badge
                variant={
                  item.status === 'completed' ? 'default' :
                  item.status === 'failed' ? 'destructive' :
                  'secondary'
                }
              >
                {item.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(item.created_at).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
