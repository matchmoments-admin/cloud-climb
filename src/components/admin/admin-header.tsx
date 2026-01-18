'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/admin/posts', label: 'Posts' },
  { href: '/admin/questions', label: 'Questions' },
  { href: '/', label: 'View Site', external: true },
];

export function AdminHeader() {
  const pathname = usePathname();

  // Hide header on login page
  if (pathname === '/admin/login') {
    return null;
  }

  return (
    <header className="header admin-header-override">
      <div className="header-container">
        {/* Logo - Left */}
        <Link href="/admin/posts" className="header-logo">
          Cloud Climb
        </Link>

        {/* Admin Nav Tabs - Center */}
        <nav className="header-tabs header-tabs-admin">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'header-tab',
                !link.external && pathname?.startsWith(link.href) && 'active'
              )}
              {...(link.external ? { target: '_blank', rel: 'noopener' } : {})}
            >
              {link.label}
              {link.external && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="inline ml-1"
                  style={{ marginLeft: '4px' }}
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              )}
            </Link>
          ))}
        </nav>

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
      </div>
    </header>
  );
}
