-- =============================================
-- QUESTIONS AND ANSWERS
-- =============================================

-- Questions detected during interviews
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Question data
  text TEXT NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  timestamp_ms INT, -- when in the interview
  
  -- Classification
  question_type TEXT, -- 'behavioral', 'technical', 'system_design', 'situational', 'culture_fit', 'salary', 'other'
  question_category TEXT, -- 'leadership', 'conflict', 'failure', 'success', 'coding', 'architecture'
  difficulty_estimate TEXT, -- 'easy', 'medium', 'hard'
  
  -- Pattern matching (for analytics)
  question_pattern TEXT, -- 'tell_me_about_time', 'how_would_you', 'design_a', 'walk_me_through'
  keywords JSONB DEFAULT '[]'::JSONB,
  
  -- Stats
  times_asked_globally INT DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated answers (single answer per question)
CREATE TABLE public.generated_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Answer content
  answer_text TEXT NOT NULL,
  answer_format TEXT DEFAULT 'star', -- 'star', 'conversational', 'technical', 'concise'
  token_count INT DEFAULT 0,
  
  -- Generation metadata
  model_used TEXT DEFAULT 'gemini-2.5-flash',
  prompt_tokens INT,
  completion_tokens INT,
  generation_time_ms INT,
  
  -- Resume context used
  resume_sections_used JSONB DEFAULT '[]'::JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Answer selections (what user did with the generated answer)
CREATE TABLE public.answer_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  generated_answer_id UUID REFERENCES public.generated_answers(id) ON DELETE SET NULL,
  
  -- What was selected
  selection_type TEXT NOT NULL, -- 'used', 'edited', 'custom', 'skipped'
  
  -- If edited or custom
  final_answer_text TEXT,
  edit_distance INT, -- how much they changed it (0-100%)
  
  -- Timing
  time_to_select_ms INT,
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- What the user actually said (transcribed response)
CREATE TABLE public.user_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  answer_selection_id UUID REFERENCES public.answer_selections(id) ON DELETE SET NULL,
  
  -- Actual response
  spoken_text TEXT,
  duration_seconds INT,
  
  -- Comparison
  similarity_to_generated FLOAT, -- 0-1
  similarity_to_selected FLOAT, -- 0-1
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_questions_interview_id ON public.questions(interview_id);
CREATE INDEX idx_questions_company_id ON public.questions(company_id);
CREATE INDEX idx_questions_type ON public.questions(question_type);
CREATE INDEX idx_questions_pattern ON public.questions(question_pattern);
CREATE INDEX idx_generated_answers_question_id ON public.generated_answers(question_id);
CREATE INDEX idx_answer_selections_question_id ON public.answer_selections(question_id);
CREATE INDEX idx_user_responses_question_id ON public.user_responses(question_id);

