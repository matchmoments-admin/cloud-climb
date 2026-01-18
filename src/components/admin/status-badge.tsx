interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  Draft: 'draft',
  'Pending Review': 'pending',
  Published: 'published',
  Archived: 'archived',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styleClass = statusStyles[status] || 'draft';

  return (
    <span className={`status-badge ${styleClass} ${className || ''}`}>
      {status}
    </span>
  );
}

interface PublishBadgeProps {
  isPublished: boolean;
  className?: string;
}

export function PublishBadge({ isPublished, className }: PublishBadgeProps) {
  return (
    <span
      className={`status-badge ${isPublished ? 'published' : 'draft'} ${className || ''}`}
    >
      {isPublished ? 'Published' : 'Draft'}
    </span>
  );
}
