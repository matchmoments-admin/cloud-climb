import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArticleCardGrid } from '@/components/blog/article-card';
import { getArticleBySlug, getRelatedArticles } from '@/lib/salesforce/queries/articles';
import { formatDate } from '@/lib/utils';
import type { Metadata } from 'next';
import type { Article } from '@/types/domain';

export const revalidate = 300;

// Mock article for development
const mockArticle: Article = {
  id: '1',
  title: 'Building Scalable Systems with Event-Driven Architecture',
  slug: 'building-scalable-systems-event-driven',
  subtitle: 'How modern distributed systems leverage events for loose coupling and high throughput',
  body: `
    <p>Event-driven architecture (EDA) is a software design pattern that promotes the production, detection, consumption, and reaction to events. In modern distributed systems, this pattern has become increasingly popular due to its ability to create loosely coupled, scalable applications.</p>

    <h2>What is Event-Driven Architecture?</h2>
    <p>At its core, EDA is about communication through events. An event is a significant change in state—when a user clicks a button, when a payment is processed, or when a sensor detects motion. Instead of components directly calling each other, they communicate by emitting and responding to events.</p>

    <h2>Key Benefits</h2>
    <p>There are several compelling reasons to consider event-driven architecture:</p>
    <ul>
      <li><strong>Loose Coupling:</strong> Components don't need to know about each other directly. They only need to know about the events they care about.</li>
      <li><strong>Scalability:</strong> Event consumers can be scaled independently based on load.</li>
      <li><strong>Flexibility:</strong> New features can be added by creating new event consumers without modifying existing code.</li>
      <li><strong>Resilience:</strong> If one component fails, others can continue operating.</li>
    </ul>

    <h2>Implementation Patterns</h2>
    <p>There are several ways to implement event-driven systems:</p>

    <h3>Event Sourcing</h3>
    <p>Instead of storing current state, you store a sequence of events. The current state is derived by replaying events. This provides a complete audit trail and enables powerful debugging capabilities.</p>

    <h3>CQRS (Command Query Responsibility Segregation)</h3>
    <p>Separate your read and write models. Commands (writes) generate events, while queries (reads) use optimized read models. This allows you to optimize each path independently.</p>

    <pre><code>// Example event structure
interface UserRegisteredEvent {
  type: 'USER_REGISTERED';
  userId: string;
  email: string;
  timestamp: Date;
}

// Event handler
async function handleUserRegistered(event: UserRegisteredEvent) {
  await sendWelcomeEmail(event.email);
  await updateAnalytics('user_registered', event);
}</code></pre>

    <h2>Choosing the Right Message Broker</h2>
    <p>The message broker is the backbone of your event-driven system. Popular choices include:</p>
    <ul>
      <li><strong>Apache Kafka:</strong> Excellent for high-throughput, persistent event streams</li>
      <li><strong>RabbitMQ:</strong> Great for traditional message queuing with rich routing capabilities</li>
      <li><strong>AWS SNS/SQS:</strong> Managed services that reduce operational overhead</li>
    </ul>

    <figure>
      <img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80" alt="Server infrastructure" />
      <figcaption>Modern event-driven systems can process millions of events per second</figcaption>
    </figure>

    <h2>Best Practices</h2>
    <p>When building event-driven systems, keep these principles in mind:</p>
    <ol>
      <li>Design events as immutable facts about what happened</li>
      <li>Include all necessary context in the event payload</li>
      <li>Version your events to handle schema evolution</li>
      <li>Implement idempotent event handlers</li>
      <li>Plan for event ordering and exactly-once delivery challenges</li>
    </ol>

    <blockquote>
      "The best architectures enable systems to evolve independently while maintaining overall coherence."
    </blockquote>

    <h2>Conclusion</h2>
    <p>Event-driven architecture is a powerful pattern that can help you build more scalable, maintainable, and resilient systems. While it introduces complexity, the benefits often outweigh the costs for systems that need to handle high scale or require loose coupling between components.</p>

    <p>In future posts, we'll dive deeper into specific implementation patterns and show real-world examples of event-driven systems in production.</p>
  `,
  excerpt: 'Learn how event-driven architecture can help you build systems that scale effortlessly while remaining maintainable.',
  featuredImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80',
  category: 'Engineering',
  tags: ['architecture', 'scalability', 'events'],
  author: {
    id: 'a1',
    name: 'Sarah Chen',
    firstName: 'Sarah',
    lastName: 'Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
    bio: 'Principal Engineer at Cloud Climb with 10+ years of experience building distributed systems. Previously at AWS and Netflix.',
    role: 'Principal Engineer',
    slug: 'sarah-chen',
  },
  publishedDate: new Date('2026-01-15'),
  readTime: 8,
  viewCount: 1250,
  isFeatured: true,
  metaTitle: 'Building Scalable Systems with Event-Driven Architecture',
  metaDescription: 'Learn how event-driven architecture can help you build systems that scale effortlessly while remaining maintainable.',
};

const mockRelatedArticles: Article[] = [
  {
    id: '4',
    title: 'Microservices vs Monoliths: Making the Right Choice',
    slug: 'microservices-vs-monoliths',
    body: 'The architecture debate continues...',
    excerpt: 'A practical guide to choosing the right architecture for your project.',
    featuredImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
    category: 'Engineering',
    tags: ['architecture', 'microservices'],
    author: mockArticle.author,
    publishedDate: new Date('2026-01-08'),
    readTime: 10,
    viewCount: 1800,
    isFeatured: false,
  },
  {
    id: '2',
    title: 'The Future of AI in Software Development',
    slug: 'future-ai-software-development',
    body: 'AI is transforming development...',
    excerpt: 'Exploring how AI tools are changing the landscape of software development.',
    featuredImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
    category: 'Tech',
    tags: ['AI', 'development'],
    author: {
      id: 'a2',
      name: 'Marcus Johnson',
      firstName: 'Marcus',
      lastName: 'Johnson',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
      bio: 'Tech Lead',
      role: 'Tech Lead',
      slug: 'marcus-johnson',
    },
    publishedDate: new Date('2026-01-12'),
    readTime: 6,
    viewCount: 890,
    isFeatured: false,
  },
  {
    id: '3',
    title: 'TypeScript Best Practices for Large Codebases',
    slug: 'typescript-best-practices-large-codebases',
    body: 'Managing type safety...',
    excerpt: 'Practical tips and patterns for maintaining clean, type-safe code.',
    featuredImage: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&q=80',
    category: 'Tutorials',
    tags: ['typescript', 'best-practices'],
    author: {
      id: 'a3',
      name: 'Emily Rodriguez',
      firstName: 'Emily',
      lastName: 'Rodriguez',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80',
      bio: 'Senior Developer',
      role: 'Senior Developer',
      slug: 'emily-rodriguez',
    },
    publishedDate: new Date('2026-01-10'),
    readTime: 12,
    viewCount: 2100,
    isFeatured: false,
  },
];

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const article = await getArticleBySlug(slug);
    if (!article) {
      return { title: 'Article Not Found' };
    }

    return {
      title: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt,
      openGraph: {
        title: article.title,
        description: article.excerpt,
        images: [{ url: article.featuredImage }],
        type: 'article',
        publishedTime: article.publishedDate.toISOString(),
        authors: [article.author.name],
      },
      twitter: {
        card: 'summary_large_image',
        title: article.title,
        description: article.excerpt,
        images: [article.featuredImage],
      },
    };
  } catch {
    return {
      title: mockArticle.title,
      description: mockArticle.excerpt,
    };
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;

  let article: Article | null = null;
  let relatedArticles: Article[] = [];

  try {
    article = await getArticleBySlug(slug);
    if (article) {
      relatedArticles = await getRelatedArticles(article, 3);
    }
  } catch (error) {
    console.error('Failed to fetch article from Salesforce:', error);
  }

  // Use mock data if Salesforce fails or article not found
  if (!article) {
    if (slug === mockArticle.slug) {
      article = mockArticle;
      relatedArticles = mockRelatedArticles;
    } else {
      notFound();
    }
  }

  if (relatedArticles.length === 0) {
    relatedArticles = mockRelatedArticles;
  }

  return (
    <article>
      {/* Article Header */}
      <header className="container-wide pt-12 pb-8 md:pt-16 md:pb-12">
        <div className="article-header">
          {/* Meta */}
          <div className="article-meta">
            <Link href={`/category/${article.category.toLowerCase().replace(/\s+/g, '-')}`} className="category-pill">
              {article.category}
            </Link>
            <span className="article-meta-divider" />
            <time dateTime={article.publishedDate.toISOString()}>
              {formatDate(article.publishedDate)}
            </time>
            <span className="article-meta-divider" />
            <span>{article.readTime} min read</span>
          </div>

          {/* Title */}
          <h1 className="article-title">{article.title}</h1>

          {/* Subtitle */}
          {article.subtitle && (
            <p className="article-subtitle">{article.subtitle}</p>
          )}
        </div>
      </header>

      {/* Featured Image */}
      <div className="container-content mb-12 md:mb-16">
        <div className="relative aspect-[2/1] md:aspect-[21/9] overflow-hidden rounded-[var(--radius-xl)]">
          <Image
            src={article.featuredImage}
            alt={article.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 960px) 100vw, 960px"
          />
        </div>
      </div>

      {/* Article Content */}
      <div className="container-prose pb-16">
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: article.body }}
        />
      </div>

      {/* Author Card */}
      <section className="container-prose pb-16">
        <div className="author-card">
          <Image
            src={article.author.avatar}
            alt={article.author.name}
            width={56}
            height={56}
            className="author-avatar"
          />
          <div className="author-info">
            <h4>Written by {article.author.name}</h4>
            <p>{article.author.bio}</p>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section id="newsletter" className="container-prose pb-16">
        <div className="newsletter-box">
          <h3>Enjoyed this article?</h3>
          <p>Get more insights on cloud architecture and engineering delivered to your inbox.</p>
          <form className="newsletter-form">
            <input
              type="email"
              placeholder="Enter your email"
              className="input flex-1"
              required
            />
            <button type="submit" className="btn btn-teal whitespace-nowrap">
              Subscribe
            </button>
          </form>
        </div>
      </section>

      {/* Related Articles */}
      <section className="section border-t border-[var(--color-border)]">
        <div className="container-wide">
          <div className="section-header">
            <h2 className="section-title">Related Articles</h2>
            <p className="section-subtitle">Continue exploring similar topics</p>
          </div>
          <ArticleCardGrid articles={relatedArticles} />
        </div>
      </section>
    </article>
  );
}
