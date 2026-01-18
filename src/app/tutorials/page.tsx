import { TutorialList } from '@/components/tutorials';
import { getTutorials } from '@/lib/salesforce/queries/articles';
import type { Article } from '@/types/domain';

export const revalidate = 300; // 5 minutes

// Mock tutorials for development
const mockTutorials: Article[] = [
  {
    id: 'mock-t1',
    title: 'Getting Started with JavaScript',
    slug: 'getting-started-javascript',
    body: '<p>Learn the fundamentals of JavaScript...</p>',
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
  },
  {
    id: 'mock-t2',
    title: 'Understanding TypeScript Generics',
    slug: 'understanding-typescript-generics',
    body: '<p>Master TypeScript generics...</p>',
    excerpt: 'Deep dive into TypeScript generics with practical examples.',
    featuredImage: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&h=600&fit=crop',
    category: 'Tutorials',
    tags: ['typescript', 'intermediate'],
    author: { id: 'a1', name: 'Cloud Climb', firstName: 'Cloud', lastName: 'Climb', avatar: '', bio: '', role: 'Author', slug: 'cloud-climb' },
    publishedDate: new Date(),
    readTime: 20,
    viewCount: 0,
    isFeatured: false,
    articleType: 'Tutorial',
  },
];

async function fetchTutorials(): Promise<Article[]> {
  try {
    const tutorials = await getTutorials(50);
    return tutorials.length > 0 ? tutorials : mockTutorials;
  } catch (error) {
    console.error('[Tutorials] Failed to fetch:', error);
    return mockTutorials;
  }
}

export default async function TutorialsPage() {
  const tutorials = await fetchTutorials();

  return (
    <main className="tutorials-page">
      <div className="container-wide">
        <header className="tutorials-header">
          <h1 className="tutorials-title">Tutorials</h1>
          <p className="tutorials-subtitle">
            Learn cloud technologies with interactive, hands-on tutorials
          </p>
        </header>

        <TutorialList tutorials={tutorials} />
      </div>
    </main>
  );
}
