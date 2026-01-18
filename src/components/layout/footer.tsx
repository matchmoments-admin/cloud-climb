'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const footerLinks = {
  content: [
    { name: 'All Posts', href: '/' },
    { name: 'Engineering', href: '/category/engineering' },
    { name: 'Tutorials', href: '/category/tutorials' },
    { name: 'Tech', href: '/category/tech' },
  ],
  resources: [
    { name: 'About', href: '/about' },
    { name: 'Newsletter', href: '#newsletter' },
    { name: 'RSS Feed', href: '/feed.xml' },
  ],
  social: [
    { name: 'Twitter', href: 'https://twitter.com' },
    { name: 'GitHub', href: 'https://github.com' },
    { name: 'LinkedIn', href: 'https://linkedin.com' },
  ],
};

export function Footer() {
  const pathname = usePathname();

  // Hide footer on admin routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="footer">
      <div className="container-wide">
        <div className="footer-grid">
          {/* Brand */}
          <div>
            <Link href="/" className="footer-brand block">
              Cloud Climb
            </Link>
            <p className="footer-tagline">
              Insights on cloud architecture, certification strategies, and modern software engineering.
            </p>
          </div>

          {/* Content Links */}
          <div>
            <h4 className="footer-heading">Content</h4>
            <div className="footer-links">
              {footerLinks.content.map((link) => (
                <Link key={link.name} href={link.href} className="footer-link">
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="footer-heading">Resources</h4>
            <div className="footer-links">
              {footerLinks.resources.map((link) => (
                <Link key={link.name} href={link.href} className="footer-link">
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Social */}
          <div>
            <h4 className="footer-heading">Connect</h4>
            <div className="footer-links">
              {footerLinks.social.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Cloud Climb. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
