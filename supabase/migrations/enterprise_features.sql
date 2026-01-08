-- Enterprise Interview System - Database Migration
-- Run this in Supabase SQL Editor

-- 1. Enable pgvector extension (may already be enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to questions for similarity search
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. Add columns to track AI vs user responses
ALTER TABLE generated_answers 
ADD COLUMN IF NOT EXISTS user_actually_said TEXT;

ALTER TABLE generated_answers 
ADD COLUMN IF NOT EXISTS user_used_suggestion BOOLEAN DEFAULT NULL;

-- 4. Create interview summaries table for cross-session memory
CREATE TABLE IF NOT EXISTS interview_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  strengths JSONB DEFAULT '[]'::jsonb,
  weaknesses JSONB DEFAULT '[]'::jsonb,
  key_insights TEXT,
  question_count INTEGER DEFAULT 0,
  avg_confidence FLOAT,
  ai_adoption_rate FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create ideal answers table for company-specific answer templates
CREATE TABLE IF NOT EXISTS ideal_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  job_description_id UUID REFERENCES job_descriptions(id),
  question_pattern TEXT NOT NULL,
  ideal_response TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create indexes for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_questions_embedding 
ON questions USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_ideal_answers_embedding 
ON ideal_answers USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- 7. Function to find similar questions from past interviews
CREATE OR REPLACE FUNCTION match_similar_questions(
  query_embedding vector(768),
  match_user_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  text TEXT,
  generated_answer TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.text,
    ga.answer_text,
    (1 - (q.embedding <=> query_embedding))::FLOAT AS similarity
  FROM questions q
  JOIN generated_answers ga ON ga.question_id = q.id
  JOIN interviews i ON q.interview_id = i.id
  WHERE i.user_id = match_user_id
    AND q.embedding IS NOT NULL
    AND (1 - (q.embedding <=> query_embedding)) > match_threshold
  ORDER BY q.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to find matching ideal answers for a company
CREATE OR REPLACE FUNCTION match_ideal_answers(
  query_embedding vector(768),
  match_company_id UUID,
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  question_pattern TEXT,
  ideal_response TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ia.id,
    ia.question_pattern,
    ia.ideal_response,
    (1 - (ia.embedding <=> query_embedding))::FLOAT AS similarity
  FROM ideal_answers ia
  WHERE ia.company_id = match_company_id
    AND ia.embedding IS NOT NULL
    AND (1 - (ia.embedding <=> query_embedding)) > match_threshold
  ORDER BY ia.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- 9. RLS policies for new tables
ALTER TABLE interview_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideal_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interview summaries" 
ON interview_summaries FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interview summaries" 
ON interview_summaries FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view ideal answers" 
ON ideal_answers FOR SELECT 
USING (true);
