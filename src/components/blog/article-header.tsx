import Image from 'next/image';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import type { Article } from '@/types/domain';

interface ArticleHeaderProps {
  article: Article;
}

export function ArticleHeader({ article }: ArticleHeaderProps) {
  return (
    <header className="container-prose pt-20 pb-12">
      {/* Breadcrumb */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-[var(--color-notion-text-tertiary)] hover:text-[var(--color-notion-text-primary)] transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          All posts
        </Link>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 mb-8 text-sm text-[var(--color-notion-text-tertiary)]">
        <time dateTime={article.publishedDate.toISOString()}>
          Published {formatDate(article.publishedDate)}
        </time>
        <span>in</span>
        <Link
          href={`/category/${article.category.toLowerCase()}`}
          className="text-[var(--color-notion-link)] hover:underline"
        >
          {article.category}
        </Link>
      </div>

      {/* Title */}
      <h1 className="text-hero mb-6">
        {article.title}
      </h1>

      {/* Author & Read Time */}
      <div className="flex items-center justify-between py-6 border-t border-b border-[var(--color-notion-border)]">
        <div className="flex items-center gap-3">
          <Image
            src={article.author.avatar}
            alt={article.author.name}
            width={48}
            height={48}
            className="rounded-full"
          />
          <div>
            <p className="text-base font-medium text-[var(--color-notion-text-primary)]">
              By {article.author.name}
            </p>
            <p className="text-sm text-[var(--color-notion-text-tertiary)]">
              {article.author.role}
            </p>
          </div>
        </div>
        <div className="text-sm text-[var(--color-notion-text-tertiary)]">
          {article.readTime} min read
        </div>
      </div>
    </header>
  );
}
