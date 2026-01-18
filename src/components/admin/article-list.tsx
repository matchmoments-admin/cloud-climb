'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StatusBadge } from './status-badge';
import { formatDate } from '@/lib/utils';
import type { Article } from '@/types/domain';

interface ArticleListProps {
  articles: Article[];
}

export function ArticleList({ articles }: ArticleListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (article: Article) => {
    if (!confirm(`Are you sure you want to delete "${article.title}"?`)) {
      return;
    }

    setDeletingId(article.id);

    try {
      const response = await fetch(`/api/admin/articles/${article.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }

      router.refresh();
    } catch (error: any) {
      alert(error.message || 'Failed to delete article');
    } finally {
      setDeletingId(null);
    }
  };

  if (articles.length === 0) {
    return (
      <div className="admin-empty-state">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <h3>No articles yet</h3>
        <p>Create your first article to get started.</p>
        <Link href="/admin/posts/new" className="btn btn-teal mt-4">
          Create Article
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: '50%' }}>Article</th>
            <th>Status</th>
            <th>Category</th>
            <th>Date</th>
            <th style={{ width: '120px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => (
            <tr key={article.id}>
              <td>
                <div className="admin-article-cell">
                  {article.featuredImage && (
                    <div className="admin-article-thumb">
                      <Image
                        src={article.featuredImage}
                        alt=""
                        width={80}
                        height={60}
                        className="object-cover rounded"
                      />
                    </div>
                  )}
                  <div className="admin-article-info">
                    <Link
                      href={`/admin/posts/${article.id}`}
                      className="admin-article-title"
                    >
                      {article.title}
                    </Link>
                    <span className="admin-article-slug">/{article.slug}</span>
                  </div>
                </div>
              </td>
              <td>
                <StatusBadge status={article.isFeatured ? 'Published' : 'Draft'} />
              </td>
              <td>
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {article.category}
                </span>
              </td>
              <td>
                <span className="text-sm text-[var(--color-text-muted)]">
                  {formatDate(article.publishedDate)}
                </span>
              </td>
              <td>
                <div className="admin-actions">
                  <Link
                    href={`/admin/posts/${article.id}`}
                    className="admin-action-btn"
                    title="Edit"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </Link>
                  <Link
                    href={`/${article.slug}`}
                    target="_blank"
                    className="admin-action-btn"
                    title="View"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(article)}
                    disabled={deletingId === article.id}
                    className="admin-action-btn admin-action-delete"
                    title="Delete"
                  >
                    {deletingId === article.id ? (
                      <div className="upload-spinner small" />
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
