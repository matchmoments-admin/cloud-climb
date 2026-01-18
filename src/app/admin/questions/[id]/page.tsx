import Link from 'next/link';
import { notFound } from 'next/navigation';
import { QuestionForm } from '@/components/admin';
import { getQuestionById } from '@/lib/salesforce/queries/questions';
import type { Question } from '@/types/domain';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

// Mock question for development
const mockQuestion: Question = {
  id: 'mock-1',
  name: 'Q-0001',
  questionText: 'What is the primary purpose of JavaScript in web development?',
  questionType: 'Multiple_Choice',
  difficultyLevel: 'Beginner',
  explanation: 'JavaScript is used to add interactivity and dynamic behavior to websites.',
  points: 1,
  isActive: true,
  tags: ['javascript', 'fundamentals'],
  answers: [
    { id: 'a1', answerText: 'Provides structure and layout', isCorrect: false, sortOrder: 0 },
    { id: 'a2', answerText: 'Provides styles and visual design', isCorrect: false, sortOrder: 1 },
    { id: 'a3', answerText: 'Provides interactive functionality', isCorrect: true, sortOrder: 2 },
    { id: 'a4', answerText: 'Only used for animations', isCorrect: false, sortOrder: 3 },
  ],
  testCases: [],
};

async function fetchQuestion(id: string): Promise<Question | null> {
  try {
    const question = await getQuestionById(id);
    return question;
  } catch (error) {
    console.error('[Admin Question Edit] Failed to fetch question:', error);
    // Return mock in development
    if (id === 'mock-1') {
      return mockQuestion;
    }
    return null;
  }
}

export default async function EditQuestionPage({ params }: PageProps) {
  const { id } = await params;
  const question = await fetchQuestion(id);

  if (!question) {
    notFound();
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <nav className="admin-breadcrumb">
            <Link href="/admin/questions">Questions</Link>
            <span>/</span>
            <span>Edit</span>
          </nav>
          <h1 className="admin-page-title">Edit Question</h1>
          <p className="admin-page-subtitle">{question.name}</p>
        </div>
      </div>

      <QuestionForm question={question} mode="edit" />
    </div>
  );
}
