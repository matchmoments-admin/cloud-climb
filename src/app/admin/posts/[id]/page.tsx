import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArticleForm } from '@/components/admin';
import { getArticleById } from '@/lib/salesforce/queries/articles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface EditPostPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditPostPageProps) {
  const { id } = await params;

  try {
    const article = await getArticleById(id);
    return {
      title: `Edit: ${article?.title || 'Post'} - Admin - Cloud Climb`,
    };
  } catch {
    return {
      title: 'Edit Post - Admin - Cloud Climb',
    };
  }
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { id } = await params;

  let article;
  try {
    article = await getArticleById(id);
  } catch (error) {
    console.error('[Admin Edit Post] Failed to fetch article:', error);
  }

  if (!article) {
    notFound();
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <nav className="admin-breadcrumb">
            <Link href="/admin/posts">Posts</Link>
            <span>/</span>
            <span>Edit</span>
          </nav>
          <h1 className="admin-page-title">Edit Post</h1>
        </div>
        <Link
          href={`/${article.slug}`}
          target="_blank"
          className="btn btn-secondary"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mr-2"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          View Post
        </Link>
      </div>

      <ArticleForm article={article} mode="edit" />
    </div>
  );
}
