'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useCategoryFilterOptional } from '@/components/providers/category-filter-provider';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const categoryFilter = useCategoryFilterOptional();
  const pathname = usePathname();

  // Hide main header on admin routes (admin has its own header)
  const isAdminRoute = pathname?.startsWith('/admin');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Don't render header on admin pages
  if (isAdminRoute) {
    return null;
  }

  const hasCategories = categoryFilter && categoryFilter.categories.length > 0;

  return (
    <header
      className={cn(
        'header',
        isScrolled && 'header-scrolled'
      )}
    >
      <div className="header-container">
        {/* Logo - Left */}
        <Link href="/" className="header-logo">
          Cloud Climb
        </Link>

        {/* Category Tabs - Center (only on homepage when categories exist) */}
        {hasCategories && (
          <nav className="header-tabs">
            <button
              className={cn('header-tab', categoryFilter.activeCategory === null && 'active')}
              onClick={() => categoryFilter.setActiveCategory(null)}
            >
              All
            </button>
            {categoryFilter.categories.slice(0, 4).map((cat) => (
              <button
                key={cat}
                className={cn('header-tab', categoryFilter.activeCategory === cat && 'active')}
                onClick={() => categoryFilter.setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </nav>
        )}

        {/* Right side - Search */}
        <div className="header-right">
          <button
            className="header-search-btn"
            aria-label="Search"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </div>

        {/* Mobile menu button */}
        {hasCategories && (
          <button
            className="header-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        )}
      </div>

      {/* Mobile dropdown menu */}
      {hasCategories && mobileMenuOpen && (
        <div className="header-mobile-menu">
          <button
            className={cn('header-mobile-tab', categoryFilter.activeCategory === null && 'active')}
            onClick={() => {
              categoryFilter.setActiveCategory(null);
              setMobileMenuOpen(false);
            }}
          >
            All
          </button>
          {categoryFilter.categories.map((cat) => (
            <button
              key={cat}
              className={cn('header-mobile-tab', categoryFilter.activeCategory === cat && 'active')}
              onClick={() => {
                categoryFilter.setActiveCategory(cat);
                setMobileMenuOpen(false);
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
