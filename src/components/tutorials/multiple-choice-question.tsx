'use client';

import { useState } from 'react';
import type { Answer } from '@/types/domain';

interface MultipleChoiceQuestionProps {
  answers: Answer[];
  questionType: 'Multiple_Choice' | 'True_False' | 'Multiple_Select';
  onAnswer: (selectedIds: string[], isCorrect: boolean) => void;
  disabled?: boolean;
}

export function MultipleChoiceQuestion({
  answers,
  questionType,
  onAnswer,
  disabled = false,
}: MultipleChoiceQuestionProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const isMultiSelect = questionType === 'Multiple_Select';

  const handleSelect = (answerId: string) => {
    if (disabled) return;

    setSelected((prev) => {
      const next = new Set(prev);
      if (isMultiSelect) {
        if (next.has(answerId)) {
          next.delete(answerId);
        } else {
          next.add(answerId);
        }
      } else {
        next.clear();
        next.add(answerId);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    const selectedIds = Array.from(selected);
    const correctIds = answers.filter((a) => a.isCorrect).map((a) => a.id);

    // Check if answer is correct
    const isCorrect =
      selectedIds.length === correctIds.length &&
      selectedIds.every((id) => correctIds.includes(id));

    onAnswer(selectedIds, isCorrect);
  };

  return (
    <div className="mc-question">
      <div className="mc-options">
        {answers.map((answer) => (
          <button
            key={answer.id}
            type="button"
            onClick={() => handleSelect(answer.id)}
            disabled={disabled}
            className={`mc-option ${selected.has(answer.id) ? 'selected' : ''}`}
          >
            <span className="mc-option-indicator">
              {isMultiSelect ? (
                <span className={`mc-checkbox ${selected.has(answer.id) ? 'checked' : ''}`}>
                  {selected.has(answer.id) && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
              ) : (
                <span className={`mc-radio ${selected.has(answer.id) ? 'checked' : ''}`} />
              )}
            </span>
            <span className="mc-option-text">{answer.answerText}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || selected.size === 0}
        className="btn btn-teal mc-submit"
      >
        Check Answer
      </button>
    </div>
  );
}
