import { Suspense } from 'react';
import { HomeGallery } from '@/components/blog/home-gallery';
import { MasonryGridSkeleton } from '@/components/blog/masonry-grid';
import { getLatestArticles, getCategories } from '@/lib/salesforce/queries/articles';
import type { Article } from '@/types/domain';

export const revalidate = 300;

// Mock data for development
const mockArticles: Article[] = [
  {
    id: '1',
    title: 'Building Scalable Systems with Event-Driven Architecture',
    slug: 'building-scalable-systems-event-driven',
    body: '',
    excerpt: 'Learn how event-driven architecture can help you build systems that scale.',
    featuredImage: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=600&h=800&fit=crop&q=80',
    category: 'Engineering',
    tags: ['architecture', 'scalability'],
    author: { id: 'a1', name: 'Sarah Chen', firstName: 'Sarah', lastName: 'Chen', avatar: '', bio: '', role: '', slug: '' },
    publishedDate: new Date('2026-01-15'),
    readTime: 8,
    viewCount: 1250,
    isFeatured: false,
  },
  {
    id: '2',
    title: 'The Future of AI in Software Development',
    slug: 'future-ai-software-development',
    body: '',
    excerpt: 'Exploring how AI tools are changing the landscape of software development.',
    featuredImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=600&fit=crop&q=80',
    category: 'Tech',
    tags: ['AI', 'development'],
    author: { id: 'a2', name: 'Marcus Johnson', firstName: 'Marcus', lastName: 'Johnson', avatar: '', bio: '', role: '', slug: '' },
    publishedDate: new Date('2026-01-12'),
    readTime: 6,
    viewCount: 890,
    isFeatured: false,
  },
  {
    id: '3',
    title: 'TypeScript Best Practices for Large Codebases',
    slug: 'typescript-best-practices',
    body: '',
    excerpt: 'Practical tips for maintaining clean, type-safe code.',
    featuredImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=800&fit=crop&q=80',
    category: 'Tutorials',
    tags: ['typescript', 'best-practices'],
    author: { id: 'a3', name: 'Emily Rodriguez', firstName: 'Emily', lastName: 'Rodriguez', avatar: '', bio: '', role: '', slug: '' },
    publishedDate: new Date('2026-01-10'),
    readTime: 12,
    viewCount: 2100,
    isFeatured: false,
  },
  {
    id: '4',
    title: 'Microservices vs Monoliths',
    slug: 'microservices-vs-monoliths',
    body: '',
    excerpt: 'A practical guide to choosing the right architecture.',
    featuredImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=600&fit=crop&q=80',
    category: 'Engineering',
    tags: ['architecture', 'microservices'],
    author: { id: 'a1', name: 'Sarah Chen', firstName: 'Sarah', lastName: 'Chen', avatar: '', bio: '', role: '', slug: '' },
    publishedDate: new Date('2026-01-08'),
    readTime: 10,
    viewCount: 1800,
    isFeatured: false,
  },
  {
    id: '5',
    title: 'Getting Started with Cloud Certifications',
    slug: 'getting-started-cloud-certifications',
    body: '',
    excerpt: 'A comprehensive guide to choosing your first cloud certification.',
    featuredImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=800&fit=crop&q=80',
    category: 'Certification Tips',
    tags: ['certification', 'cloud'],
    author: { id: 'a2', name: 'Marcus Johnson', firstName: 'Marcus', lastName: 'Johnson', avatar: '', bio: '', role: '', slug: '' },
    publishedDate: new Date('2026-01-05'),
    readTime: 15,
    viewCount: 950,
    isFeatured: false,
  },
  {
    id: '6',
    title: 'Design Systems That Scale',
    slug: 'design-systems-that-scale',
    body: '',
    excerpt: 'How to build a design system that grows with your organization.',
    featuredImage: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=600&fit=crop&q=80',
    category: 'Product',
    tags: ['design', 'systems'],
    author: { id: 'a3', name: 'Emily Rodriguez', firstName: 'Emily', lastName: 'Rodriguez', avatar: '', bio: '', role: '', slug: '' },
    publishedDate: new Date('2026-01-02'),
    readTime: 7,
    viewCount: 720,
    isFeatured: false,
  },
  {
    id: '7',
    title: 'Kubernetes for Beginners',
    slug: 'kubernetes-beginners-guide',
    body: '',
    excerpt: 'Everything you need to know to get started with Kubernetes.',
    featuredImage: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=600&h=800&fit=crop&q=80',
    category: 'Tutorials',
    tags: ['kubernetes', 'devops'],
    author: { id: 'a1', name: 'Sarah Chen', firstName: 'Sarah', lastName: 'Chen', avatar: '', bio: '', role: '', slug: '' },
    publishedDate: new Date('2025-12-28'),
    readTime: 20,
    viewCount: 3200,
    isFeatured: false,
  },
  {
    id: '8',
    title: 'AWS Solutions Architect Exam Tips',
    slug: 'aws-solutions-architect-tips',
    body: '',
    excerpt: 'Proven strategies to help you pass the AWS SAA exam.',
    featuredImage: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=600&h=600&fit=crop&q=80',
    category: 'Study Guides',
    tags: ['aws', 'certification'],
    author: { id: 'a2', name: 'Marcus Johnson', firstName: 'Marcus', lastName: 'Johnson', avatar: '', bio: '', role: '', slug: '' },
    publishedDate: new Date('2025-12-20'),
    readTime: 18,
    viewCount: 4500,
    isFeatured: false,
  },
  {
    id: '9',
    title: 'Real-Time Data Processing with Kafka',
    slug: 'real-time-data-kafka',
    body: '',
    excerpt: 'Learn how to build real-time data pipelines.',
    featuredImage: 'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=600&h=800&fit=crop&q=80',
    category: 'Engineering',
    tags: ['kafka', 'streaming'],
    author: { id: 'a3', name: 'Emily Rodriguez', firstName: 'Emily', lastName: 'Rodriguez', avatar: '', bio: '', role: '', slug: '' },
    publishedDate: new Date('2025-12-15'),
    readTime: 14,
    viewCount: 2800,
    isFeatured: false,
  },
  {
    id: '10',
    title: 'GraphQL vs REST: When to Use Each',
    slug: 'graphql-vs-rest',
    body: '',
    excerpt: 'Understanding when to choose GraphQL over REST.',
    featuredImage: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=600&fit=crop&q=80',
    category: 'Tech',
    tags: ['graphql', 'api'],
    author: { id: 'a1', name: 'Sarah Chen', firstName: 'Sarah', lastName: 'Chen', avatar: '', bio: '', role: '', slug: '' },
    publishedDate: new Date('2025-12-10'),
    readTime: 9,
    viewCount: 1600,
    isFeatured: false,
  },
];

const defaultCategories = ['Engineering', 'Tutorials', 'Certification Tips', 'Tech'];

async function getArticlesData() {
  // Set to false to use real Salesforce data
  // Falls back to mock data if Salesforce fails or returns empty
  const USE_MOCK_DATA = false;

  if (USE_MOCK_DATA) {
    return { articles: mockArticles, categories: defaultCategories };
  }

  try {
    const [latest, categories] = await Promise.all([
      getLatestArticles(20),
      getCategories(),
    ]);

    // Filter out articles without valid images
    const articlesWithImages = latest.filter(a => a.featuredImage && a.featuredImage.startsWith('http'));

    return {
      articles: articlesWithImages.length > 0 ? articlesWithImages : mockArticles,
      categories: categories.length > 0 ? categories : defaultCategories,
    };
  } catch (error) {
    console.error('Failed to fetch articles:', error);
    return { articles: mockArticles, categories: defaultCategories };
  }
}

function HomeSkeleton() {
  return (
    <div className="lummi-home">
      <section className="lummi-hero">
        <div className="skeleton h-20 w-3/4 rounded-xl" />
      </section>
      <div className="lummi-info-bar">
        <div className="skeleton h-5 w-80 rounded" />
        <div className="flex gap-4">
          <div className="skeleton h-5 w-20 rounded" />
          <div className="skeleton h-9 w-24 rounded-lg" />
        </div>
      </div>
      <main className="lummi-main">
        <MasonryGridSkeleton count={10} />
      </main>
    </div>
  );
}

export default async function HomePage() {
  const { articles, categories } = await getArticlesData();

  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeGallery articles={articles} categories={categories} />
    </Suspense>
  );
}
