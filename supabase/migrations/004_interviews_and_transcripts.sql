-- =============================================
-- INTERVIEWS AND TRANSCRIPTS
-- =============================================

-- Interview sessions
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  job_description_id UUID REFERENCES public.job_descriptions(id) ON DELETE SET NULL,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  
  -- Interview details
  interview_type TEXT NOT NULL, -- 'phone_screen', 'recruiter_call', 'technical', 'behavioral', 'system_design', 'coding', 'onsite', 'hiring_manager', 'team_match', 'final'
  round_number INT DEFAULT 1,
  round_name TEXT,
  
  -- Interviewer info
  interviewer_name TEXT,
  interviewer_role TEXT,
  interviewer_linkedin TEXT,
  panel_size INT DEFAULT 1,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  scheduled_duration_mins INT DEFAULT 60,
  
  -- Session data
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  actual_duration_seconds INT,
  session_status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'
  
  -- Platform usage
  used_assistant BOOLEAN DEFAULT true,
  
  -- Outcome
  interview_outcome TEXT, -- 'passed', 'failed', 'pending', 'unknown'
  outcome_updated_at TIMESTAMPTZ,
  user_confidence_before INT, -- 1-10
  user_confidence_after INT, -- 1-10
  user_notes TEXT,
  
  -- Feedback received
  feedback_received BOOLEAN DEFAULT false,
  feedback_text TEXT,
  feedback_positive JSONB DEFAULT '[]'::JSONB,
  feedback_negative JSONB DEFAULT '[]'::JSONB,
  
  -- Stats
  total_questions INT DEFAULT 0,
  total_answers_generated INT DEFAULT 0,
  total_answers_used INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transcript segments
CREATE TABLE public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  
  timestamp_ms INT NOT NULL, -- milliseconds from interview start
  speaker TEXT NOT NULL, -- 'interviewer', 'candidate', 'unknown'
  text TEXT NOT NULL,
  is_final BOOLEAN DEFAULT false, -- partial vs final transcript
  confidence FLOAT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_interviews_user_id ON public.interviews(user_id);
CREATE INDEX idx_interviews_application_id ON public.interviews(application_id);
CREATE INDEX idx_interviews_company_id ON public.interviews(company_id);
CREATE INDEX idx_interviews_session_status ON public.interviews(session_status);
CREATE INDEX idx_transcripts_interview_id ON public.transcripts(interview_id);
CREATE INDEX idx_transcripts_timestamp ON public.transcripts(timestamp_ms);

CREATE TRIGGER update_interviews_updated_at
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

