-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USERS POLICIES
-- =============================================
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- =============================================
-- RESUMES POLICIES
-- =============================================
CREATE POLICY "Users can view own resumes"
  ON public.resumes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own resumes"
  ON public.resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes"
  ON public.resumes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes"
  ON public.resumes FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- COMPANIES POLICIES (Public read, authenticated create)
-- =============================================
CREATE POLICY "Anyone can view companies"
  ON public.companies FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update companies"
  ON public.companies FOR UPDATE
  USING (auth.role() = 'authenticated');

-- =============================================
-- JOB DESCRIPTIONS POLICIES
-- =============================================
CREATE POLICY "Users can view own job descriptions"
  ON public.job_descriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own job descriptions"
  ON public.job_descriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own job descriptions"
  ON public.job_descriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own job descriptions"
  ON public.job_descriptions FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- APPLICATIONS POLICIES
-- =============================================
CREATE POLICY "Users can view own applications"
  ON public.applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own applications"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications"
  ON public.applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own applications"
  ON public.applications FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- APPLICATION EVENTS POLICIES
-- =============================================
CREATE POLICY "Users can view own application events"
  ON public.application_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own application events"
  ON public.application_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- INTERVIEWS POLICIES
-- =============================================
CREATE POLICY "Users can view own interviews"
  ON public.interviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own interviews"
  ON public.interviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interviews"
  ON public.interviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interviews"
  ON public.interviews FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- TRANSCRIPTS POLICIES
-- =============================================
CREATE POLICY "Users can view own transcripts"
  ON public.transcripts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE interviews.id = transcripts.interview_id
      AND interviews.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transcripts for own interviews"
  ON public.transcripts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE interviews.id = interview_id
      AND interviews.user_id = auth.uid()
    )
  );

-- =============================================
-- QUESTIONS POLICIES
-- =============================================
CREATE POLICY "Users can view own questions"
  ON public.questions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own questions"
  ON public.questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own questions"
  ON public.questions FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- GENERATED ANSWERS POLICIES
-- =============================================
CREATE POLICY "Users can view own generated answers"
  ON public.generated_answers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own generated answers"
  ON public.generated_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- ANSWER SELECTIONS POLICIES
-- =============================================
CREATE POLICY "Users can view own answer selections"
  ON public.answer_selections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own answer selections"
  ON public.answer_selections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own answer selections"
  ON public.answer_selections FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- USER RESPONSES POLICIES
-- =============================================
CREATE POLICY "Users can view own responses"
  ON public.user_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own responses"
  ON public.user_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- ANALYTICS POLICIES
-- =============================================
CREATE POLICY "Users can view own analytics events"
  ON public.analytics_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Question stats - public read
CREATE POLICY "Anyone can view question stats"
  ON public.question_stats FOR SELECT
  USING (true);

-- Company insights - public read
CREATE POLICY "Anyone can view company insights"
  ON public.company_insights FOR SELECT
  USING (true);

-- Candidate stats - own only
CREATE POLICY "Users can view own candidate stats"
  ON public.candidate_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Platform stats - public read
CREATE POLICY "Anyone can view platform stats"
  ON public.platform_stats FOR SELECT
  USING (true);

