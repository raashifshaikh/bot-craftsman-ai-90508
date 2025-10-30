-- Fix existing commands to have / prefix
UPDATE bot_commands 
SET command = '/' || command 
WHERE command NOT LIKE '/%' 
  AND command != ''
  AND command IS NOT NULL;

-- Create telegram_users table for tracking users
CREATE TABLE IF NOT EXISTS telegram_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  language_code TEXT,
  is_bot BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read telegram_users"
  ON telegram_users FOR SELECT
  USING (true);

CREATE POLICY "Service can manage telegram_users"
  ON telegram_users FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create conversation_states table
CREATE TABLE IF NOT EXISTS conversation_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT NOT NULL,
  project_id UUID NOT NULL REFERENCES bot_projects(id) ON DELETE CASCADE,
  current_flow_id UUID,
  current_step TEXT,
  state_data JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(telegram_user_id, project_id)
);

ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view states for their bots"
  ON conversation_states FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bot_projects 
    WHERE bot_projects.id = conversation_states.project_id 
    AND bot_projects.user_id = auth.uid()
  ));

CREATE POLICY "Service can manage conversation_states"
  ON conversation_states FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create conversation_flows table
CREATE TABLE IF NOT EXISTS conversation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bot_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('command', 'keyword', 'regex', 'intent')),
  trigger_value TEXT NOT NULL,
  flow_definition JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE conversation_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage flows for their bots"
  ON conversation_flows FOR ALL
  USING (EXISTS (
    SELECT 1 FROM bot_projects 
    WHERE bot_projects.id = conversation_flows.project_id 
    AND bot_projects.user_id = auth.uid()
  ));

CREATE POLICY "Service can read flows"
  ON conversation_flows FOR SELECT
  USING (true);

-- Create bot_intents table
CREATE TABLE IF NOT EXISTS bot_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bot_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  training_phrases TEXT[] DEFAULT '{}',
  action_type TEXT NOT NULL CHECK (action_type IN ('flow', 'api_call', 'ai_response')),
  action_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bot_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage intents for their bots"
  ON bot_intents FOR ALL
  USING (EXISTS (
    SELECT 1 FROM bot_projects 
    WHERE bot_projects.id = bot_intents.project_id 
    AND bot_projects.user_id = auth.uid()
  ));

CREATE POLICY "Service can read intents"
  ON bot_intents FOR SELECT
  USING (true);

-- Create bot_events table for comprehensive logging
CREATE TABLE IF NOT EXISTS bot_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bot_projects(id) ON DELETE CASCADE,
  telegram_user_id BIGINT,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bot_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their bots"
  ON bot_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bot_projects 
    WHERE bot_projects.id = bot_events.project_id 
    AND bot_projects.user_id = auth.uid()
  ));

CREATE POLICY "Service can insert events"
  ON bot_events FOR INSERT
  WITH CHECK (true);

-- Create api_integrations table
CREATE TABLE IF NOT EXISTS api_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bot_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  api_type TEXT NOT NULL,
  base_url TEXT NOT NULL,
  auth_type TEXT CHECK (auth_type IN ('none', 'api_key', 'bearer', 'oauth')),
  auth_config JSONB DEFAULT '{}',
  headers JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE api_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage integrations for their bots"
  ON api_integrations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM bot_projects 
    WHERE bot_projects.id = api_integrations.project_id 
    AND bot_projects.user_id = auth.uid()
  ));

CREATE POLICY "Service can read integrations"
  ON api_integrations FOR SELECT
  USING (true);

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bot_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_amount INTEGER NOT NULL,
  price_currency TEXT NOT NULL DEFAULT 'USD',
  billing_period TEXT NOT NULL CHECK (billing_period IN ('daily', 'weekly', 'monthly', 'yearly')),
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage plans for their bots"
  ON subscription_plans FOR ALL
  USING (EXISTS (
    SELECT 1 FROM bot_projects 
    WHERE bot_projects.id = subscription_plans.project_id 
    AND bot_projects.user_id = auth.uid()
  ));

CREATE POLICY "Public can view active plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT NOT NULL,
  project_id UUID NOT NULL REFERENCES bot_projects(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  payment_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subscriptions for their bots"
  ON user_subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bot_projects 
    WHERE bot_projects.id = user_subscriptions.project_id 
    AND bot_projects.user_id = auth.uid()
  ));

CREATE POLICY "Service can manage subscriptions"
  ON user_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_telegram_users_telegram_id ON telegram_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_conversation_states_telegram_user ON conversation_states(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_states_project ON conversation_states(project_id);
CREATE INDEX IF NOT EXISTS idx_bot_events_project ON bot_events(project_id);
CREATE INDEX IF NOT EXISTS idx_bot_events_created_at ON bot_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_flows_project ON conversation_flows(project_id);
CREATE INDEX IF NOT EXISTS idx_bot_intents_project ON bot_intents(project_id);

-- Add trigger for updated_at on conversation_flows
CREATE TRIGGER update_conversation_flows_updated_at
  BEFORE UPDATE ON conversation_flows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for updated_at on bot_intents
CREATE TRIGGER update_bot_intents_updated_at
  BEFORE UPDATE ON bot_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for updated_at on api_integrations
CREATE TRIGGER update_api_integrations_updated_at
  BEFORE UPDATE ON api_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for updated_at on subscription_plans
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for updated_at on user_subscriptions
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();