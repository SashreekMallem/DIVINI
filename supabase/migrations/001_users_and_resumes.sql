-- =============================================
-- USERS AND RESUMES
-- =============================================

-- Users/Candidates profiles (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  
  -- Profile data
  current_role TEXT,
  years_experience INT,
  target_role TEXT,
  target_companies JSONB DEFAULT '[]'::JSONB,
  job_search_status TEXT DEFAULT 'actively_looking', -- 'actively_looking', 'casually_looking', 'employed_open', 'not_looking'
  
  -- Location
  location TEXT,
  timezone TEXT,
  remote_preference TEXT DEFAULT 'flexible', -- 'remote', 'hybrid', 'onsite', 'flexible'
  
  -- Stats (aggregated - updated via triggers)
  total_applications INT DEFAULT 0,
  total_interviews INT DEFAULT 0,
  total_offers INT DEFAULT 0,
  total_rejections INT DEFAULT 0,
  success_rate FLOAT DEFAULT 0,
  
  -- Subscription
  subscription_tier TEXT DEFAULT 'free',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User resumes
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL DEFAULT 'My Resume',
  content TEXT NOT NULL,
  file_url TEXT, -- if uploaded as file
  
  -- Extracted data (parsed from resume)
  extracted_skills JSONB DEFAULT '[]'::JSONB,
  extracted_experience JSONB DEFAULT '[]'::JSONB,
  extracted_projects JSONB DEFAULT '[]'::JSONB,
  extracted_education JSONB DEFAULT '[]'::JSONB,
  
  token_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Usage tracking
  times_used INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_resumes_user_id ON public.resumes(user_id);
CREATE INDEX idx_resumes_is_active ON public.resumes(is_active);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resumes_updated_at
  BEFORE UPDATE ON public.resumes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

