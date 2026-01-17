export type QuestionType = 
  | 'behavioral'
  | 'technical'
  | 'system_design'
  | 'situational'
  | 'culture_fit'
  | 'salary'
  | 'other'

export type QuestionCategory =
  | 'leadership'
  | 'conflict'
  | 'failure'
  | 'success'
  | 'teamwork'
  | 'problem_solving'
  | 'coding'
  | 'architecture'
  | 'algorithms'
  | 'database'
  | 'general'

export type QuestionPattern =
  | 'tell_me_about_time'
  | 'how_would_you'
  | 'design_a'
  | 'walk_me_through'
  | 'what_is'
  | 'why_do_you'
  | 'describe'
  | 'other'

interface QuestionAnalysis {
  isQuestion: boolean
  questionType: QuestionType
  questionCategory: QuestionCategory
  questionPattern: QuestionPattern
  keywords: string[]
  difficulty: 'easy' | 'medium' | 'hard'
}

export function analyzeQuestion(text: string): QuestionAnalysis {
  const lower = text.toLowerCase().trim()
  
  // Check if it's a question
  const isQuestion = detectQuestion(lower)
  
  // Detect type
  const questionType = detectQuestionType(lower)
  
  // Detect category
  const questionCategory = detectQuestionCategory(lower)
  
  // Detect pattern
  const questionPattern = detectQuestionPattern(lower)
  
  // Extract keywords
  const keywords = extractKeywords(lower)
  
  // Estimate difficulty
  const difficulty = estimateDifficulty(lower, questionType)
  
  return {
    isQuestion,
    questionType,
    questionCategory,
    questionPattern,
    keywords,
    difficulty,
  }
}

function detectQuestion(text: string): boolean {
  // Ends with question mark
  if (text.endsWith('?')) return true
  
  // Starts with question words
  const questionStarts = [
    'what', 'how', 'why', 'when', 'where', 'who', 'which',
    'tell me', 'describe', 'explain', 'walk me through',
    'can you', 'could you', 'would you', 'have you',
    'design', 'implement', 'build', 'create',
  ]
  
  return questionStarts.some(start => text.startsWith(start))
}

function detectQuestionType(text: string): QuestionType {
  // Behavioral patterns
  const behavioralPatterns = [
    'tell me about a time',
    'describe a situation',
    'give me an example',
    'have you ever',
    'what would you do if',
  ]
  if (behavioralPatterns.some(p => text.includes(p))) return 'behavioral'
  
  // System design patterns
  const systemDesignPatterns = [
    'design a',
    'architect',
    'scale to',
    'million users',
    'distributed',
    'how would you build',
  ]
  if (systemDesignPatterns.some(p => text.includes(p))) return 'system_design'
  
  // Technical patterns
  const technicalPatterns = [
    'implement',
    'code',
    'algorithm',
    'complexity',
    'optimize',
    'data structure',
    'function',
    'class',
  ]
  if (technicalPatterns.some(p => text.includes(p))) return 'technical'
  
  // Culture fit
  const culturePatterns = [
    'why do you want',
    'what interests you',
    'ideal work environment',
    'team culture',
    'work-life',
  ]
  if (culturePatterns.some(p => text.includes(p))) return 'culture_fit'
  
  // Salary
  const salaryPatterns = [
    'salary',
    'compensation',
    'expectations',
    'offer',
  ]
  if (salaryPatterns.some(p => text.includes(p))) return 'salary'
  
  // Situational
  const situationalPatterns = [
    'what would you do',
    'how would you handle',
    'imagine that',
  ]
  if (situationalPatterns.some(p => text.includes(p))) return 'situational'
  
  return 'other'
}

function detectQuestionCategory(text: string): QuestionCategory {
  const categoryKeywords: Record<QuestionCategory, string[]> = {
    leadership: ['lead', 'manage', 'team', 'mentor', 'decision'],
    conflict: ['conflict', 'disagree', 'difficult', 'challenge', 'push back'],
    failure: ['fail', 'mistake', 'wrong', 'learn from', 'setback'],
    success: ['success', 'proud', 'accomplish', 'achieve', 'impact'],
    teamwork: ['team', 'collaborate', 'together', 'cross-functional'],
    problem_solving: ['solve', 'problem', 'issue', 'debug', 'fix'],
    coding: ['code', 'implement', 'write', 'function', 'algorithm'],
    architecture: ['design', 'architect', 'system', 'scale', 'distributed'],
    algorithms: ['algorithm', 'complexity', 'optimize', 'data structure'],
    database: ['database', 'sql', 'query', 'schema', 'index'],
    general: [],
  }
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(k => text.includes(k))) {
      return category as QuestionCategory
    }
  }
  
  return 'general'
}

function detectQuestionPattern(text: string): QuestionPattern {
  if (text.includes('tell me about a time') || text.includes('tell me about when')) {
    return 'tell_me_about_time'
  }
  if (text.startsWith('how would you') || text.startsWith('how do you')) {
    return 'how_would_you'
  }
  if (text.startsWith('design a') || text.includes('design a system')) {
    return 'design_a'
  }
  if (text.includes('walk me through') || text.includes('walk through')) {
    return 'walk_me_through'
  }
  if (text.startsWith('what is') || text.startsWith('what are')) {
    return 'what_is'
  }
  if (text.startsWith('why do you') || text.startsWith('why are you')) {
    return 'why_do_you'
  }
  if (text.startsWith('describe')) {
    return 'describe'
  }
  
  return 'other'
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'under', 'again', 'further', 'then', 'once', 'here',
    'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
    'because', 'until', 'while', 'about', 'against', 'tell', 'me', 'you',
    'your', 'i', 'my', 'we', 'our', 'they', 'their', 'it', 'its', 'this',
    'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose',
  ])
  
  const words = text
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
  
  // Get unique keywords
  return [...new Set(words)].slice(0, 10)
}

function estimateDifficulty(text: string, type: QuestionType): 'easy' | 'medium' | 'hard' {
  // System design is usually hard
  if (type === 'system_design') return 'hard'
  
  // Technical with complexity keywords
  const hardKeywords = ['optimize', 'scale', 'distributed', 'million', 'billion', 'complex']
  if (hardKeywords.some(k => text.includes(k))) return 'hard'
  
  // Basic questions
  const easyKeywords = ['introduce', 'tell me about yourself', 'why this company', 'strengths']
  if (easyKeywords.some(k => text.includes(k))) return 'easy'
  
  return 'medium'
}

