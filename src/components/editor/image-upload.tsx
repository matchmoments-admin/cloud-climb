'use client';

import { useState, useRef, useCallback } from 'react';
import imageCompression from 'browser-image-compression';

type ImageUploadMode = 'upload' | 'url' | 'generate';
type AspectRatio = '1:1' | '16:9' | '3:2' | '4:3' | '9:16';

interface ImageUploadModalProps {
  onUpload: (url: string) => void;
  onClose: () => void;
}

export function ImageUploadModal({ onUpload, onClose }: ImageUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [mode, setMode] = useState<ImageUploadMode>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate mode state
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [generating, setGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      // Client-side validation
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be under 10MB');
        return;
      }

      setUploading(true);
      setError(null);

      try {
        // Compress image before upload (skip for SVG/GIF)
        let fileToUpload: File = file;
        const skipCompression = file.type === 'image/svg+xml' || file.type === 'image/gif';

        if (!skipCompression && file.size > 100 * 1024) {
          // Only compress if larger than 100KB
          fileToUpload = await imageCompression(file, {
            maxSizeMB: 2, // Target max 2MB after compression
            maxWidthOrHeight: 2400, // Max dimension
            useWebWorker: true,
            preserveExif: false,
          });
        }

        const formData = new FormData();
        formData.append('file', fileToUpload);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        onUpload(data.url);
      } catch (err: any) {
        setError(err.message || 'Failed to upload image');
      } finally {
        setUploading(false);
      }
    },
    [onUpload]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  const handleUrlSubmit = useCallback(() => {
    if (!urlInput.trim()) {
      setError('Please enter a URL');
      return;
    }
    try {
      new URL(urlInput); // Validate URL
      onUpload(urlInput);
    } catch {
      setError('Invalid URL');
    }
  }, [urlInput, onUpload]);

  const handleGenerate = useCallback(async () => {
    if (!generatePrompt.trim()) {
      setError('Please enter a description for the image');
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedPreview(null);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: generatePrompt.trim(),
          aspectRatio,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setGeneratedPreview(data.url);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to generate image');
    } finally {
      setGenerating(false);
    }
  }, [generatePrompt, aspectRatio]);

  const handleUseGeneratedImage = useCallback(() => {
    if (generatedPreview) {
      onUpload(generatedPreview);
    }
  }, [generatedPreview, onUpload]);

  return (
    <div className="toolbar-modal-overlay" onClick={onClose}>
      <div
        className="toolbar-modal toolbar-modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="toolbar-modal-header">
          <h4>Insert Image</h4>
          <button
            type="button"
            onClick={onClose}
            className="toolbar-modal-close"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Mode tabs */}
        <div className="image-upload-tabs">
          <button
            type="button"
            className={`image-upload-tab ${mode === 'upload' ? 'active' : ''}`}
            onClick={() => { setMode('upload'); setError(null); }}
          >
            Upload
          </button>
          <button
            type="button"
            className={`image-upload-tab ${mode === 'url' ? 'active' : ''}`}
            onClick={() => { setMode('url'); setError(null); }}
          >
            URL
          </button>
          <button
            type="button"
            className={`image-upload-tab ${mode === 'generate' ? 'active' : ''}`}
            onClick={() => { setMode('generate'); setError(null); }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ marginRight: '4px', verticalAlign: 'middle' }}
            >
              <path d="M12 3l1.912 5.813L20 10.5l-4.588 3.939L17.175 21 12 17.25 6.825 21l1.763-6.561L4 10.5l6.088-1.687L12 3z" />
            </svg>
            Generate
          </button>
        </div>

        {mode === 'upload' ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              className={`image-upload-dropzone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              {uploading ? (
                <div className="upload-loading">
                  <div className="upload-spinner" />
                  <span>Uploading...</span>
                </div>
              ) : (
                <>
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="upload-icon"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className="upload-text">
                    Drop image here or <strong>click to browse</strong>
                  </span>
                  <span className="upload-hint">
                    Supports JPEG, PNG, WebP, GIF (auto-compressed)
                  </span>
                </>
              )}
            </div>
          </>
        ) : mode === 'url' ? (
          <div className="image-upload-url">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="input"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleUrlSubmit();
                }
              }}
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              className="btn btn-teal"
              disabled={!urlInput.trim()}
            >
              Insert
            </button>
          </div>
        ) : (
          <div className="image-generate-content">
            {generatedPreview ? (
              <div className="image-generate-preview">
                <img src={generatedPreview} alt="Generated preview" />
                <div className="image-generate-preview-actions">
                  <button
                    type="button"
                    onClick={handleUseGeneratedImage}
                    className="btn btn-teal"
                  >
                    Use Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeneratedPreview(null)}
                    className="btn btn-secondary"
                  >
                    Generate New
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="image-generate-form">
                  <label htmlFor="generate-prompt" className="image-generate-label">
                    Describe the image you want to create
                  </label>
                  <textarea
                    id="generate-prompt"
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    placeholder="A serene mountain landscape at sunset with clouds..."
                    className="image-generate-textarea"
                    rows={3}
                    disabled={generating}
                  />
                  <div className="image-generate-options">
                    <label htmlFor="aspect-ratio" className="image-generate-label-inline">
                      Aspect Ratio
                    </label>
                    <select
                      id="aspect-ratio"
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                      className="image-generate-select"
                      disabled={generating}
                    >
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="3:2">3:2 (Photo)</option>
                      <option value="4:3">4:3 (Standard)</option>
                      <option value="1:1">1:1 (Square)</option>
                      <option value="9:16">9:16 (Portrait)</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="btn btn-teal image-generate-btn"
                  disabled={!generatePrompt.trim() || generating}
                >
                  {generating ? (
                    <>
                      <div className="upload-spinner" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 3l1.912 5.813L20 10.5l-4.588 3.939L17.175 21 12 17.25 6.825 21l1.763-6.561L4 10.5l6.088-1.687L12 3z" />
                      </svg>
                      Generate Image
                    </>
                  )}
                </button>
                <p className="image-generate-hint">
                  AI-generated images using Gemini. May take 10-20 seconds.
                </p>
              </>
            )}
          </div>
        )}

        {error && <p className="image-upload-error">{error}</p>}
      </div>
    </div>
  );
}

// Standalone image picker button for forms (featured image)
interface ImagePickerProps {
  value?: string;
  onChange: (url: string | null) => void;
  className?: string;
}

export function ImagePicker({ value, onChange, className }: ImagePickerProps) {
  const [showModal, setShowModal] = useState(false);

  const handleUpload = useCallback(
    (url: string) => {
      onChange(url);
      setShowModal(false);
    },
    [onChange]
  );

  return (
    <div className={className}>
      {value ? (
        <div className="image-picker-preview">
          <img src={value} alt="Selected" className="image-picker-img" />
          <div className="image-picker-actions">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="btn btn-secondary btn-sm"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="btn btn-secondary btn-sm"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="image-picker-empty"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span>Add featured image</span>
        </button>
      )}

      {showModal && (
        <ImageUploadModal onUpload={handleUpload} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
