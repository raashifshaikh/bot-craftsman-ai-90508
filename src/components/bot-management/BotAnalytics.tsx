import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, MessageSquare, Command, TrendingUp } from 'lucide-react';

interface BotAnalyticsProps {
  projectId: string;
}

interface AnalyticsData {
  totalUsers: number;
  totalMessages: number;
  commandUsage: { [key: string]: number };
  recentMessages: any[];
}

export default function BotAnalytics({ projectId }: BotAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    totalMessages: 0,
    commandUsage: {},
    recentMessages: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, [projectId]);

  const loadAnalytics = async () => {
    try {
      // Get total metrics
      const { data: metricsData } = await supabase
        .from('bot_analytics')
        .select('metric_name, metric_value')
        .eq('project_id', projectId)
        .eq('metric_date', new Date().toISOString().split('T')[0]);

      let totalUsers = 0;
      let totalMessages = 0;
      const commandUsage: { [key: string]: number } = {};

      if (metricsData) {
        for (const metric of metricsData) {
          if (metric.metric_name === 'total_users') {
            totalUsers = metric.metric_value;
          } else if (metric.metric_name === 'total_messages') {
            totalMessages = metric.metric_value;
          } else if (metric.metric_name.startsWith('command_')) {
            const commandName = metric.metric_name.replace('command_', '');
            commandUsage[commandName] = metric.metric_value;
          }
        }
      }

      // Get recent messages
      const { data: messagesData } = await supabase
        .from('bot_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);

      setAnalytics({
        totalUsers,
        totalMessages,
        commandUsage,
        recentMessages: messagesData || [],
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  const topCommands = Object.entries(analytics.commandUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Unique users who interacted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              Messages received today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commands Used</CardTitle>
            <Command className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(analytics.commandUsage).length}</div>
            <p className="text-xs text-muted-foreground">
              Different commands executed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Commands */}
      {topCommands.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Commands
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topCommands.map(([command, count]) => (
                <div key={command} className="flex items-center justify-between">
                  <span className="font-mono text-sm">{command}</span>
                  <span className="text-sm text-muted-foreground">{count} uses</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {analytics.recentMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No messages yet
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.recentMessages.map((msg) => (
                  <div key={msg.id} className="border-b pb-3">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {msg.telegram_first_name || msg.telegram_username || 'User'}
                        </span>
                        {msg.telegram_username && (
                          <span className="text-xs text-muted-foreground">
                            @{msg.telegram_username}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm">
                      <div className="mb-1">
                        <span className="text-muted-foreground">User: </span>
                        <span className="font-mono">{msg.message_text}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Bot: </span>
                        <span>{msg.bot_response}</span>
                      </div>
                    </div>
                    {msg.response_time_ms && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Response time: {msg.response_time_ms}ms
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
