import { notFound } from 'next/navigation';
import { getTutorialBySlug } from '@/lib/salesforce/queries/articles';
import { getQuestionsByArticleId } from '@/lib/salesforce/queries/questions';
import { EmbeddedQuestion } from '@/components/tutorials';
import type { Article, ArticleQuestion } from '@/types/domain';

export const revalidate = 300; // 5 minutes

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Mock data for development
const mockTutorial: Article = {
  id: 'mock-t1',
  title: 'Getting Started with JavaScript',
  slug: 'getting-started-javascript',
  body: `
    <h2>What is JavaScript?</h2>
    <p>JavaScript is a versatile programming language that powers the interactive web. It runs in web browsers and allows developers to create dynamic, engaging user experiences.</p>

    <h2>Key Concepts</h2>
    <p>In this tutorial, we'll cover the fundamental concepts of JavaScript:</p>
    <ul>
      <li>Variables and data types</li>
      <li>Functions and scope</li>
      <li>Control flow</li>
      <li>DOM manipulation</li>
    </ul>

    <h2>Variables</h2>
    <p>Variables are containers for storing data values. In modern JavaScript, we use <code>let</code> and <code>const</code> to declare variables:</p>
    <pre><code>let message = "Hello, World!";
const PI = 3.14159;</code></pre>
  `,
  excerpt: 'A comprehensive introduction to JavaScript for beginners.',
  featuredImage: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800&h=600&fit=crop',
  category: 'Tutorials',
  tags: ['javascript', 'beginner'],
  author: { id: 'a1', name: 'Cloud Climb', firstName: 'Cloud', lastName: 'Climb', avatar: '', bio: '', role: 'Author', slug: 'cloud-climb' },
  publishedDate: new Date(),
  readTime: 15,
  viewCount: 0,
  isFeatured: false,
  articleType: 'Tutorial',
};

const mockQuestions: ArticleQuestion[] = [
  {
    id: 'aq1',
    articleId: 'mock-t1',
    questionId: 'q1',
    sortOrder: 0,
    isRequired: false,
    question: {
      id: 'q1',
      name: 'Q-0001',
      questionText: 'What is the primary purpose of JavaScript in web development?',
      questionType: 'Multiple_Choice',
      difficultyLevel: 'Beginner',
      explanation: 'JavaScript is used to add interactivity and dynamic behavior to websites. While HTML provides structure and CSS provides styling, JavaScript enables user interactions, animations, and real-time updates.',
      points: 1,
      isActive: true,
      tags: ['javascript'],
      answers: [
        { id: 'a1', answerText: 'To provide structure and layout to web pages', isCorrect: false, sortOrder: 0 },
        { id: 'a2', answerText: 'To style and design web pages', isCorrect: false, sortOrder: 1 },
        { id: 'a3', answerText: 'To add interactivity and dynamic behavior', isCorrect: true, sortOrder: 2 },
        { id: 'a4', answerText: 'To store data in databases', isCorrect: false, sortOrder: 3 },
      ],
      testCases: [],
    },
  },
  {
    id: 'aq2',
    articleId: 'mock-t1',
    questionId: 'q2',
    sortOrder: 1,
    isRequired: false,
    question: {
      id: 'q2',
      name: 'Q-0002',
      questionText: 'Which keyword should you use to declare a variable that will never be reassigned?',
      questionType: 'Multiple_Choice',
      difficultyLevel: 'Beginner',
      explanation: 'The const keyword is used to declare variables that cannot be reassigned. Use let for variables that need to change, and avoid var in modern JavaScript.',
      points: 1,
      isActive: true,
      tags: ['javascript', 'variables'],
      answers: [
        { id: 'a5', answerText: 'var', isCorrect: false, sortOrder: 0 },
        { id: 'a6', answerText: 'let', isCorrect: false, sortOrder: 1 },
        { id: 'a7', answerText: 'const', isCorrect: true, sortOrder: 2 },
        { id: 'a8', answerText: 'define', isCorrect: false, sortOrder: 3 },
      ],
      testCases: [],
    },
  },
];

async function fetchTutorial(slug: string): Promise<{ tutorial: Article; questions: ArticleQuestion[] } | null> {
  try {
    const tutorial = await getTutorialBySlug(slug);
    if (!tutorial) {
      // Fall back to mock in development
      if (slug === 'getting-started-javascript') {
        return { tutorial: mockTutorial, questions: mockQuestions };
      }
      return null;
    }

    const questions = await getQuestionsByArticleId(tutorial.id);
    return { tutorial, questions };
  } catch (error) {
    console.error('[Tutorial] Failed to fetch:', error);
    // Fall back to mock in development
    if (slug === 'getting-started-javascript') {
      return { tutorial: mockTutorial, questions: mockQuestions };
    }
    return null;
  }
}

export default async function TutorialPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await fetchTutorial(slug);

  if (!data) {
    notFound();
  }

  const { tutorial, questions } = data;

  return (
    <main className="tutorial-view">
      <article className="tutorial-article">
        <header className="tutorial-article-header">
          <div className="container-prose">
            {tutorial.topic && (
              <span className="tutorial-topic">{tutorial.topic.name}</span>
            )}
            <h1 className="tutorial-article-title">{tutorial.title}</h1>
            {tutorial.subtitle && (
              <p className="tutorial-article-subtitle">{tutorial.subtitle}</p>
            )}
            <div className="tutorial-article-meta">
              <span>{tutorial.readTime} min read</span>
              <span>&middot;</span>
              <span>{tutorial.author.name}</span>
            </div>
          </div>
        </header>

        <div className="container-prose">
          <div
            className="tutorial-content prose"
            dangerouslySetInnerHTML={{ __html: tutorial.body }}
          />

          {questions.length > 0 && (
            <section className="tutorial-questions">
              <h2 className="tutorial-questions-title">Check Your Understanding</h2>
              <div className="tutorial-questions-list">
                {questions.map((aq, index) => (
                  <EmbeddedQuestion
                    key={aq.id}
                    articleQuestion={aq}
                    questionNumber={index + 1}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    </main>
  );
}
