export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analytics_events: {
        Row: {
          application_id: string | null
          company_id: string | null
          created_at: string | null
          device_type: string | null
          event_data: Json | null
          event_type: string
          id: string
          interview_id: string | null
          question_id: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          application_id?: string | null
          company_id?: string | null
          created_at?: string | null
          device_type?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          interview_id?: string | null
          question_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          application_id?: string | null
          company_id?: string | null
          created_at?: string | null
          device_type?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          interview_id?: string | null
          question_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      answer_selections: {
        Row: {
          created_at: string | null
          edit_distance: number | null
          final_answer_text: string | null
          generated_answer_id: string | null
          id: string
          interview_id: string
          question_id: string
          selected_at: string | null
          selection_type: string
          time_to_select_ms: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          edit_distance?: number | null
          final_answer_text?: string | null
          generated_answer_id?: string | null
          id?: string
          interview_id: string
          question_id: string
          selected_at?: string | null
          selection_type: string
          time_to_select_ms?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          edit_distance?: number | null
          final_answer_text?: string | null
          generated_answer_id?: string | null
          id?: string
          interview_id?: string
          question_id?: string
          selected_at?: string | null
          selection_type?: string
          time_to_select_ms?: number | null
          user_id?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          applied_at: string | null
          company_id: string | null
          created_at: string | null
          current_round: number | null
          days_in_process: number | null
          final_decision_at: string | null
          final_outcome: string | null
          first_response_at: string | null
          id: string
          job_description_id: string | null
          offer_deadline: string | null
          offer_details: Json | null
          offer_received_at: string | null
          recruiter_email: string | null
          recruiter_name: string | null
          referrer_name: string | null
          rejection_reason: string | null
          rejection_stage: string | null
          resume_id: string | null
          source: string | null
          status: string | null
          total_interviews: number | null
          total_questions_asked: number | null
          total_rounds_expected: number | null
          updated_at: string | null
          user_id: string
          user_notes: string | null
        }
        Insert: {
          applied_at?: string | null
          company_id?: string | null
          created_at?: string | null
          current_round?: number | null
          days_in_process?: number | null
          final_decision_at?: string | null
          final_outcome?: string | null
          first_response_at?: string | null
          id?: string
          job_description_id?: string | null
          offer_deadline?: string | null
          offer_details?: Json | null
          offer_received_at?: string | null
          recruiter_email?: string | null
          recruiter_name?: string | null
          referrer_name?: string | null
          rejection_reason?: string | null
          rejection_stage?: string | null
          resume_id?: string | null
          source?: string | null
          status?: string | null
          total_interviews?: number | null
          total_questions_asked?: number | null
          total_rounds_expected?: number | null
          updated_at?: string | null
          user_id: string
          user_notes?: string | null
        }
        Update: {
          applied_at?: string | null
          company_id?: string | null
          created_at?: string | null
          current_round?: number | null
          days_in_process?: number | null
          final_decision_at?: string | null
          final_outcome?: string | null
          first_response_at?: string | null
          id?: string
          job_description_id?: string | null
          offer_deadline?: string | null
          offer_details?: Json | null
          offer_received_at?: string | null
          recruiter_email?: string | null
          recruiter_name?: string | null
          referrer_name?: string | null
          rejection_reason?: string | null
          rejection_stage?: string | null
          resume_id?: string | null
          source?: string | null
          status?: string | null
          total_interviews?: number | null
          total_questions_asked?: number | null
          total_rounds_expected?: number | null
          updated_at?: string | null
          user_id?: string
          user_notes?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          avg_interview_duration_mins: number | null
          avg_interview_rounds: number | null
          avg_time_to_offer_days: number | null
          company_size: string | null
          created_at: string | null
          culture_notes: string | null
          glassdoor_rating: number | null
          id: string
          industry: string | null
          interview_process: Json | null
          logo_url: string | null
          name: string
          offer_rate: number | null
          tech_stack: Json | null
          total_applications: number | null
          total_interviews: number | null
          total_offers: number | null
          typical_questions: Json | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          avg_interview_duration_mins?: number | null
          avg_interview_rounds?: number | null
          avg_time_to_offer_days?: number | null
          company_size?: string | null
          created_at?: string | null
          culture_notes?: string | null
          glassdoor_rating?: number | null
          id?: string
          industry?: string | null
          interview_process?: Json | null
          logo_url?: string | null
          name: string
          offer_rate?: number | null
          tech_stack?: Json | null
          total_applications?: number | null
          total_interviews?: number | null
          total_offers?: number | null
          typical_questions?: Json | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          avg_interview_duration_mins?: number | null
          avg_interview_rounds?: number | null
          avg_time_to_offer_days?: number | null
          company_size?: string | null
          created_at?: string | null
          culture_notes?: string | null
          glassdoor_rating?: number | null
          id?: string
          industry?: string | null
          interview_process?: Json | null
          logo_url?: string | null
          name?: string
          offer_rate?: number | null
          tech_stack?: Json | null
          total_applications?: number | null
          total_interviews?: number | null
          total_offers?: number | null
          typical_questions?: Json | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      generated_answers: {
        Row: {
          answer_format: string | null
          answer_text: string
          completion_tokens: number | null
          created_at: string | null
          generation_time_ms: number | null
          id: string
          interview_id: string
          model_used: string | null
          prompt_tokens: number | null
          question_id: string
          resume_sections_used: Json | null
          token_count: number | null
          user_id: string
        }
        Insert: {
          answer_format?: string | null
          answer_text: string
          completion_tokens?: number | null
          created_at?: string | null
          generation_time_ms?: number | null
          id?: string
          interview_id: string
          model_used?: string | null
          prompt_tokens?: number | null
          question_id: string
          resume_sections_used?: Json | null
          token_count?: number | null
          user_id: string
        }
        Update: {
          answer_format?: string | null
          answer_text?: string
          completion_tokens?: number | null
          created_at?: string | null
          generation_time_ms?: number | null
          id?: string
          interview_id?: string
          model_used?: string | null
          prompt_tokens?: number | null
          question_id?: string
          resume_sections_used?: Json | null
          token_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      interviews: {
        Row: {
          actual_duration_seconds: number | null
          application_id: string | null
          company_id: string | null
          created_at: string | null
          ended_at: string | null
          feedback_negative: Json | null
          feedback_positive: Json | null
          feedback_received: boolean | null
          feedback_text: string | null
          id: string
          interview_outcome: string | null
          interview_type: string
          interviewer_linkedin: string | null
          interviewer_name: string | null
          interviewer_role: string | null
          job_description_id: string | null
          outcome_updated_at: string | null
          panel_size: number | null
          resume_id: string | null
          round_name: string | null
          round_number: number | null
          scheduled_at: string | null
          scheduled_duration_mins: number | null
          session_status: string | null
          started_at: string | null
          total_answers_generated: number | null
          total_answers_used: number | null
          total_questions: number | null
          updated_at: string | null
          used_assistant: boolean | null
          user_confidence_after: number | null
          user_confidence_before: number | null
          user_id: string
          user_notes: string | null
        }
        Insert: {
          actual_duration_seconds?: number | null
          application_id?: string | null
          company_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          feedback_negative?: Json | null
          feedback_positive?: Json | null
          feedback_received?: boolean | null
          feedback_text?: string | null
          id?: string
          interview_outcome?: string | null
          interview_type: string
          interviewer_linkedin?: string | null
          interviewer_name?: string | null
          interviewer_role?: string | null
          job_description_id?: string | null
          outcome_updated_at?: string | null
          panel_size?: number | null
          resume_id?: string | null
          round_name?: string | null
          round_number?: number | null
          scheduled_at?: string | null
          scheduled_duration_mins?: number | null
          session_status?: string | null
          started_at?: string | null
          total_answers_generated?: number | null
          total_answers_used?: number | null
          total_questions?: number | null
          updated_at?: string | null
          used_assistant?: boolean | null
          user_confidence_after?: number | null
          user_confidence_before?: number | null
          user_id: string
          user_notes?: string | null
        }
        Update: {
          actual_duration_seconds?: number | null
          application_id?: string | null
          company_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          feedback_negative?: Json | null
          feedback_positive?: Json | null
          feedback_received?: boolean | null
          feedback_text?: string | null
          id?: string
          interview_outcome?: string | null
          interview_type?: string
          interviewer_linkedin?: string | null
          interviewer_name?: string | null
          interviewer_role?: string | null
          job_description_id?: string | null
          outcome_updated_at?: string | null
          panel_size?: number | null
          resume_id?: string | null
          round_name?: string | null
          round_number?: number | null
          scheduled_at?: string | null
          scheduled_duration_mins?: number | null
          session_status?: string | null
          started_at?: string | null
          total_answers_generated?: number | null
          total_answers_used?: number | null
          total_questions?: number | null
          updated_at?: string | null
          used_assistant?: boolean | null
          user_confidence_after?: number | null
          user_confidence_before?: number | null
          user_id?: string
          user_notes?: string | null
        }
        Relationships: []
      }
      job_descriptions: {
        Row: {
          company_id: string | null
          content: string
          created_at: string | null
          department: string | null
          extracted_benefits: Json | null
          extracted_qualifications: Json | null
          extracted_requirements: Json | null
          extracted_responsibilities: Json | null
          id: string
          job_url: string | null
          level: string | null
          role_title: string
          salary_range: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string | null
          department?: string | null
          extracted_benefits?: Json | null
          extracted_qualifications?: Json | null
          extracted_requirements?: Json | null
          extracted_responsibilities?: Json | null
          id?: string
          job_url?: string | null
          level?: string | null
          role_title: string
          salary_range?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string | null
          department?: string | null
          extracted_benefits?: Json | null
          extracted_qualifications?: Json | null
          extracted_requirements?: Json | null
          extracted_responsibilities?: Json | null
          id?: string
          job_url?: string | null
          level?: string | null
          role_title?: string
          salary_range?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          company_id: string | null
          created_at: string | null
          detected_at: string | null
          difficulty_estimate: string | null
          id: string
          interview_id: string
          keywords: Json | null
          question_category: string | null
          question_pattern: string | null
          question_type: string | null
          text: string
          times_asked_globally: number | null
          timestamp_ms: number | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          detected_at?: string | null
          difficulty_estimate?: string | null
          id?: string
          interview_id: string
          keywords?: Json | null
          question_category?: string | null
          question_pattern?: string | null
          question_type?: string | null
          text: string
          times_asked_globally?: number | null
          timestamp_ms?: number | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          detected_at?: string | null
          difficulty_estimate?: string | null
          id?: string
          interview_id?: string
          keywords?: Json | null
          question_category?: string | null
          question_pattern?: string | null
          question_type?: string | null
          text?: string
          times_asked_globally?: number | null
          timestamp_ms?: number | null
          user_id?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          content: string
          created_at: string | null
          extracted_education: Json | null
          extracted_experience: Json | null
          extracted_projects: Json | null
          extracted_skills: Json | null
          file_url: string | null
          id: string
          is_active: boolean | null
          times_used: number | null
          title: string
          token_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          extracted_education?: Json | null
          extracted_experience?: Json | null
          extracted_projects?: Json | null
          extracted_skills?: Json | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          times_used?: number | null
          title?: string
          token_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          extracted_education?: Json | null
          extracted_experience?: Json | null
          extracted_projects?: Json | null
          extracted_skills?: Json | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          times_used?: number | null
          title?: string
          token_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          interview_id: string
          is_final: boolean | null
          speaker: string
          text: string
          timestamp_ms: number
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          interview_id: string
          is_final?: boolean | null
          speaker: string
          text: string
          timestamp_ms: number
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          interview_id?: string
          is_final?: boolean | null
          speaker?: string
          text?: string
          timestamp_ms?: number
        }
        Relationships: []
      }
      user_responses: {
        Row: {
          answer_selection_id: string | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          interview_id: string
          question_id: string
          similarity_to_generated: number | null
          similarity_to_selected: number | null
          spoken_text: string | null
          user_id: string
        }
        Insert: {
          answer_selection_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          interview_id: string
          question_id: string
          similarity_to_generated?: number | null
          similarity_to_selected?: number | null
          spoken_text?: string | null
          user_id: string
        }
        Update: {
          answer_selection_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          interview_id?: string
          question_id?: string
          similarity_to_generated?: number | null
          similarity_to_selected?: number | null
          spoken_text?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          current_role: string | null
          email: string | null
          full_name: string | null
          id: string
          job_search_status: string | null
          location: string | null
          remote_preference: string | null
          subscription_tier: string | null
          success_rate: number | null
          target_companies: Json | null
          target_role: string | null
          timezone: string | null
          total_applications: number | null
          total_interviews: number | null
          total_offers: number | null
          total_rejections: number | null
          updated_at: string | null
          years_experience: number | null
        }
        Insert: {
          created_at?: string | null
          current_role?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          job_search_status?: string | null
          location?: string | null
          remote_preference?: string | null
          subscription_tier?: string | null
          success_rate?: number | null
          target_companies?: Json | null
          target_role?: string | null
          timezone?: string | null
          total_applications?: number | null
          total_interviews?: number | null
          total_offers?: number | null
          total_rejections?: number | null
          updated_at?: string | null
          years_experience?: number | null
        }
        Update: {
          created_at?: string | null
          current_role?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          job_search_status?: string | null
          location?: string | null
          remote_preference?: string | null
          subscription_tier?: string | null
          success_rate?: number | null
          target_companies?: Json | null
          target_role?: string | null
          timezone?: string | null
          total_applications?: number | null
          total_interviews?: number | null
          total_offers?: number | null
          total_rejections?: number | null
          updated_at?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Commonly used types
export type User = Tables<'users'>
export type Resume = Tables<'resumes'>
export type Company = Tables<'companies'>
export type JobDescription = Tables<'job_descriptions'>
export type Application = Tables<'applications'>
export type Interview = Tables<'interviews'>
export type Transcript = Tables<'transcripts'>
export type Question = Tables<'questions'>
export type GeneratedAnswer = Tables<'generated_answers'>
export type AnswerSelection = Tables<'answer_selections'>
export type UserResponse = Tables<'user_responses'>
export type AnalyticsEvent = Tables<'analytics_events'>
