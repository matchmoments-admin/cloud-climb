'use client';

import { useState, useEffect } from 'react';
import type { ContentType } from '@/lib/ai/system-prompts';
import type {
  GeneratedBlogContent,
  GeneratedExerciseContent,
  GeneratedQuestionContent,
} from '@/lib/ai/gemini';

interface AIGenerationPanelProps {
  onApplyBlogContent?: (content: GeneratedBlogContent) => void;
  onApplyExerciseContent?: (content: GeneratedExerciseContent) => void;
  onApplyQuestionContent?: (content: GeneratedQuestionContent) => void;
  defaultContentType?: ContentType;
}

export function AIGenerationPanel({
  onApplyBlogContent,
  onApplyExerciseContent,
  onApplyQuestionContent,
  defaultContentType = 'blog',
}: AIGenerationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [contentType, setContentType] = useState<ContentType>(defaultContentType);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [defaultSystemPrompts, setDefaultSystemPrompts] = useState<Record<ContentType, string>>({
    blog: '',
    exercise: '',
    question: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  // Fetch default system prompts on mount
  useEffect(() => {
    async function fetchPrompts() {
      try {
        const res = await fetch('/api/admin/generate');
        if (res.ok) {
          const data = await res.json();
          if (data.systemPrompts) {
            setDefaultSystemPrompts(data.systemPrompts);
          }
        }
      } catch {
        // Silently fail - prompts are optional
      }
    }
    fetchPrompts();
  }, []);

  // Update custom system prompt when content type changes
  useEffect(() => {
    setCustomSystemPrompt(defaultSystemPrompts[contentType] || '');
  }, [contentType, defaultSystemPrompts]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedContent(null);

    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          contentType,
          customSystemPrompt: customSystemPrompt !== defaultSystemPrompts[contentType]
            ? customSystemPrompt
            : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to generate content');
      }

      setGeneratedContent(data.content);
    } catch (err: any) {
      setError(err.message || 'Failed to generate content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!generatedContent) return;

    if (contentType === 'blog' && onApplyBlogContent) {
      onApplyBlogContent(generatedContent as GeneratedBlogContent);
    } else if (contentType === 'exercise' && onApplyExerciseContent) {
      onApplyExerciseContent(generatedContent as GeneratedExerciseContent);
    } else if (contentType === 'question' && onApplyQuestionContent) {
      onApplyQuestionContent(generatedContent as GeneratedQuestionContent);
    }

    // Clear after applying
    setGeneratedContent(null);
    setPrompt('');
    setIsExpanded(false);
  };

  return (
    <div className="ai-panel">
      <button
        type="button"
        className="ai-panel-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
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
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <span>AI Content Generator</span>
        <svg
          className={`ai-panel-chevron ${isExpanded ? 'expanded' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isExpanded && (
        <div className="ai-panel-content">
          {/* Content Type Selector */}
          <div className="ai-panel-row">
            <label className="ai-panel-label">Content Type</label>
            <div className="ai-panel-tabs">
              {(['blog', 'exercise', 'question'] as ContentType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`ai-panel-tab ${contentType === type ? 'active' : ''}`}
                  onClick={() => setContentType(type)}
                >
                  {type === 'blog' ? 'Blog Post' : type === 'exercise' ? 'Exercise' : 'Question'}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div className="ai-panel-row">
            <label className="ai-panel-label">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                contentType === 'blog'
                  ? 'Write an article about AWS Lambda best practices for production workloads...'
                  : contentType === 'exercise'
                    ? 'Create a coding exercise about array manipulation using map, filter, and reduce...'
                    : 'Create a question about S3 bucket policies for the AWS Solutions Architect exam...'
              }
              className="ai-panel-textarea"
              rows={3}
            />
          </div>

          {/* System Prompt Toggle */}
          <div className="ai-panel-row">
            <button
              type="button"
              className="ai-panel-system-toggle"
              onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            >
              <svg
                className={`ai-panel-chevron ${showSystemPrompt ? 'expanded' : ''}`}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span>Edit System Prompt</span>
            </button>
          </div>

          {showSystemPrompt && (
            <div className="ai-panel-row">
              <textarea
                value={customSystemPrompt}
                onChange={(e) => setCustomSystemPrompt(e.target.value)}
                className="ai-panel-textarea ai-panel-system-textarea"
                rows={8}
              />
              <button
                type="button"
                className="ai-panel-reset"
                onClick={() => setCustomSystemPrompt(defaultSystemPrompts[contentType] || '')}
              >
                Reset to Default
              </button>
            </div>
          )}

          {/* Error */}
          {error && <div className="ai-panel-error">{error}</div>}

          {/* Generate Button */}
          <div className="ai-panel-actions">
            <button
              type="button"
              className="btn btn-teal"
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
            >
              {isLoading ? (
                <>
                  <svg className="ai-spinner" width="16" height="16" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="60"
                      strokeLinecap="round"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                'Generate Content'
              )}
            </button>
          </div>

          {/* Generated Content Preview */}
          {generatedContent && (
            <div className="ai-panel-preview">
              <h4 className="ai-panel-preview-title">Generated Content</h4>
              <div className="ai-panel-preview-content">
                {contentType === 'blog' && (
                  <>
                    <p><strong>Title:</strong> {generatedContent.title}</p>
                    <p><strong>Category:</strong> {generatedContent.category}</p>
                    <p><strong>Excerpt:</strong> {generatedContent.excerpt}</p>
                    <p><strong>Reading Time:</strong> {generatedContent.readingTime} min</p>
                  </>
                )}
                {contentType === 'exercise' && (
                  <>
                    <p><strong>Title:</strong> {generatedContent.title}</p>
                    <p><strong>Difficulty:</strong> {generatedContent.difficulty}</p>
                    <p><strong>Excerpt:</strong> {generatedContent.excerpt}</p>
                  </>
                )}
                {contentType === 'question' && (
                  <>
                    <p><strong>Question:</strong> {generatedContent.questionText}</p>
                    <p><strong>Options:</strong></p>
                    <ul>
                      {generatedContent.options?.map((opt: string, i: number) => (
                        <li key={i} className={i === generatedContent.correctAnswer ? 'correct' : ''}>
                          {i === generatedContent.correctAnswer ? '✓ ' : ''}{opt}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {generatedContent.sources?.length > 0 && (
                  <div className="ai-panel-sources">
                    <strong>Sources:</strong>
                    <ul>
                      {generatedContent.sources.map((source: { title: string; url: string }, i: number) => (
                        <li key={i}>
                          <a href={source.url} target="_blank" rel="noopener noreferrer">
                            {source.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="ai-panel-preview-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setGeneratedContent(null)}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="btn btn-teal"
                  onClick={handleApply}
                >
                  Apply to Form
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
