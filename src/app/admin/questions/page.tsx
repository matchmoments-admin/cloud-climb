import Link from 'next/link';
import { QuestionList } from '@/components/admin/question-list';
import { getQuestions } from '@/lib/salesforce/queries/questions';
import type { Question } from '@/types/domain';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Mock questions for development when Salesforce isn't available
const mockQuestions: Question[] = [
  {
    id: 'mock-1',
    name: 'Q-0001',
    questionText: 'What is the primary purpose of JavaScript in web development?',
    questionType: 'Multiple_Choice',
    difficultyLevel: 'Beginner',
    points: 1,
    isActive: true,
    tags: ['javascript', 'fundamentals'],
    answers: [],
    testCases: [],
  },
  {
    id: 'mock-2',
    name: 'Q-0002',
    questionText: 'Write a function that returns the sum of two numbers.',
    questionType: 'Code_Completion',
    difficultyLevel: 'Beginner',
    codeLanguage: 'JavaScript',
    points: 5,
    isActive: true,
    tags: ['javascript', 'functions'],
    answers: [],
    testCases: [],
  },
];

async function fetchQuestions(): Promise<Question[]> {
  try {
    const questions = await getQuestions({ limit: 100 });
    return questions.length > 0 ? questions : mockQuestions;
  } catch (error) {
    console.error('[Admin Questions] Failed to fetch questions:', error);
    return mockQuestions;
  }
}

export default async function AdminQuestionsPage() {
  const questions = await fetchQuestions();

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Questions</h1>
          <p className="admin-page-subtitle">
            Manage quiz and exercise questions
          </p>
        </div>
        <Link href="/admin/questions/new" className="btn btn-teal">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mr-2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Question
        </Link>
      </div>

      <QuestionList questions={questions} />
    </div>
  );
}
