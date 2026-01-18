'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AIGenerationPanel } from '@/components/admin/ai-generation-panel';
import type { Question, Answer, TestCase, QuestionType } from '@/types/domain';
import type { AnswerInput, TestCaseInput } from '@/lib/validations/question';
import type { GeneratedQuestionContent } from '@/lib/ai/gemini';

interface QuestionFormProps {
  question?: Question;
  mode: 'create' | 'edit';
}

const QUESTION_TYPES = [
  { value: 'Multiple_Choice', label: 'Multiple Choice' },
  { value: 'True_False', label: 'True/False' },
  { value: 'Multiple_Select', label: 'Multiple Select' },
  { value: 'Fill_Blank', label: 'Fill in the Blank' },
  { value: 'Code_Completion', label: 'Code Completion' },
];

const DIFFICULTY_LEVELS = [
  { value: '', label: 'Select difficulty' },
  { value: 'Beginner', label: 'Beginner' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Advanced', label: 'Advanced' },
];

const CODE_LANGUAGES = [
  { value: '', label: 'Select language' },
  { value: 'JavaScript', label: 'JavaScript' },
  { value: 'TypeScript', label: 'TypeScript' },
  { value: 'Python', label: 'Python' },
  { value: 'HTML', label: 'HTML' },
  { value: 'CSS', label: 'CSS' },
  { value: 'SQL', label: 'SQL' },
];

// Helper to convert domain Answer to AnswerInput
function toAnswerInput(a: Answer): AnswerInput {
  return {
    answerText: a.answerText,
    isCorrect: a.isCorrect,
    sortOrder: a.sortOrder,
    feedback: a.feedback,
    answerCode: a.answerCode,
  };
}

// Helper to convert domain TestCase to TestCaseInput
function toTestCaseInput(tc: TestCase): TestCaseInput {
  return {
    name: tc.name,
    inputParameters: tc.inputParameters,
    expectedOutput: tc.expectedOutput,
    isHidden: tc.isHidden,
    isSample: tc.isSample,
    description: tc.description,
    sortOrder: tc.sortOrder,
    points: tc.points,
    timeoutSeconds: tc.timeoutSeconds,
  };
}

export function QuestionForm({ question, mode }: QuestionFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    questionText: question?.questionText || '',
    questionType: question?.questionType || 'Multiple_Choice',
    difficultyLevel: question?.difficultyLevel || '',
    explanation: question?.explanation || '',
    codeSnippet: question?.codeSnippet || '',
    codeLanguage: question?.codeLanguage || '',
    hint: question?.hint || '',
    points: question?.points || 1,
    isActive: question?.isActive ?? true,
    tags: question?.tags.join(', ') || '',
  });

  const [answers, setAnswers] = useState<AnswerInput[]>(
    question?.answers.map(toAnswerInput) || [
      { answerText: '', isCorrect: true, sortOrder: 0 },
      { answerText: '', isCorrect: false, sortOrder: 1 },
    ]
  );

  const [testCases, setTestCases] = useState<TestCaseInput[]>(
    question?.testCases.map(toTestCaseInput) || []
  );

  const updateField = useCallback(
    <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Handle AI-generated question content
  const handleApplyQuestionContent = useCallback((content: GeneratedQuestionContent) => {
    setFormData((prev) => ({
      ...prev,
      questionText: content.questionText || prev.questionText,
      explanation: content.explanation || prev.explanation,
    }));

    // Apply options as answers if provided
    if (content.options && content.options.length > 0) {
      const newAnswers: AnswerInput[] = content.options.map((opt, index) => ({
        answerText: opt,
        isCorrect: index === content.correctAnswer,
        sortOrder: index,
      }));
      setAnswers(newAnswers);
    }
  }, []);

  // Check if question type needs answers
  const needsAnswers = ['Multiple_Choice', 'True_False', 'Multiple_Select'].includes(
    formData.questionType
  );

  // Check if question type needs test cases
  const needsTestCases = formData.questionType === 'Code_Completion';

  // Auto-create True/False answers when switching to that type
  const handleTypeChange = (newType: string) => {
    updateField('questionType', newType as QuestionType);

    if (newType === 'True_False') {
      setAnswers([
        { answerText: 'True', isCorrect: true, sortOrder: 0 },
        { answerText: 'False', isCorrect: false, sortOrder: 1 },
      ]);
    } else if (newType === 'Code_Completion' && testCases.length === 0) {
      setTestCases([
        {
          name: 'Test Case 1',
          inputParameters: '[]',
          expectedOutput: '""',
          isHidden: false,
          isSample: true,
          sortOrder: 0,
        },
      ]);
    }
  };

  // Answer management
  const addAnswer = () => {
    setAnswers((prev) => [
      ...prev,
      { answerText: '', isCorrect: false, sortOrder: prev.length },
    ]);
  };

  const updateAnswer = (index: number, field: keyof AnswerInput, value: unknown) => {
    setAnswers((prev) =>
      prev.map((a, i) => {
        if (i === index) {
          if (field === 'isCorrect' && value === true && formData.questionType === 'Multiple_Choice') {
            // For MC, only one answer can be correct
            return { ...a, [field]: value };
          }
          return { ...a, [field]: value };
        }
        // For MC, uncheck other correct answers
        if (field === 'isCorrect' && value === true && formData.questionType === 'Multiple_Choice') {
          return { ...a, isCorrect: false };
        }
        return a;
      })
    );
  };

  const removeAnswer = (index: number) => {
    if (answers.length <= 2) return; // Minimum 2 answers
    setAnswers((prev) => prev.filter((_, i) => i !== index).map((a, i) => ({ ...a, sortOrder: i })));
  };

  // Test case management
  const addTestCase = () => {
    setTestCases((prev) => [
      ...prev,
      {
        name: `Test Case ${prev.length + 1}`,
        inputParameters: '[]',
        expectedOutput: '""',
        isHidden: false,
        isSample: false,
        sortOrder: prev.length,
      },
    ]);
  };

  const updateTestCase = (index: number, field: keyof TestCaseInput, value: unknown) => {
    setTestCases((prev) =>
      prev.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc))
    );
  };

  const removeTestCase = (index: number) => {
    setTestCases((prev) =>
      prev.filter((_, i) => i !== index).map((tc, i) => ({ ...tc, sortOrder: i }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url =
        mode === 'create'
          ? '/api/admin/questions'
          : `/api/admin/questions/${question?.id}`;

      const method = mode === 'create' ? 'POST' : 'PATCH';

      const payload = {
        ...formData,
        difficultyLevel: formData.difficultyLevel || null,
        codeLanguage: formData.codeLanguage || null,
        tags: formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        answers: needsAnswers ? answers : undefined,
        testCases: needsTestCases ? testCases : undefined,
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

      router.push('/admin/questions');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save question';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="article-form">
      {/* AI Content Generator */}
      <div className="article-form-ai">
        <AIGenerationPanel
          onApplyQuestionContent={handleApplyQuestionContent}
          defaultContentType="question"
        />
      </div>

      <div className="article-form-main">
        {/* Question Text */}
        <div className="form-field">
          <label htmlFor="questionText" className="form-label">
            Question Text <span className="required">*</span>
          </label>
          <textarea
            id="questionText"
            value={formData.questionText}
            onChange={(e) => updateField('questionText', e.target.value)}
            placeholder="Enter your question..."
            className="input"
            rows={4}
            required
          />
        </div>

        {/* Code Snippet (for code questions) */}
        {(formData.questionType === 'Code_Completion' || formData.codeSnippet) && (
          <div className="form-field">
            <label htmlFor="codeSnippet" className="form-label">
              Code Snippet / Starter Code
            </label>
            <textarea
              id="codeSnippet"
              value={formData.codeSnippet}
              onChange={(e) => updateField('codeSnippet', e.target.value)}
              placeholder="function solve() {&#10;  // Your code here&#10;}"
              className="input code-textarea"
              rows={8}
            />
          </div>
        )}

        {/* Explanation */}
        <div className="form-field">
          <label htmlFor="explanation" className="form-label">
            Explanation
          </label>
          <textarea
            id="explanation"
            value={formData.explanation}
            onChange={(e) => updateField('explanation', e.target.value)}
            placeholder="Explain the correct answer..."
            className="input"
            rows={3}
          />
          <p className="form-hint">Shown after the user answers</p>
        </div>

        {/* Hint */}
        <div className="form-field">
          <label htmlFor="hint" className="form-label">
            Hint
          </label>
          <textarea
            id="hint"
            value={formData.hint}
            onChange={(e) => updateField('hint', e.target.value)}
            placeholder="Optional hint to help users..."
            className="input"
            rows={2}
          />
        </div>

        {/* Answers Section (for MC/TF/MS) */}
        {needsAnswers && (
          <div className="form-field">
            <label className="form-label">
              Answers <span className="required">*</span>
            </label>
            <div className="answers-manager">
              {answers.map((answer, index) => (
                <div key={index} className="answer-item">
                  <div className="answer-item-header">
                    <label className="form-checkbox">
                      <input
                        type={formData.questionType === 'Multiple_Select' ? 'checkbox' : 'radio'}
                        name="correctAnswer"
                        checked={answer.isCorrect}
                        onChange={(e) => updateAnswer(index, 'isCorrect', e.target.checked)}
                      />
                      <span>Correct</span>
                    </label>
                    {answers.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeAnswer(index)}
                        className="btn-icon-sm danger"
                        title="Remove answer"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <textarea
                    value={answer.answerText}
                    onChange={(e) => updateAnswer(index, 'answerText', e.target.value)}
                    placeholder={`Answer option ${index + 1}`}
                    className="input"
                    rows={2}
                    required
                  />
                  <input
                    type="text"
                    value={answer.feedback || ''}
                    onChange={(e) => updateAnswer(index, 'feedback', e.target.value)}
                    placeholder="Feedback when selected (optional)"
                    className="input mt-2"
                  />
                </div>
              ))}
              {formData.questionType !== 'True_False' && (
                <button type="button" onClick={addAnswer} className="btn btn-secondary btn-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Answer
                </button>
              )}
            </div>
          </div>
        )}

        {/* Test Cases Section (for code questions) */}
        {needsTestCases && (
          <div className="form-field">
            <label className="form-label">
              Test Cases <span className="required">*</span>
            </label>
            <div className="test-cases-manager">
              {testCases.map((tc, index) => (
                <div key={index} className="test-case-item">
                  <div className="test-case-header">
                    <input
                      type="text"
                      value={tc.name}
                      onChange={(e) => updateTestCase(index, 'name', e.target.value)}
                      placeholder="Test case name"
                      className="input"
                      style={{ flex: 1 }}
                    />
                    <label className="form-checkbox">
                      <input
                        type="checkbox"
                        checked={tc.isSample}
                        onChange={(e) => updateTestCase(index, 'isSample', e.target.checked)}
                      />
                      <span>Sample</span>
                    </label>
                    <label className="form-checkbox">
                      <input
                        type="checkbox"
                        checked={tc.isHidden}
                        onChange={(e) => updateTestCase(index, 'isHidden', e.target.checked)}
                      />
                      <span>Hidden</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeTestCase(index)}
                      className="btn-icon-sm danger"
                      title="Remove test case"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div className="test-case-inputs">
                    <div>
                      <label className="form-label-sm">Input (JSON)</label>
                      <textarea
                        value={tc.inputParameters}
                        onChange={(e) => updateTestCase(index, 'inputParameters', e.target.value)}
                        placeholder='[3, 4]'
                        className="input code-textarea"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="form-label-sm">Expected Output (JSON)</label>
                      <textarea
                        value={tc.expectedOutput}
                        onChange={(e) => updateTestCase(index, 'expectedOutput', e.target.value)}
                        placeholder='5'
                        className="input code-textarea"
                        rows={2}
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={tc.description || ''}
                    onChange={(e) => updateTestCase(index, 'description', e.target.value)}
                    placeholder="Description (shown if sample)"
                    className="input mt-2"
                  />
                </div>
              ))}
              <button type="button" onClick={addTestCase} className="btn btn-secondary btn-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Test Case
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="article-form-sidebar">
        {/* Settings */}
        <div className="form-card">
          <h3 className="form-card-title">Settings</h3>

          <div className="form-field">
            <label htmlFor="questionType" className="form-label">
              Question Type <span className="required">*</span>
            </label>
            <select
              id="questionType"
              value={formData.questionType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="input"
              required
            >
              {QUESTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="difficultyLevel" className="form-label">
              Difficulty
            </label>
            <select
              id="difficultyLevel"
              value={formData.difficultyLevel}
              onChange={(e) => updateField('difficultyLevel', e.target.value)}
              className="input"
            >
              {DIFFICULTY_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {(formData.questionType === 'Code_Completion' || formData.codeLanguage) && (
            <div className="form-field">
              <label htmlFor="codeLanguage" className="form-label">
                Code Language {formData.questionType === 'Code_Completion' && <span className="required">*</span>}
              </label>
              <select
                id="codeLanguage"
                value={formData.codeLanguage}
                onChange={(e) => updateField('codeLanguage', e.target.value)}
                className="input"
                required={formData.questionType === 'Code_Completion'}
              >
                {CODE_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="points" className="form-label">
              Points
            </label>
            <input
              id="points"
              type="number"
              min="0"
              value={formData.points}
              onChange={(e) => updateField('points', parseInt(e.target.value) || 1)}
              className="input"
            />
          </div>

          <div className="form-field">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => updateField('isActive', e.target.checked)}
              />
              <span>Active</span>
            </label>
          </div>
        </div>

        {/* Tags */}
        <div className="form-card">
          <h3 className="form-card-title">Organization</h3>

          <div className="form-field">
            <label htmlFor="tags" className="form-label">
              Tags
            </label>
            <input
              id="tags"
              type="text"
              value={formData.tags}
              onChange={(e) => updateField('tags', e.target.value)}
              placeholder="javascript, arrays, loops"
              className="input"
            />
            <p className="form-hint">Comma-separated tags</p>
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
                ? 'Create Question'
                : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}
