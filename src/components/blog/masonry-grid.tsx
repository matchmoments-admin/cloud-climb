'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn, formatDate } from '@/lib/utils';
import type { Article } from '@/types/domain';

// Fallback gradient backgrounds when images fail to load
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #20808d 0%, #13343b 100%)',
  'linear-gradient(135deg, #2a9cac 0%, #18666f 100%)',
  'linear-gradient(135deg, #5a7a82 0%, #13343b 100%)',
  'linear-gradient(135deg, #8fa8ae 0%, #1a4a54 100%)',
  'linear-gradient(145deg, #20808d 0%, #2a9cac 50%, #13343b 100%)',
];

interface MasonryCardProps {
  article: Article;
  span: number; // row span for masonry effect
  index: number;
}

/**
 * Masonry Card - Lummi-style image-only card
 * Shows category badge, reveals title/date on hover
 */
function MasonryCard({ article, span, index }: MasonryCardProps) {
  const [imageError, setImageError] = useState(false);
  const rowSpan = span === 2 ? 'row-span-2' : 'row-span-1';
  const hasValidImage = article.featuredImage && !imageError;
  const fallbackGradient = FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];

  return (
    <article
      className={cn('masonry-item group', rowSpan)}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <Link href={`/${article.slug}`} className="masonry-link">
        <div
          className="masonry-image-wrapper"
          style={!hasValidImage ? { background: fallbackGradient } : undefined}
        >
          {hasValidImage ? (
            <Image
              src={article.featuredImage}
              alt={article.title}
              fill
              className="masonry-image"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="masonry-fallback">
              <span className="masonry-fallback-initial">
                {article.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Category badge - Lummi "Pro" style */}
          <span className="masonry-tag">{article.category}</span>

          {/* Hover overlay */}
          <div className="masonry-hover">
            <div className="masonry-hover-content">
              <h3 className="masonry-hover-title">{article.title}</h3>
              <time dateTime={article.publishedDate.toISOString()} className="masonry-hover-date">
                {formatDate(article.publishedDate)}
              </time>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

interface MasonryGridProps {
  articles: Article[];
  className?: string;
}

/**
 * Masonry Grid - True Pinterest/Lummi style with variable heights
 */
export function MasonryGrid({ articles, className }: MasonryGridProps) {
  // Create masonry pattern - alternating tall and short cards
  const cardSpans = useMemo(() => {
    return articles.map((_, i) => {
      // Pattern: tall, short, short, tall, short, tall, short, short...
      const patterns = [2, 1, 1, 2, 1, 2, 1, 1, 2, 1];
      return patterns[i % patterns.length];
    });
  }, [articles]);

  if (articles.length === 0) {
    return (
      <div className="masonry-empty">
        <p>No articles found</p>
        <span>Check back soon for new content</span>
      </div>
    );
  }

  return (
    <div className={cn('masonry-container', className)}>
      {articles.map((article, index) => (
        <MasonryCard
          key={article.id}
          article={article}
          span={cardSpans[index]}
          index={index}
        />
      ))}
    </div>
  );
}

interface NavTabsProps {
  items: string[];
  active: string | null;
  onChange: (item: string | null) => void;
}

/**
 * Navigation Tabs - Lummi style category switcher
 */
export function NavTabs({ items, active, onChange }: NavTabsProps) {
  return (
    <nav className="nav-tabs">
      <button
        className={cn('nav-tab', active === null && 'active')}
        onClick={() => onChange(null)}
      >
        All
      </button>
      {items.slice(0, 4).map((item) => (
        <button
          key={item}
          className={cn('nav-tab', active === item && 'active')}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </nav>
  );
}

interface ToolBarProps {
  tags: string[];
  activeTags: string[];
  onTagToggle: (tag: string) => void;
  resultCount: number;
  sortOption: string;
  onSortChange: (sort: string) => void;
}

/**
 * Tool Bar - Lummi style filter bar above grid
 */
export function ToolBar({ tags, activeTags, onTagToggle, resultCount, sortOption, onSortChange }: ToolBarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        {tags.slice(0, 6).map((tag) => (
          <button
            key={tag}
            className={cn('toolbar-tag', activeTags.includes(tag) && 'active')}
            onClick={() => onTagToggle(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="toolbar-right">
        <span className="toolbar-count">{resultCount} articles</span>
        <select
          className="toolbar-sort"
          value={sortOption}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="newest">Newest</option>
          <option value="popular">Popular</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>
    </div>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Search Input - Lummi style minimal search
 */
export function SearchInput({ value, onChange, placeholder = 'Search...' }: SearchInputProps) {
  return (
    <div className="search-input-wrapper">
      <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="search-input"
      />
    </div>
  );
}

/**
 * Loading skeleton for masonry grid
 */
export function MasonryGridSkeleton({ count = 10 }: { count?: number }) {
  const spans = [2, 1, 1, 2, 1, 2, 1, 1, 2, 1];

  return (
    <div className="masonry-container">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn('masonry-item', spans[i % spans.length] === 2 ? 'row-span-2' : 'row-span-1')}
        >
          <div className="skeleton masonry-skeleton" />
        </div>
      ))}
    </div>
  );
}
