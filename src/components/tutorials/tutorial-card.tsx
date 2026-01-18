import Link from 'next/link';
import Image from 'next/image';
import type { Article } from '@/types/domain';

interface TutorialCardProps {
  tutorial: Article;
}

export function TutorialCard({ tutorial }: TutorialCardProps) {
  return (
    <Link href={`/tutorials/${tutorial.slug}`} className="tutorial-card">
      <div className="tutorial-card-image">
        {tutorial.featuredImage && (
          <Image
            src={tutorial.featuredImage}
            alt={tutorial.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}
        {tutorial.topic && (
          <span className="tutorial-card-badge">{tutorial.topic.name}</span>
        )}
      </div>
      <div className="tutorial-card-content">
        <h3 className="tutorial-card-title">{tutorial.title}</h3>
        {tutorial.excerpt && (
          <p className="tutorial-card-excerpt">{tutorial.excerpt}</p>
        )}
        <div className="tutorial-card-meta">
          <span className="tutorial-card-difficulty">
            {tutorial.tags.includes('beginner') ? 'Beginner' :
             tutorial.tags.includes('advanced') ? 'Advanced' : 'Intermediate'}
          </span>
          <span className="tutorial-card-time">{tutorial.readTime} min</span>
        </div>
      </div>
    </Link>
  );
}
