'use client';

import { useState } from 'react';
import { MultipleChoiceQuestion } from './multiple-choice-question';
import type { ArticleQuestion } from '@/types/domain';

interface EmbeddedQuestionProps {
  articleQuestion: ArticleQuestion;
  questionNumber: number;
}

type AnswerState = 'unanswered' | 'correct' | 'incorrect';

export function EmbeddedQuestion({ articleQuestion, questionNumber }: EmbeddedQuestionProps) {
  const [state, setState] = useState<AnswerState>('unanswered');
  const [showExplanation, setShowExplanation] = useState(false);
  const { question } = articleQuestion;

  const handleAnswer = (selectedIds: string[], isCorrect: boolean) => {
    setState(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect || question.explanation) {
      setShowExplanation(true);
    }
  };

  const handleRetry = () => {
    setState('unanswered');
    setShowExplanation(false);
  };

  const isAnswerType = ['Multiple_Choice', 'True_False', 'Multiple_Select'].includes(
    question.questionType
  );

  return (
    <div className={`embedded-question ${state}`}>
      <div className="embedded-question-header">
        <span className="embedded-question-number">Question {questionNumber}</span>
        {question.difficultyLevel && (
          <span className={`embedded-question-difficulty ${question.difficultyLevel.toLowerCase()}`}>
            {question.difficultyLevel}
          </span>
        )}
        {state !== 'unanswered' && (
          <span className={`embedded-question-status ${state}`}>
            {state === 'correct' ? 'Correct!' : 'Try again'}
          </span>
        )}
      </div>

      <div className="embedded-question-text">
        <p>{question.questionText}</p>
      </div>

      {question.codeSnippet && (
        <pre className="embedded-question-code">
          <code>{question.codeSnippet}</code>
        </pre>
      )}

      {isAnswerType && question.answers.length > 0 && (
        <MultipleChoiceQuestion
          answers={question.answers}
          questionType={question.questionType as 'Multiple_Choice' | 'True_False' | 'Multiple_Select'}
          onAnswer={handleAnswer}
          disabled={state !== 'unanswered'}
        />
      )}

      {showExplanation && question.explanation && (
        <div className={`embedded-question-explanation ${state}`}>
          <strong>{state === 'correct' ? 'Great job!' : 'Explanation:'}</strong>
          <p>{question.explanation}</p>
        </div>
      )}

      {state === 'incorrect' && (
        <button type="button" onClick={handleRetry} className="btn btn-secondary mt-4">
          Try Again
        </button>
      )}

      {question.hint && state === 'unanswered' && (
        <details className="embedded-question-hint">
          <summary>Need a hint?</summary>
          <p>{question.hint}</p>
        </details>
      )}
    </div>
  );
}
