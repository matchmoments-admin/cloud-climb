import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CategoryTagProps {
  category: string;
  variant?: 'default' | 'colored';
  href?: string;
  className?: string;
}

const colorMap: Record<string, string> = {
  'Tech': 'bg-[var(--color-notion-tag-blue)]',
  'Engineering': 'bg-[var(--color-notion-tag-purple)]',
  'Product': 'bg-[var(--color-notion-tag-green)]',
  'Design': 'bg-[var(--color-notion-tag-orange)]',
  'Culture': 'bg-[var(--color-notion-tag-red)]',
  'Tutorials': 'bg-[var(--color-notion-tag-blue)]',
  'News': 'bg-[var(--color-notion-tag-gray)]',
};

export function CategoryTag({ category, variant = 'default', href, className }: CategoryTagProps) {
  const isColored = variant === 'colored';
  const colorClass = isColored ? colorMap[category] || 'bg-[var(--color-notion-tag-gray)]' : '';

  const tagClassName = cn(
    'tag',
    isColored && `${colorClass} border-transparent`,
    className
  );

  if (href) {
    return (
      <Link href={href} className={tagClassName}>
        {category}
      </Link>
    );
  }

  return <span className={tagClassName}>{category}</span>;
}
