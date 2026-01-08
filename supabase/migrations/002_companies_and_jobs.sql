-- =============================================
-- COMPANIES AND JOB DESCRIPTIONS
-- =============================================

-- Companies database (shared across all users)
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  website TEXT,
  industry TEXT,
  company_size TEXT, -- 'startup', 'mid', 'large', 'enterprise'
  tech_stack JSONB DEFAULT '[]'::JSONB,
  culture_notes TEXT,
  glassdoor_rating FLOAT,
  
  -- Interview process info (aggregated from all users)
  interview_process JSONB DEFAULT '{"rounds": []}'::JSONB,
  avg_interview_rounds FLOAT DEFAULT 0,
  avg_time_to_offer_days FLOAT DEFAULT 0,
  typical_questions JSONB DEFAULT '[]'::JSONB,
  
  -- Platform stats
  total_applications INT DEFAULT 0,
  total_interviews INT DEFAULT 0,
  total_offers INT DEFAULT 0,
  offer_rate FLOAT DEFAULT 0,
  avg_interview_duration_mins INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job descriptions/postings
CREATE TABLE public.job_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  
  -- Job details
  role_title TEXT NOT NULL,
  level TEXT, -- 'L5', 'Senior', 'Staff', 'Principal'
  department TEXT,
  job_url TEXT,
  salary_range JSONB, -- {min: 150000, max: 200000, currency: 'USD'}
  
  -- Content
  content TEXT NOT NULL,
  
  -- Extracted data
  extracted_requirements JSONB DEFAULT '[]'::JSONB,
  extracted_responsibilities JSONB DEFAULT '[]'::JSONB,
  extracted_qualifications JSONB DEFAULT '[]'::JSONB,
  extracted_benefits JSONB DEFAULT '[]'::JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_companies_name ON public.companies(name);
CREATE INDEX idx_job_descriptions_user_id ON public.job_descriptions(user_id);
CREATE INDEX idx_job_descriptions_company_id ON public.job_descriptions(company_id);

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_descriptions_updated_at
  BEFORE UPDATE ON public.job_descriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

