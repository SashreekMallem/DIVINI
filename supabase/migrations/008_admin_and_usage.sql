-- =============================================
-- ADMIN AND USAGE TRACKING
-- =============================================

-- Add admin flag to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Usage tracking for API calls
CREATE TABLE IF NOT EXISTS public.api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- API details
    api_type TEXT NOT NULL, -- 'gemini_answer', 'gemini_summary', 'assemblyai_transcription'
    
    -- Cost tracking
    input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    audio_seconds INT DEFAULT 0, -- For transcription
    
    -- Calculated costs (in USD cents for precision)
    cost_cents DECIMAL(10,4) DEFAULT 0,
    
    -- Context
    interview_id UUID REFERENCES public.interviews(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform pricing configuration
CREATE TABLE IF NOT EXISTS public.pricing_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- API costs (per unit, in USD)
    gemini_input_per_1k_tokens DECIMAL(10,6) DEFAULT 0.00015, -- $0.00015 per 1K input tokens
    gemini_output_per_1k_tokens DECIMAL(10,6) DEFAULT 0.0006, -- $0.0006 per 1K output tokens
    assemblyai_per_hour DECIMAL(10,4) DEFAULT 0.65, -- $0.65 per hour
    
    -- Markup configuration
    markup_percentage DECIMAL(5,2) DEFAULT 200.00, -- 200% markup (3x cost)
    
    -- Subscription tiers (monthly price in USD)
    tier_free_monthly_limit INT DEFAULT 10, -- 10 interviews free
    tier_basic_price DECIMAL(10,2) DEFAULT 29.00,
    tier_basic_interviews INT DEFAULT 50,
    tier_pro_price DECIMAL(10,2) DEFAULT 79.00,
    tier_pro_interviews INT DEFAULT 200,
    tier_unlimited_price DECIMAL(10,2) DEFAULT 199.00,
    
    -- Active config
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing config
INSERT INTO public.pricing_config (is_active) VALUES (true)
ON CONFLICT DO NOTHING;

-- Monthly billing summary per user
CREATE TABLE IF NOT EXISTS public.billing_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Period
    month_year TEXT NOT NULL, -- '2024-01' format
    
    -- Usage
    total_interviews INT DEFAULT 0,
    total_questions INT DEFAULT 0,
    total_audio_minutes DECIMAL(10,2) DEFAULT 0,
    total_gemini_calls INT DEFAULT 0,
    
    -- Costs
    total_cost_cents INT DEFAULT 0, -- Raw API cost
    total_revenue_cents INT DEFAULT 0, -- What user pays (with markup)
    
    -- Status
    payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'free'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, month_year)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON public.api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_type ON public.api_usage(api_type);
CREATE INDEX IF NOT EXISTS idx_billing_summary_user_month ON public.billing_summary(user_id, month_year);

-- RLS Policies
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_summary ENABLE ROW LEVEL SECURITY;

-- Users can see their own usage
CREATE POLICY "Users can view own usage" ON public.api_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own usage
CREATE POLICY "Users can insert own usage" ON public.api_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can see all usage
CREATE POLICY "Admins can view all usage" ON public.api_usage
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

-- Anyone can read pricing config
CREATE POLICY "Anyone can view pricing" ON public.pricing_config
    FOR SELECT USING (true);

-- Only admins can modify pricing
CREATE POLICY "Admins can modify pricing" ON public.pricing_config
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

-- Users can view own billing
CREATE POLICY "Users can view own billing" ON public.billing_summary
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all billing
CREATE POLICY "Admins can view all billing" ON public.billing_summary
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

-- Admins can modify billing
CREATE POLICY "Admins can modify billing" ON public.billing_summary
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

