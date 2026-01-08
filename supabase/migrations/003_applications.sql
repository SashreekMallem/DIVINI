-- =============================================
-- APPLICATIONS (CANDIDATE JOURNEY TRACKING)
-- =============================================

-- Job applications (tracks candidate's full journey with each company)
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  job_description_id UUID REFERENCES public.job_descriptions(id) ON DELETE SET NULL,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  
  -- Application details
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT, -- 'linkedin', 'company_website', 'referral', 'recruiter'
  referrer_name TEXT,
  recruiter_name TEXT,
  recruiter_email TEXT,
  
  -- Pipeline status
  status TEXT DEFAULT 'applied', -- 'applied', 'screening', 'interviewing', 'offer', 'rejected', 'withdrawn', 'accepted', 'declined'
  current_round INT DEFAULT 0,
  total_rounds_expected INT,
  
  -- Timeline
  first_response_at TIMESTAMPTZ,
  offer_received_at TIMESTAMPTZ,
  offer_deadline TIMESTAMPTZ,
  final_decision_at TIMESTAMPTZ,
  
  -- Offer details (if received)
  offer_details JSONB, -- {base: 180000, bonus: 20000, equity: '50000 RSUs', benefits: [...]}
  
  -- Outcome
  final_outcome TEXT, -- 'offer_accepted', 'offer_declined', 'rejected', 'withdrawn', 'ghosted'
  rejection_reason TEXT,
  rejection_stage TEXT,
  
  -- Notes
  user_notes TEXT,
  
  -- Stats
  total_interviews INT DEFAULT 0,
  total_questions_asked INT DEFAULT 0,
  days_in_process INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Application timeline events
CREATE TABLE public.application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL, -- 'applied', 'response_received', 'interview_scheduled', 'interview_completed', 'offer_received', 'rejected', 'withdrawn'
  event_date TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_applications_user_id ON public.applications(user_id);
CREATE INDEX idx_applications_company_id ON public.applications(company_id);
CREATE INDEX idx_applications_status ON public.applications(status);
CREATE INDEX idx_application_events_application_id ON public.application_events(application_id);

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update days_in_process
CREATE OR REPLACE FUNCTION update_days_in_process()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.final_decision_at IS NOT NULL THEN
    NEW.days_in_process = EXTRACT(DAY FROM NEW.final_decision_at - NEW.applied_at)::INT;
  ELSE
    NEW.days_in_process = EXTRACT(DAY FROM NOW() - NEW.applied_at)::INT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_days_in_process
  BEFORE INSERT OR UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION update_days_in_process();

