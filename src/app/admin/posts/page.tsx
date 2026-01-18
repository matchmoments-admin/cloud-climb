import Link from 'next/link';
import { ArticleList } from '@/components/admin';
import { getLatestArticles } from '@/lib/salesforce/queries/articles';
import type { Article } from '@/types/domain';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Mock articles for development when Salesforce isn't available
const mockArticles: Article[] = [
  {
    id: 'mock-1',
    title: 'Getting Started with AWS Certifications',
    slug: 'getting-started-aws-certifications',
    body: '<p>Sample content...</p>',
    excerpt: 'A comprehensive guide to AWS certification paths.',
    featuredImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop&q=80',
    category: 'Certification Tips',
    tags: ['aws', 'certification'],
    author: {
      id: 'a1',
      name: 'Admin User',
      firstName: 'Admin',
      lastName: 'User',
      avatar: '/images/default-avatar.svg',
      bio: '',
      role: 'Admin',
      slug: 'admin-user',
    },
    publishedDate: new Date(),
    readTime: 10,
    viewCount: 0,
    isFeatured: false,
  },
];

async function getArticles(): Promise<Article[]> {
  try {
    const articles = await getLatestArticles(50);
    return articles.length > 0 ? articles : mockArticles;
  } catch (error) {
    console.error('[Admin Posts] Failed to fetch articles:', error);
    return mockArticles;
  }
}

export default async function AdminPostsPage() {
  const articles = await getArticles();

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Posts</h1>
          <p className="admin-page-subtitle">
            Manage your blog articles
          </p>
        </div>
        <Link href="/admin/posts/new" className="btn btn-teal">
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
          New Post
        </Link>
      </div>

      <ArticleList articles={articles} />
    </div>
  );
}
