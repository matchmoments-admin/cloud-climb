import { ArticleCardGrid } from '@/components/blog/article-card';
import { getExercises } from '@/lib/salesforce/queries/articles';
import type { Article } from '@/types/domain';

export const revalidate = 300; // 5 minutes

// Mock exercises for development
const mockExercises: Article[] = [
  {
    id: 'mock-e1',
    title: 'Integer Hypotenuse',
    slug: 'integer-hypotenuse',
    body: '<p>Check if two positive integers form a Pythagorean triple with an integer hypotenuse.</p>',
    excerpt: 'Determine if the hypotenuse of a right triangle with given legs is an integer.',
    featuredImage: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&q=80',
    category: 'Exercises',
    tags: ['javascript', 'math', 'beginner'],
    author: { id: 'a1', name: 'Cloud Climb', firstName: 'Cloud', lastName: 'Climb', avatar: '', bio: '', role: 'Author', slug: 'cloud-climb' },
    publishedDate: new Date(),
    readTime: 10,
    viewCount: 0,
    isFeatured: false,
    articleType: 'Exercise',
  },
  {
    id: 'mock-e2',
    title: 'FizzBuzz',
    slug: 'fizzbuzz',
    body: '<p>Classic FizzBuzz problem.</p>',
    excerpt: 'Write a function that returns "Fizz", "Buzz", or "FizzBuzz" based on divisibility.',
    featuredImage: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&q=80',
    category: 'Exercises',
    tags: ['javascript', 'loops', 'beginner'],
    author: { id: 'a1', name: 'Cloud Climb', firstName: 'Cloud', lastName: 'Climb', avatar: '', bio: '', role: 'Author', slug: 'cloud-climb' },
    publishedDate: new Date(),
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
    author: { id: 'a1', name: 'Cloud Climb', firstName: 'Cloud', lastName: 'Climb', avatar: '', bio: '', role: 'Author', slug: 'cloud-climb' },
    publishedDate: new Date(),
    readTime: 5,
    viewCount: 0,
    isFeatured: false,
    articleType: 'Exercise',
  },
];

async function fetchExercises(): Promise<Article[]> {
  try {
    const exercises = await getExercises(50);
    return exercises.length > 0 ? exercises : mockExercises;
  } catch (error) {
    console.error('[Exercises] Failed to fetch:', error);
    return mockExercises;
  }
}

export default async function ExercisesPage() {
  const exercises = await fetchExercises();

  return (
    <main className="section">
      <div className="container-wide">
        <header className="section-header">
          <h1 className="section-title">JavaScript Exercises</h1>
          <p className="section-subtitle">
            Practice your coding skills with interactive challenges
          </p>
        </header>

        <ArticleCardGrid articles={exercises} basePath="/exercises" />
      </div>
    </main>
  );
}
