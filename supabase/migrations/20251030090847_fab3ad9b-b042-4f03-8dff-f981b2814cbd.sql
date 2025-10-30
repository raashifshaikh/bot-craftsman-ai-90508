-- Enable real-time for bot_events table
ALTER TABLE bot_events REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE bot_events;