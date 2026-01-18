'use client';

import { useState, useMemo, useEffect } from 'react';
import { MasonryGrid, MasonryGridSkeleton } from './masonry-grid';
import { useCategoryFilter } from '@/components/providers/category-filter-provider';
import type { Article } from '@/types/domain';

interface HomeGalleryProps {
  articles: Article[];
  categories: string[];
}

/**
 * Home Gallery - Lummi.ai inspired layout
 * Bold hero text, category tabs (in header), dense masonry grid
 */
export function HomeGallery({ articles, categories }: HomeGalleryProps) {
  const { activeCategory, setCategories } = useCategoryFilter();
  const [sortOption, setSortOption] = useState('newest');
  const [mounted, setMounted] = useState(false);

  // Set categories in context so header can display them
  useEffect(() => {
    setCategories(categories);
    return () => setCategories([]); // Clear on unmount
  }, [categories, setCategories]);

  // Filter and sort articles
  const filteredArticles = useMemo(() => {
    let result = articles.filter((article) => {
      if (activeCategory && article.category !== activeCategory) {
        return false;
      }
      return true;
    });

    if (sortOption === 'newest') {
      result.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
    } else if (sortOption === 'oldest') {
      result.sort((a, b) => new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime());
    } else if (sortOption === 'popular') {
      result.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    }

    return result;
  }, [articles, activeCategory, sortOption]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="lummi-home">
      {/* Hero - Lummi-style large typography */}
      <section className="lummi-hero">
        <h1 className="lummi-hero-title">
          level up your cloud skills
        </h1>
      </section>

      {/* Info Bar - Subtitle left, count/sort right */}
      <div className="lummi-info-bar">
        <p className="lummi-info-subtitle">
          Engineering insights, certification guides, and architecture deep-dives. Powered by builders.
        </p>
        <div className="lummi-info-right">
          <span className="lummi-info-count">{filteredArticles.length} articles</span>
          <select
            className="lummi-info-sort"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="popular">Popular</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <main className="lummi-main">
        {mounted ? (
          <MasonryGrid
            key={activeCategory ?? 'all'}
            articles={filteredArticles}
          />
        ) : (
          <MasonryGridSkeleton count={10} />
        )}
      </main>
    </div>
  );
}
