import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, MessageSquare, Command, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BotEvent {
  id: string;
  event_type: string;
  event_data: any;
  telegram_user_id: number;
  created_at: string;
}

interface BotEventViewerProps {
  projectId: string;
}

export default function BotEventViewer({ projectId }: BotEventViewerProps) {
  const [events, setEvents] = useState<BotEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
    
    // Subscribe to real-time events
    const channel = supabase
      .channel('bot_events_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bot_events',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          setEvents(prev => [payload.new as BotEvent, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('bot_events')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4" />;
      case 'command_executed':
        return <Command className="w-4 h-4" />;
      case 'callback':
        return <Activity className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'message':
        return 'bg-blue-500/10 text-blue-500';
      case 'command_executed':
        return 'bg-green-500/10 text-green-500';
      case 'callback':
        return 'bg-purple-500/10 text-purple-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading events...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Live Bot Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No events yet. Bot activity will appear here in real-time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <Card key={event.id} className="bg-secondary/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${getEventColor(event.event_type)}`}>
                          {getEventIcon(event.event_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {event.event_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              User {event.telegram_user_id}
                            </span>
                          </div>
                          <div className="text-sm break-words">
                            {event.event_type === 'message' && (
                              <p className="text-foreground">{event.event_data.text}</p>
                            )}
                            {event.event_type === 'command_executed' && (
                              <div>
                                <p className="text-foreground font-medium">{event.event_data.command}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Response: {event.event_data.response_length} chars
                                </p>
                              </div>
                            )}
                            {event.event_type === 'callback' && (
                              <p className="text-foreground">{event.event_data.data}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
