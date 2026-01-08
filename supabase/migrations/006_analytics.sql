-- =============================================
-- ANALYTICS AND TRAINING DATA
-- =============================================

-- Generic analytics events (all user actions)
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  interview_id UUID REFERENCES public.interviews(id) ON DELETE SET NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::JSONB,
  
  session_id TEXT,
  device_type TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated question statistics
CREATE TABLE public.question_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_pattern TEXT NOT NULL,
  question_text_sample TEXT,
  question_type TEXT,
  question_category TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  
  -- Counts
  times_asked INT DEFAULT 0,
  times_answered INT DEFAULT 0,
  times_answer_used INT DEFAULT 0,
  times_answer_edited INT DEFAULT 0,
  times_answer_skipped INT DEFAULT 0,
  
  -- Success tracking
  interviews_with_pass INT DEFAULT 0,
  interviews_with_fail INT DEFAULT 0,
  success_rate FLOAT DEFAULT 0,
  
  -- Answer metrics
  avg_answer_length INT DEFAULT 0,
  avg_generation_time_ms INT DEFAULT 0,
  avg_selection_time_ms INT DEFAULT 0,
  
  -- Top performing answers
  top_answer_patterns JSONB DEFAULT '[]'::JSONB,
  
  -- Round distribution
  round_distribution JSONB DEFAULT '{}'::JSONB,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company-specific insights
CREATE TABLE public.company_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID UNIQUE NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Interview process
  avg_interview_rounds FLOAT DEFAULT 0,
  typical_round_types JSONB DEFAULT '[]'::JSONB,
  avg_days_to_offer FLOAT DEFAULT 0,
  avg_days_between_rounds FLOAT DEFAULT 0,
  
  -- Question patterns
  common_questions JSONB DEFAULT '[]'::JSONB,
  question_types_distribution JSONB DEFAULT '{}'::JSONB,
  questions_per_round JSONB DEFAULT '{}'::JSONB,
  
  -- Success factors
  successful_answer_traits JSONB DEFAULT '[]'::JSONB,
  common_rejection_reasons JSONB DEFAULT '[]'::JSONB,
  
  -- Timing
  avg_round_duration_mins INT DEFAULT 0,
  typical_questions_per_interview INT DEFAULT 0,
  
  -- Platform stats
  total_users_interviewed INT DEFAULT 0,
  total_interviews INT DEFAULT 0,
  total_offers INT DEFAULT 0,
  platform_success_rate FLOAT DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidate performance tracking
CREATE TABLE public.candidate_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Application funnel
  total_applications INT DEFAULT 0,
  applications_with_response INT DEFAULT 0,
  response_rate FLOAT DEFAULT 0,
  
  -- Interview funnel
  total_interviews INT DEFAULT 0,
  interviews_passed INT DEFAULT 0,
  interviews_failed INT DEFAULT 0,
  interview_pass_rate FLOAT DEFAULT 0,
  
  -- Offers
  total_offers INT DEFAULT 0,
  offers_accepted INT DEFAULT 0,
  offers_declined INT DEFAULT 0,
  conversion_rate FLOAT DEFAULT 0,
  
  -- Question performance
  total_questions_faced INT DEFAULT 0,
  questions_answered_with_ai INT DEFAULT 0,
  ai_answer_usage_rate FLOAT DEFAULT 0,
  
  -- By type
  behavioral_success_rate FLOAT DEFAULT 0,
  technical_success_rate FLOAT DEFAULT 0,
  system_design_success_rate FLOAT DEFAULT 0,
  
  -- Time metrics
  avg_days_to_offer FLOAT DEFAULT 0,
  avg_interviews_per_offer FLOAT DEFAULT 0,
  
  -- Improvement tracking
  first_interview_date TIMESTAMPTZ,
  latest_interview_date TIMESTAMPTZ,
  improvement_trend FLOAT DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform-wide analytics (daily snapshots)
CREATE TABLE public.platform_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Users
  total_users INT DEFAULT 0,
  new_users_today INT DEFAULT 0,
  active_users_today INT DEFAULT 0,
  active_users_week INT DEFAULT 0,
  active_users_month INT DEFAULT 0,
  
  -- Applications
  total_applications INT DEFAULT 0,
  applications_today INT DEFAULT 0,
  
  -- Interviews
  total_interviews INT DEFAULT 0,
  interviews_today INT DEFAULT 0,
  avg_interview_duration_mins FLOAT DEFAULT 0,
  
  -- Questions
  total_questions_detected INT DEFAULT 0,
  questions_today INT DEFAULT 0,
  
  -- Answers
  total_answers_generated INT DEFAULT 0,
  answers_generated_today INT DEFAULT 0,
  answer_usage_rate FLOAT DEFAULT 0,
  
  -- Outcomes
  total_offers INT DEFAULT 0,
  offers_today INT DEFAULT 0,
  platform_success_rate FLOAT DEFAULT 0,
  
  -- Top data
  top_companies_today JSONB DEFAULT '[]'::JSONB,
  top_question_types JSONB DEFAULT '[]'::JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_created ON public.analytics_events(created_at);
CREATE INDEX idx_question_stats_pattern ON public.question_stats(question_pattern);
CREATE INDEX idx_question_stats_company ON public.question_stats(company_id);
CREATE INDEX idx_platform_stats_date ON public.platform_stats(stat_date);

CREATE TRIGGER update_question_stats_updated_at
  BEFORE UPDATE ON public.question_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_insights_updated_at
  BEFORE UPDATE ON public.company_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidate_stats_updated_at
  BEFORE UPDATE ON public.candidate_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

