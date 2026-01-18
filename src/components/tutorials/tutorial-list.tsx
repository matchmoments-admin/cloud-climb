import { TutorialCard } from './tutorial-card';
import type { Article } from '@/types/domain';

interface TutorialListProps {
  tutorials: Article[];
}

export function TutorialList({ tutorials }: TutorialListProps) {
  if (tutorials.length === 0) {
    return (
      <div className="empty-state">
        <h3>No tutorials yet</h3>
        <p>Check back soon for new learning content.</p>
      </div>
    );
  }

  return (
    <div className="tutorial-grid">
      {tutorials.map((tutorial) => (
        <TutorialCard key={tutorial.id} tutorial={tutorial} />
      ))}
    </div>
  );
}
