import Link from 'next/link';
import Image from 'next/image';
import { cn, formatDate } from '@/lib/utils';
import type { Article } from '@/types/domain';

interface ArticleCardProps {
  article: Article;
  className?: string;
  basePath?: string;
}

/**
 * Minimal Article Card - Perplexity Hub Style
 * Just: Image → Title → Date
 * No category tags, no excerpts, no author names
 */
export function ArticleCard({ article, className, basePath = '' }: ArticleCardProps) {
  const href = basePath ? `${basePath}/${article.slug}` : `/${article.slug}`;
  return (
    <article className={cn('group', className)}>
      <Link href={href} className="block">
        {/* Image - rounded corners, no wrapper background */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] mb-3">
          <Image
            src={article.featuredImage}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            sizes="(max-width: 809px) 100vw, (max-width: 1199px) 50vw, 33vw"
          />
        </div>

        {/* Title - bold, dark */}
        <h3 className="font-semibold text-[15px] leading-[1.4] text-[var(--color-text-primary)] mb-1 line-clamp-2 group-hover:text-[var(--color-accent-teal)] transition-colors duration-200">
          {article.title}
        </h3>

        {/* Date only - small, muted */}
        <time
          dateTime={article.publishedDate.toISOString()}
          className="text-[13px] text-[var(--color-text-muted)]"
        >
          {formatDate(article.publishedDate)}
        </time>
      </Link>
    </article>
  );
}

interface FeaturedArticleProps {
  article: Article;
  className?: string;
}

/**
 * Featured Article - Perplexity Hub Style
 * Large image left, title + description + "Read More" button right
 */
export function FeaturedArticle({ article, className }: FeaturedArticleProps) {
  return (
    <article className={cn('featured-article', className)}>
      <Link href={`/${article.slug}`} className="featured-article-inner group">
        {/* Large Image */}
        <div className="featured-article-image">
          <Image
            src={article.featuredImage}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.01]"
            sizes="(max-width: 768px) 100vw, 60vw"
            priority
          />
        </div>

        {/* Content */}
        <div className="featured-article-content">
          {/* Title - large display font */}
          <h2 className="featured-article-title">
            {article.title}
          </h2>

          {/* Description */}
          <p className="featured-article-excerpt">
            {article.excerpt}
          </p>

          {/* Read More button */}
          <span className="featured-article-button">
            Read More
          </span>
        </div>
      </Link>
    </article>
  );
}

interface ArticleCardGridProps {
  articles: Article[];
  basePath?: string;
}

export function ArticleCardGrid({ articles, basePath }: ArticleCardGridProps) {
  if (articles.length === 0) {
    return (
      <div className="text-center py-16 px-8">
        <p className="text-[var(--color-text-tertiary)] text-lg">No articles found.</p>
        <p className="text-[var(--color-text-muted)] text-sm mt-2">Check back soon for new content.</p>
      </div>
    );
  }

  return (
    <div className="article-grid">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} basePath={basePath} />
      ))}
    </div>
  );
}

// Loading skeletons
export function FeaturedArticleSkeleton() {
  return (
    <div className="featured-article">
      <div className="featured-article-inner">
        <div className="featured-article-image skeleton" />
        <div className="featured-article-content">
          <div className="skeleton h-10 w-full mb-2 rounded" />
          <div className="skeleton h-10 w-3/4 mb-6 rounded" />
          <div className="skeleton h-5 w-full mb-2 rounded" />
          <div className="skeleton h-5 w-full mb-2 rounded" />
          <div className="skeleton h-5 w-2/3 mb-8 rounded" />
          <div className="skeleton h-10 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ArticleCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[4/3] rounded-[12px] mb-3" />
      <div className="skeleton h-5 w-full mb-2 rounded" />
      <div className="skeleton h-5 w-3/4 mb-2 rounded" />
      <div className="skeleton h-4 w-24 rounded" />
    </div>
  );
}

export function ArticleGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="article-grid">
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}
