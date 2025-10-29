-- Add unique constraint for active bot tokens
CREATE UNIQUE INDEX unique_active_bot_token ON bot_projects(telegram_bot_token) 
WHERE is_active = true AND bot_status = 'active';

-- Add bot conversations table for AI assistant
CREATE TABLE bot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES bot_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add bot health reports table
CREATE TABLE bot_health_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES bot_projects(id) ON DELETE CASCADE,
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  issues JSONB DEFAULT '[]'::jsonb,
  suggestions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE bot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_health_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for bot_conversations
CREATE POLICY "Users can view their bot conversations"
  ON bot_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bot_projects
      WHERE bot_projects.id = bot_conversations.project_id
      AND bot_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations for their bots"
  ON bot_conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bot_projects
      WHERE bot_projects.id = bot_conversations.project_id
      AND bot_projects.user_id = auth.uid()
    )
  );

-- RLS policies for bot_health_reports
CREATE POLICY "Users can view health reports for their bots"
  ON bot_health_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bot_projects
      WHERE bot_projects.id = bot_health_reports.project_id
      AND bot_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Service can create health reports"
  ON bot_health_reports FOR INSERT
  WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX idx_bot_conversations_project_id ON bot_conversations(project_id);
CREATE INDEX idx_bot_conversations_created_at ON bot_conversations(created_at);
CREATE INDEX idx_bot_health_reports_project_id ON bot_health_reports(project_id);
CREATE INDEX idx_bot_health_reports_created_at ON bot_health_reports(created_at);