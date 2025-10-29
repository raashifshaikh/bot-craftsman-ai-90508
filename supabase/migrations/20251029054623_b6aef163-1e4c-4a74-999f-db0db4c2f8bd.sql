-- Phase 2: Architecture Transformation - Add bot hosting capabilities

-- Add runtime configuration columns to bot_projects
ALTER TABLE bot_projects 
ADD COLUMN bot_status TEXT DEFAULT 'draft' CHECK (bot_status IN ('draft', 'active', 'paused', 'error')),
ADD COLUMN webhook_url TEXT,
ADD COLUMN is_active BOOLEAN DEFAULT false,
ADD COLUMN bot_username TEXT;

-- Create bot commands table for visual command management
CREATE TABLE bot_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES bot_projects(id) ON DELETE CASCADE NOT NULL,
  command TEXT NOT NULL,
  description TEXT,
  response_type TEXT DEFAULT 'text' CHECK (response_type IN ('text', 'image', 'buttons', 'ai')),
  response_content TEXT NOT NULL,
  response_metadata JSONB DEFAULT '{}'::jsonb,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, command)
);

-- Create bot messages log for analytics and debugging
CREATE TABLE bot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES bot_projects(id) ON DELETE CASCADE NOT NULL,
  telegram_user_id TEXT NOT NULL,
  telegram_username TEXT,
  telegram_first_name TEXT,
  telegram_last_name TEXT,
  message_text TEXT,
  message_type TEXT DEFAULT 'text',
  bot_response TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create bot analytics table
CREATE TABLE bot_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES bot_projects(id) ON DELETE CASCADE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value INTEGER DEFAULT 0,
  metric_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, metric_name, metric_date)
);

-- Enable RLS on new tables
ALTER TABLE bot_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bot_commands
CREATE POLICY "Users can view commands for their own bots"
ON bot_commands FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bot_projects
    WHERE bot_projects.id = bot_commands.project_id
    AND bot_projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create commands for their own bots"
ON bot_commands FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bot_projects
    WHERE bot_projects.id = bot_commands.project_id
    AND bot_projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update commands for their own bots"
ON bot_commands FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM bot_projects
    WHERE bot_projects.id = bot_commands.project_id
    AND bot_projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete commands for their own bots"
ON bot_commands FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM bot_projects
    WHERE bot_projects.id = bot_commands.project_id
    AND bot_projects.user_id = auth.uid()
  )
);

-- RLS Policies for bot_messages
CREATE POLICY "Users can view messages for their own bots"
ON bot_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bot_projects
    WHERE bot_projects.id = bot_messages.project_id
    AND bot_projects.user_id = auth.uid()
  )
);

CREATE POLICY "Bot runtime can insert messages"
ON bot_messages FOR INSERT
WITH CHECK (true);

-- RLS Policies for bot_analytics
CREATE POLICY "Users can view analytics for their own bots"
ON bot_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bot_projects
    WHERE bot_projects.id = bot_analytics.project_id
    AND bot_projects.user_id = auth.uid()
  )
);

CREATE POLICY "Bot runtime can insert/update analytics"
ON bot_analytics FOR INSERT
WITH CHECK (true);

CREATE POLICY "Bot runtime can update analytics"
ON bot_analytics FOR UPDATE
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_bot_commands_project_id ON bot_commands(project_id);
CREATE INDEX idx_bot_commands_command ON bot_commands(command);
CREATE INDEX idx_bot_messages_project_id ON bot_messages(project_id);
CREATE INDEX idx_bot_messages_created_at ON bot_messages(created_at DESC);
CREATE INDEX idx_bot_analytics_project_id ON bot_analytics(project_id);
CREATE INDEX idx_bot_analytics_date ON bot_analytics(metric_date DESC);

-- Create trigger for updated_at on bot_commands
CREATE TRIGGER update_bot_commands_updated_at
BEFORE UPDATE ON bot_commands
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to increment analytics
CREATE OR REPLACE FUNCTION increment_bot_metric(
  p_project_id UUID,
  p_metric_name TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO bot_analytics (project_id, metric_name, metric_value, metric_date)
  VALUES (p_project_id, p_metric_name, p_increment, CURRENT_DATE)
  ON CONFLICT (project_id, metric_name, metric_date)
  DO UPDATE SET metric_value = bot_analytics.metric_value + p_increment;
END;
$$;