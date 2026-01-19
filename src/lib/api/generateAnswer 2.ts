import type { Resume, JobDescription, Question } from '@/types/database'

interface GenerateAnswerParams {
  question: string
  questionType: string
  questionCategory: string
  resume: Resume
  jobDescription?: JobDescription | null
  companyName: string
  interviewContext?: string
}

interface GeneratedAnswer {
  answerText: string
  answerFormat: string
  resumeSectionsUsed: string[]
  generationTimeMs: number
}

export async function generateAnswer(params: GenerateAnswerParams): Promise<GeneratedAnswer> {
  const startTime = Date.now()
  
  const { question, questionType, questionCategory, resume, jobDescription, companyName, interviewContext } = params
  
  // Build the prompt
  const prompt = buildPrompt(params)
  
  // Call the Edge Function
  const response = await fetch('/api/generate-answer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      question,
      questionType,
      questionCategory,
    }),
  })
  
  if (!response.ok) {
    throw new Error('Failed to generate answer')
  }
  
  const data = await response.json()
  
  return {
    answerText: data.answer,
    answerFormat: determineFormat(questionType),
    resumeSectionsUsed: extractUsedSections(data.answer, resume),
    generationTimeMs: Date.now() - startTime,
  }
}

function buildPrompt(params: GenerateAnswerParams): string {
  const { question, questionType, questionCategory, resume, jobDescription, companyName, interviewContext } = params
  
  let prompt = `You are an expert interview coach helping a candidate answer interview questions. Generate a complete, natural-sounding answer that the candidate can read verbatim during their interview.

CANDIDATE'S RESUME:
${resume.content}

COMPANY: ${companyName}
${jobDescription ? `\nJOB DESCRIPTION:\n${jobDescription.content}` : ''}

${interviewContext ? `\nINTERVIEW CONTEXT (previous Q&A):\n${interviewContext}` : ''}

QUESTION TYPE: ${questionType}
QUESTION CATEGORY: ${questionCategory}

INTERVIEWER'S QUESTION:
"${question}"

Generate a complete answer that:
1. Is personalized to the candidate's actual experience from their resume
2. Uses specific examples, projects, and technologies mentioned in their resume
3. Follows the ${getFormatGuidance(questionType)}
4. Is 30-60 seconds when spoken (150-300 words)
5. Sounds natural and conversational, not robotic
6. Highlights relevant skills for this specific job
7. Shows enthusiasm for the company/role

IMPORTANT: Generate ONLY the answer text that the candidate should speak. Do not include any labels, headers, or meta-commentary. Start directly with the answer.`

  return prompt
}

function getFormatGuidance(questionType: string): string {
  switch (questionType) {
    case 'behavioral':
      return 'STAR method (Situation, Task, Action, Result)'
    case 'technical':
      return 'structured technical explanation with examples'
    case 'system_design':
      return 'systematic approach: requirements, high-level design, deep dive, trade-offs'
    case 'situational':
      return 'clear reasoning and decision-making process'
    case 'culture_fit':
      return 'authentic, personal response with specific examples'
    default:
      return 'clear, structured response'
  }
}

function determineFormat(questionType: string): string {
  switch (questionType) {
    case 'behavioral':
      return 'star'
    case 'technical':
      return 'technical'
    case 'system_design':
      return 'technical'
    default:
      return 'conversational'
  }
}

function extractUsedSections(answer: string, resume: Resume): string[] {
  const sections: string[] = []
  const answerLower = answer.toLowerCase()
  
  // Check if skills were mentioned
  if (Array.isArray(resume.extracted_skills)) {
    const skills = resume.extracted_skills as string[]
    if (skills.some(skill => answerLower.includes(skill.toLowerCase()))) {
      sections.push('skills')
    }
  }
  
  // Check if experience was mentioned
  if (Array.isArray(resume.extracted_experience)) {
    const experience = resume.extracted_experience as { company?: string }[]
    if (experience.some(exp => exp.company && answerLower.includes(exp.company.toLowerCase()))) {
      sections.push('experience')
    }
  }
  
  // Check if projects were mentioned
  if (Array.isArray(resume.extracted_projects)) {
    const projects = resume.extracted_projects as { name?: string }[]
    if (projects.some(proj => proj.name && answerLower.includes(proj.name.toLowerCase()))) {
      sections.push('projects')
    }
  }
  
  return sections
}

