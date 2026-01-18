import Link from 'next/link';
import { ArticleCardGrid, ArticleGridSkeleton } from '@/components/blog/article-card';
import { getArticlesByCategory, getCategories } from '@/lib/salesforce/queries/articles';
import type { Metadata } from 'next';
import type { Article } from '@/types/domain';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';

export const revalidate = 300;

// Category display names and descriptions
const categoryInfo: Record<string, { name: string; description: string }> = {
  'engineering': {
    name: 'Engineering',
    description: 'Deep dives into system design, architecture patterns, and best practices for building robust software.',
  },
  'tech': {
    name: 'Tech',
    description: 'News and insights on the latest technology trends, tools, and innovations.',
  },
  'tutorials': {
    name: 'Tutorials',
    description: 'Step-by-step guides to help you learn new skills and technologies.',
  },
  'product': {
    name: 'Product',
    description: 'Insights on product development, design thinking, and building user-centric solutions.',
  },
  'certification-tips': {
    name: 'Certification Tips',
    description: 'Strategies and resources to help you prepare for and pass cloud certifications.',
  },
  'study-guides': {
    name: 'Study Guides',
    description: 'Comprehensive guides covering key topics and exam objectives.',
  },
  'news': {
    name: 'News',
    description: 'Latest updates and announcements from the cloud and tech world.',
  },
};

// Mock articles for development
const mockArticlesByCategory: Record<string, Article[]> = {
  'engineering': [
    {
      id: '1',
      title: 'Building Scalable Systems with Event-Driven Architecture',
      slug: 'building-scalable-systems-event-driven',
      body: '',
      excerpt: 'Learn how event-driven architecture can help you build systems that scale effortlessly.',
      featuredImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80',
      category: 'Engineering',
      tags: ['architecture', 'scalability'],
      author: {
        id: 'a1',
        name: 'Sarah Chen',
        firstName: 'Sarah',
        lastName: 'Chen',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
        bio: 'Principal Engineer',
        role: 'Principal Engineer',
        slug: 'sarah-chen',
      },
      publishedDate: new Date('2026-01-15'),
      readTime: 8,
      viewCount: 1250,
      isFeatured: true,
    },
    {
      id: '4',
      title: 'Microservices vs Monoliths: Making the Right Choice',
      slug: 'microservices-vs-monoliths',
      body: '',
      excerpt: 'A practical guide to choosing the right architecture for your project.',
      featuredImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
      category: 'Engineering',
      tags: ['architecture', 'microservices'],
      author: {
        id: 'a1',
        name: 'Sarah Chen',
        firstName: 'Sarah',
        lastName: 'Chen',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
        bio: 'Principal Engineer',
        role: 'Principal Engineer',
        slug: 'sarah-chen',
      },
      publishedDate: new Date('2026-01-08'),
      readTime: 10,
      viewCount: 1800,
      isFeatured: false,
    },
  ],
  'tutorials': [
    {
      id: '3',
      title: 'TypeScript Best Practices for Large Codebases',
      slug: 'typescript-best-practices-large-codebases',
      body: '',
      excerpt: 'Practical tips for maintaining clean, type-safe code as your project grows.',
      featuredImage: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&q=80',
      category: 'Tutorials',
      tags: ['typescript', 'best-practices'],
      author: {
        id: 'a3',
        name: 'Emily Rodriguez',
        firstName: 'Emily',
        lastName: 'Rodriguez',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80',
        bio: 'Senior Developer',
        role: 'Senior Developer',
        slug: 'emily-rodriguez',
      },
      publishedDate: new Date('2026-01-10'),
      readTime: 12,
      viewCount: 2100,
      isFeatured: false,
    },
    {
      id: '5',
      title: 'Getting Started with Salesforce Development',
      slug: 'getting-started-salesforce-development',
      body: '',
      excerpt: 'A beginner-friendly introduction to building applications that integrate with Salesforce.',
      featuredImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
      category: 'Tutorials',
      tags: ['salesforce', 'API'],
      author: {
        id: 'a2',
        name: 'Marcus Johnson',
        firstName: 'Marcus',
        lastName: 'Johnson',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
        bio: 'Tech Lead',
        role: 'Tech Lead',
        slug: 'marcus-johnson',
      },
      publishedDate: new Date('2026-01-05'),
      readTime: 15,
      viewCount: 950,
      isFeatured: false,
    },
  ],
  'tech': [
    {
      id: '2',
      title: 'The Future of AI in Software Development',
      slug: 'future-ai-software-development',
      body: '',
      excerpt: 'Exploring how AI tools are changing the landscape of software development.',
      featuredImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
      category: 'Tech',
      tags: ['AI', 'development'],
      author: {
        id: 'a2',
        name: 'Marcus Johnson',
        firstName: 'Marcus',
        lastName: 'Johnson',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
        bio: 'Tech Lead',
        role: 'Tech Lead',
        slug: 'marcus-johnson',
      },
      publishedDate: new Date('2026-01-12'),
      readTime: 6,
      viewCount: 890,
      isFeatured: false,
    },
  ],
  'product': [
    {
      id: '6',
      title: 'Design Systems That Scale',
      slug: 'design-systems-that-scale',
      body: '',
      excerpt: 'How to build and maintain a design system that grows with your organization.',
      featuredImage: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80',
      category: 'Product',
      tags: ['design', 'UI'],
      author: {
        id: 'a3',
        name: 'Emily Rodriguez',
        firstName: 'Emily',
        lastName: 'Rodriguez',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80',
        bio: 'Senior Developer',
        role: 'Senior Developer',
        slug: 'emily-rodriguez',
      },
      publishedDate: new Date('2026-01-02'),
      readTime: 7,
      viewCount: 720,
      isFeatured: false,
    },
  ],
};

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const info = categoryInfo[slug];

  if (!info) {
    return { title: 'Category Not Found' };
  }

  return {
    title: info.name,
    description: info.description,
  };
}

async function getCategoryArticles(slug: string): Promise<Article[]> {
  // Convert slug back to category name
  const categoryName = Object.entries(categoryInfo).find(([key]) => key === slug)?.[1]?.name;

  if (!categoryName) {
    return [];
  }

  try {
    const articles = await getArticlesByCategory(categoryName, 20);
    return articles;
  } catch (error) {
    console.error('Failed to fetch category articles:', error);
    return mockArticlesByCategory[slug] || [];
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const info = categoryInfo[slug];

  if (!info) {
    notFound();
  }

  let articles = await getCategoryArticles(slug);

  // Use mock data if no articles found
  if (articles.length === 0) {
    articles = mockArticlesByCategory[slug] || [];
  }

  // Get all categories for navigation
  let allCategories: string[] = [];
  try {
    allCategories = await getCategories();
  } catch {
    allCategories = Object.values(categoryInfo).map(c => c.name);
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="container-wide pt-16 pb-12 md:pt-24 md:pb-16">
        <span className="category-pill mb-6 inline-block">{info.name}</span>
        <h1 className="text-hero mb-6">{info.name}</h1>
        <p className="text-subtitle max-w-[640px]">{info.description}</p>
      </section>

      {/* Category Navigation */}
      <nav className="container-wide mb-12">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="category-pill"
          >
            All Posts
          </Link>
          {Object.entries(categoryInfo).map(([categorySlug, categoryData]) => (
            <Link
              key={categorySlug}
              href={`/category/${categorySlug}`}
              className={`category-pill ${categorySlug === slug ? 'bg-[var(--color-text-primary)] !text-[var(--color-bg-cream)]' : ''}`}
            >
              {categoryData.name}
            </Link>
          ))}
        </div>
      </nav>

      {/* Articles */}
      <section className="container-wide pb-24">
        <Suspense fallback={<ArticleGridSkeleton count={9} />}>
          {articles.length > 0 ? (
            <ArticleCardGrid articles={articles} />
          ) : (
            <div className="text-center py-16 px-8 bg-[var(--color-bg-white)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
              <p className="text-[var(--color-text-tertiary)] text-lg mb-2">No articles found in this category yet.</p>
              <p className="text-[var(--color-text-muted)] text-sm">Check back soon for new content.</p>
              <Link href="/" className="btn btn-secondary mt-6 inline-flex">
                Browse All Articles
              </Link>
            </div>
          )}
        </Suspense>
      </section>
    </div>
  );
}
