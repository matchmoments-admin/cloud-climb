import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArticleCardGrid } from '@/components/blog/article-card';
import { getExerciseBySlug, getExercises } from '@/lib/salesforce/queries/articles';
import { formatDate } from '@/lib/utils';
import type { Metadata } from 'next';
import type { Article } from '@/types/domain';

export const dynamic = 'force-dynamic';

// Mock exercise for development
const mockExercise: Article = {
  id: 'mock-e1',
  title: 'Integer Hypotenuse',
  slug: 'integer-hypotenuse',
  body: `
    <h2>Challenge</h2>
    <p>Given two positive integers <code>a</code> and <code>b</code> representing the legs of a right triangle, determine if the hypotenuse is an integer.</p>

    <p>Remember from the Pythagorean theorem: <code>a² + b² = c²</code></p>

    <h3>Input</h3>
    <ul>
      <li><code>a</code>: A positive integer (first leg)</li>
      <li><code>b</code>: A positive integer (second leg)</li>
    </ul>

    <h3>Output</h3>
    <p>Return <code>true</code> if the hypotenuse is an integer, <code>false</code> otherwise.</p>

    <h3>Examples</h3>
    <ul>
      <li><code>isIntegerHypotenuse(3, 4)</code> → <code>true</code> (3-4-5 is a classic Pythagorean triple)</li>
      <li><code>isIntegerHypotenuse(5, 12)</code> → <code>true</code> (5-12-13 is another Pythagorean triple)</li>
      <li><code>isIntegerHypotenuse(1, 2)</code> → <code>false</code> (sqrt(5) is not an integer)</li>
    </ul>
  `,
  excerpt: 'Determine if the hypotenuse of a right triangle with given legs is an integer.',
  featuredImage: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1200&q=80',
  category: 'Exercises',
  tags: ['javascript', 'math', 'beginner'],
  author: {
    id: 'a1',
    name: 'Cloud Climb',
    firstName: 'Cloud',
    lastName: 'Climb',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    bio: 'Teaching developers to climb higher with hands-on coding challenges.',
    role: 'Author',
    slug: 'cloud-climb',
  },
  publishedDate: new Date('2026-01-18'),
  readTime: 10,
  viewCount: 0,
  isFeatured: false,
  articleType: 'Exercise',
  starterCode: `function isIntegerHypotenuse(a, b) {
  // Your code here

}`,
  solutionCode: `function isIntegerHypotenuse(a, b) {
  const c = Math.sqrt(a * a + b * b);
  return Number.isInteger(c);
}`,
};

const mockRelatedExercises: Article[] = [
  {
    id: 'mock-e2',
    title: 'FizzBuzz',
    slug: 'fizzbuzz',
    body: '<p>Classic FizzBuzz problem.</p>',
    excerpt: 'Write a function that returns "Fizz", "Buzz", or "FizzBuzz" based on divisibility.',
    featuredImage: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&q=80',
    category: 'Exercises',
    tags: ['javascript', 'loops', 'beginner'],
    author: mockExercise.author,
    publishedDate: new Date('2026-01-16'),
    readTime: 5,
    viewCount: 0,
    isFeatured: false,
    articleType: 'Exercise',
  },
  {
    id: 'mock-e3',
    title: 'Array Sum',
    slug: 'array-sum',
    body: '<p>Sum all numbers in an array.</p>',
    excerpt: 'Write a function that calculates the sum of all numbers in an array.',
    featuredImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
    category: 'Exercises',
    tags: ['javascript', 'arrays', 'beginner'],
    author: mockExercise.author,
    publishedDate: new Date('2026-01-14'),
    readTime: 5,
    viewCount: 0,
    isFeatured: false,
    articleType: 'Exercise',
  },
];

interface ExercisePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ExercisePageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const exercise = await getExerciseBySlug(slug);
    if (!exercise) {
      return { title: 'Exercise Not Found' };
    }

    return {
      title: `${exercise.title} | JavaScript Exercise`,
      description: exercise.excerpt,
      openGraph: {
        title: exercise.title,
        description: exercise.excerpt,
        images: [{ url: exercise.featuredImage }],
        type: 'article',
      },
    };
  } catch {
    return {
      title: `${mockExercise.title} | JavaScript Exercise`,
      description: mockExercise.excerpt,
    };
  }
}

function getCodePenUrl(code: string): string {
  return `https://codepen.io/pen/?js=${encodeURIComponent(code)}`;
}

export default async function ExercisePage({ params }: ExercisePageProps) {
  const { slug } = await params;

  let exercise: Article | null = null;
  let relatedExercises: Article[] = [];

  try {
    exercise = await getExerciseBySlug(slug);
    if (exercise) {
      const allExercises = await getExercises(4);
      relatedExercises = allExercises.filter((e) => e.slug !== slug).slice(0, 3);
    }
  } catch (error) {
    console.error('Failed to fetch exercise from Salesforce:', error);
  }

  // Use mock data if Salesforce fails or exercise not found
  if (!exercise) {
    if (slug === mockExercise.slug) {
      exercise = mockExercise;
      relatedExercises = mockRelatedExercises;
    } else {
      notFound();
    }
  }

  if (relatedExercises.length === 0) {
    relatedExercises = mockRelatedExercises;
  }

  const codePenUrl = exercise.starterCode ? getCodePenUrl(exercise.starterCode) : null;

  return (
    <article>
      {/* Article Header */}
      <header className="container-wide pt-12 pb-8 md:pt-16 md:pb-12">
        <div className="article-header">
          {/* Meta */}
          <div className="article-meta">
            <Link href="/exercises" className="category-pill">
              Exercises
            </Link>
            <span className="article-meta-divider" />
            <time dateTime={exercise.publishedDate.toISOString()}>
              {formatDate(exercise.publishedDate)}
            </time>
            <span className="article-meta-divider" />
            <span>{exercise.readTime} min</span>
          </div>

          {/* Title */}
          <h1 className="article-title">{exercise.title}</h1>

          {/* Subtitle/Excerpt */}
          {exercise.excerpt && (
            <p className="article-subtitle">{exercise.excerpt}</p>
          )}
        </div>
      </header>

      {/* Featured Image */}
      <div className="container-content mb-12 md:mb-16">
        <div className="relative aspect-[2/1] md:aspect-[21/9] overflow-hidden rounded-[var(--radius-xl)]">
          <Image
            src={exercise.featuredImage}
            alt={exercise.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 960px) 100vw, 960px"
          />
        </div>
      </div>

      {/* Article Content */}
      <div className="container-prose pb-8">
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: exercise.body }}
        />
      </div>

      {/* Starter Code + CodePen Button */}
      {exercise.starterCode && (
        <div className="container-prose pb-8">
          <h2 className="text-xl font-semibold mb-4">Starter Code</h2>
          <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-lg overflow-x-auto text-sm">
            <code>{exercise.starterCode}</code>
          </pre>
          {codePenUrl && (
            <div className="mt-4">
              <a
                href={codePenUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-teal inline-flex items-center gap-2"
              >
                Try on CodePen
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Solution (collapsible) */}
      {exercise.solutionCode && (
        <div className="container-prose pb-16">
          <details className="group">
            <summary className="cursor-pointer text-lg font-semibold text-[var(--color-accent-teal)] hover:underline list-none flex items-center gap-2">
              <svg
                className="w-5 h-5 transition-transform group-open:rotate-90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Show Solution
            </summary>
            <div className="mt-4">
              <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-lg overflow-x-auto text-sm">
                <code>{exercise.solutionCode}</code>
              </pre>
            </div>
          </details>
        </div>
      )}

      {/* Author Card */}
      <section className="container-prose pb-16">
        <div className="author-card">
          <Image
            src={exercise.author.avatar}
            alt={exercise.author.name}
            width={56}
            height={56}
            className="author-avatar"
          />
          <div className="author-info">
            <h4>Created by {exercise.author.name}</h4>
            <p>{exercise.author.bio}</p>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section id="newsletter" className="container-prose pb-16">
        <div className="newsletter-box">
          <h3>Want more challenges?</h3>
          <p>Get new exercises and coding tips delivered to your inbox.</p>
          <form className="newsletter-form">
            <input
              type="email"
              placeholder="Enter your email"
              className="input flex-1"
              required
            />
            <button type="submit" className="btn btn-teal whitespace-nowrap">
              Subscribe
            </button>
          </form>
        </div>
      </section>

      {/* Related Exercises */}
      <section className="section border-t border-[var(--color-border)]">
        <div className="container-wide">
          <div className="section-header">
            <h2 className="section-title">More Exercises</h2>
            <p className="section-subtitle">Continue practicing with these challenges</p>
          </div>
          <ArticleCardGrid articles={relatedExercises} basePath="/exercises" />
        </div>
      </section>
    </article>
  );
}
