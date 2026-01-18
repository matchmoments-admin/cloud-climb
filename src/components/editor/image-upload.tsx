'use client';

import { useState, useRef, useCallback } from 'react';

interface ImageUploadModalProps {
  onUpload: (url: string) => void;
  onClose: () => void;
}

export function ImageUploadModal({ onUpload, onClose }: ImageUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      // Client-side validation
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be under 5MB');
        return;
      }

      setUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

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
            onClick={() => setMode('upload')}
          >
            Upload
          </button>
          <button
            type="button"
            className={`image-upload-tab ${mode === 'url' ? 'active' : ''}`}
            onClick={() => setMode('url')}
          >
            URL
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
                    Supports JPEG, PNG, WebP, GIF (max 5MB)
                  </span>
                </>
              )}
            </div>
          </>
        ) : (
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
          <span>Click to upload featured image</span>
        </button>
      )}

      {showModal && (
        <ImageUploadModal onUpload={handleUpload} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
