'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StatusBadge } from './status-badge';
import type { Question } from '@/types/domain';

interface QuestionListProps {
  questions: Question[];
}

// Badge colors for question types
const typeColors: Record<string, string> = {
  Multiple_Choice: 'status-info',
  True_False: 'status-info',
  Multiple_Select: 'status-info',
  Fill_Blank: 'status-warning',
  Code_Completion: 'status-success',
};

// Badge colors for difficulty
const difficultyColors: Record<string, string> = {
  Beginner: 'status-success',
  Intermediate: 'status-warning',
  Advanced: 'status-error',
};

function formatQuestionType(type: string): string {
  return type.replace(/_/g, ' ');
}

export function QuestionList({ questions }: QuestionListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (question: Question) => {
    const preview = question.questionText.slice(0, 50) + (question.questionText.length > 50 ? '...' : '');
    if (!confirm(`Are you sure you want to delete this question?\n\n"${preview}"`)) {
      return;
    }

    setDeletingId(question.id);

    try {
      const response = await fetch(`/api/admin/questions/${question.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }

      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(message || 'Failed to delete question');
    } finally {
      setDeletingId(null);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="admin-empty-state">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <h3>No questions yet</h3>
        <p>Create your first question to get started.</p>
        <Link href="/admin/questions/new" className="btn btn-teal mt-4">
          Create Question
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: '45%' }}>Question</th>
            <th>Type</th>
            <th>Difficulty</th>
            <th>Status</th>
            <th style={{ width: '100px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((question) => (
            <tr key={question.id}>
              <td>
                <div className="admin-article-info">
                  <Link
                    href={`/admin/questions/${question.id}`}
                    className="admin-article-title"
                  >
                    {question.questionText.slice(0, 80)}
                    {question.questionText.length > 80 ? '...' : ''}
                  </Link>
                  <span className="admin-article-slug">
                    {question.name} &middot; {question.points} pt{question.points !== 1 ? 's' : ''}
                    {question.codeLanguage && ` &middot; ${question.codeLanguage}`}
                  </span>
                </div>
              </td>
              <td>
                <span className={`admin-status-badge ${typeColors[question.questionType] || ''}`}>
                  {formatQuestionType(question.questionType)}
                </span>
              </td>
              <td>
                {question.difficultyLevel ? (
                  <span className={`admin-status-badge ${difficultyColors[question.difficultyLevel] || ''}`}>
                    {question.difficultyLevel}
                  </span>
                ) : (
                  <span className="text-sm text-[var(--color-text-muted)]">—</span>
                )}
              </td>
              <td>
                <StatusBadge status={question.isActive ? 'Published' : 'Draft'} />
              </td>
              <td>
                <div className="admin-actions">
                  <Link
                    href={`/admin/questions/${question.id}`}
                    className="admin-action-btn"
                    title="Edit"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(question)}
                    disabled={deletingId === question.id}
                    className="admin-action-btn admin-action-delete"
                    title="Delete"
                  >
                    {deletingId === question.id ? (
                      <div className="upload-spinner small" />
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
