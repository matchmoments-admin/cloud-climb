'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { marked } from 'marked';
import { TipTapEditor } from '@/components/editor/tiptap-editor';
import { ImagePicker } from '@/components/editor/image-upload';
import { AIGenerationPanel } from '@/components/admin/ai-generation-panel';
import type { Article } from '@/types/domain';
import type { GeneratedBlogContent, GeneratedExerciseContent } from '@/lib/ai/gemini';

// Configure marked for safe HTML output
marked.setOptions({
  gfm: true,
  breaks: true,
});

interface ArticleFormProps {
  article?: Article;
  mode: 'create' | 'edit';
}

const CATEGORIES = [
  'Engineering',
  'Tech',
  'Tutorials',
  'Study Guides',
  'Certification Tips',
  'News',
  'Product',
];

const STATUSES = ['Draft', 'Pending Review', 'Published', 'Archived'];

export function ArticleForm({ article, mode }: ArticleFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: article?.title || '',
    subtitle: article?.subtitle || '',
    body: article?.body || '',
    excerpt: article?.excerpt || '',
    slug: article?.slug || '',
    category: article?.category || '',
    tags: article?.tags.join(', ') || '',
    headerImageUrl: article?.featuredImage || '',
    authorName: article?.author.name || '',
    status: 'Draft',
    isPublished: false,
    isFeatured: article?.isFeatured || false,
    articleDate: article?.publishedDate
      ? new Date(article.publishedDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  });

  const updateField = useCallback(
    <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Handle AI-generated blog content
  const handleApplyBlogContent = useCallback((content: GeneratedBlogContent) => {
    // Convert markdown body to HTML for TipTap editor
    const htmlBody = content.body ? marked.parse(content.body) : '';

    setFormData((prev) => ({
      ...prev,
      title: content.title || prev.title,
      slug: content.slug || prev.slug,
      excerpt: content.excerpt || prev.excerpt,
      body: (typeof htmlBody === 'string' ? htmlBody : '') || prev.body,
      category: content.category || prev.category,
    }));
  }, []);

  // Handle AI-generated exercise content
  const handleApplyExerciseContent = useCallback((content: GeneratedExerciseContent) => {
    // Convert markdown body to HTML for TipTap editor
    const htmlBody = content.body ? marked.parse(content.body) : '';

    setFormData((prev) => ({
      ...prev,
      title: content.title || prev.title,
      slug: content.slug || prev.slug,
      excerpt: content.excerpt || prev.excerpt,
      body: (typeof htmlBody === 'string' ? htmlBody : '') || prev.body,
      category: 'Tutorials', // Exercises typically go in Tutorials
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url =
        mode === 'create'
          ? '/api/admin/articles'
          : `/api/admin/articles/${article?.id}`;

      const method = mode === 'create' ? 'POST' : 'PATCH';

      const payload = {
        ...formData,
        tags: formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        isPublished: formData.status === 'Published',
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      router.push('/admin/posts');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="article-form">
      {/* AI Content Generator */}
      <div className="article-form-ai">
        <AIGenerationPanel
          onApplyBlogContent={handleApplyBlogContent}
          onApplyExerciseContent={handleApplyExerciseContent}
          defaultContentType="blog"
        />
      </div>

      <div className="article-form-main">
        {/* Title */}
        <div className="form-field">
          <label htmlFor="title" className="form-label">
            Title <span className="required">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Enter article title"
            className="input input-lg"
            required
          />
        </div>

        {/* Subtitle */}
        <div className="form-field">
          <label htmlFor="subtitle" className="form-label">
            Subtitle
          </label>
          <input
            id="subtitle"
            type="text"
            value={formData.subtitle}
            onChange={(e) => updateField('subtitle', e.target.value)}
            placeholder="Brief subtitle or deck"
            className="input"
          />
        </div>

        {/* Featured Image */}
        <div className="form-field">
          <label className="form-label">Featured Image</label>
          <ImagePicker
            value={formData.headerImageUrl || undefined}
            onChange={(url) => updateField('headerImageUrl', url || '')}
          />
        </div>

        {/* Body - TipTap Editor */}
        <div className="form-field">
          <label className="form-label">
            Content <span className="required">*</span>
          </label>
          <TipTapEditor
            content={formData.body}
            onChange={(html) => updateField('body', html)}
            placeholder="Write your article content..."
          />
        </div>

        {/* Excerpt */}
        <div className="form-field">
          <label htmlFor="excerpt" className="form-label">
            Excerpt
          </label>
          <textarea
            id="excerpt"
            value={formData.excerpt}
            onChange={(e) => updateField('excerpt', e.target.value)}
            placeholder="Brief summary for cards and SEO (auto-generated if left empty)"
            className="input"
            rows={3}
          />
          <p className="form-hint">
            Leave empty to auto-generate from content
          </p>
        </div>
      </div>

      {/* Sidebar */}
      <div className="article-form-sidebar">
        {/* Publish Settings */}
        <div className="form-card">
          <h3 className="form-card-title">Publish</h3>

          <div className="form-field">
            <label htmlFor="status" className="form-label">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => updateField('status', e.target.value)}
              className="input"
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="articleDate" className="form-label">
              Publish Date
            </label>
            <input
              id="articleDate"
              type="date"
              value={formData.articleDate}
              onChange={(e) => updateField('articleDate', e.target.value)}
              className="input"
            />
          </div>

          <div className="form-field">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => updateField('isFeatured', e.target.checked)}
              />
              <span>Featured article</span>
            </label>
          </div>
        </div>

        {/* Category & Tags */}
        <div className="form-card">
          <h3 className="form-card-title">Organization</h3>

          <div className="form-field">
            <label htmlFor="category" className="form-label">
              Category <span className="required">*</span>
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => updateField('category', e.target.value)}
              className="input"
              required
            >
              <option value="">Select category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="tags" className="form-label">
              Tags
            </label>
            <input
              id="tags"
              type="text"
              value={formData.tags}
              onChange={(e) => updateField('tags', e.target.value)}
              placeholder="aws, cloud, tutorial"
              className="input"
            />
            <p className="form-hint">Comma-separated tags</p>
          </div>
        </div>

        {/* URL & SEO */}
        <div className="form-card">
          <h3 className="form-card-title">URL & SEO</h3>

          <div className="form-field">
            <label htmlFor="slug" className="form-label">
              URL Slug
            </label>
            <div className="input-prefix-group">
              <span className="input-prefix">/</span>
              <input
                id="slug"
                type="text"
                value={formData.slug}
                onChange={(e) =>
                  updateField(
                    'slug',
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '-')
                      .replace(/-+/g, '-')
                  )
                }
                placeholder="auto-generated-from-title"
                className="input input-with-prefix"
              />
            </div>
            <p className="form-hint">
              Leave empty to auto-generate from title
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="authorName" className="form-label">
              Author Name
            </label>
            <input
              id="authorName"
              type="text"
              value={formData.authorName}
              onChange={(e) => updateField('authorName', e.target.value)}
              placeholder="Author name"
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="article-form-actions">
        {error && <p className="form-error">{error}</p>}

        <div className="article-form-buttons">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-teal" disabled={saving}>
            {saving
              ? 'Saving...'
              : mode === 'create'
                ? 'Create Article'
                : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}
