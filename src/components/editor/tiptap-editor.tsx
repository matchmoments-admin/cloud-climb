'use client';

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { EditorToolbar } from './toolbar';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function TipTapEditor({
  content,
  onChange,
  placeholder = 'Start writing your article...',
  className,
}: TipTapEditorProps) {
  const lowlight = createLowlight(common);
  const isExternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Use CodeBlockLowlight instead
        heading: {
          levels: [2, 3, 4],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full mx-auto',
        },
        allowBase64: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[var(--color-link)] underline',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'not-prose',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      // Don't trigger onChange if this was an external update
      if (isExternalUpdate.current) {
        isExternalUpdate.current = false;
        return;
      }
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
    // Prevent SSR hydration mismatch
    immediatelyRender: false,
  });

  // Sync editor content when prop changes externally (e.g., from AI generation)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      isExternalUpdate.current = true;
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  return (
    <div className={`tiptap-editor ${className || ''}`}>
      <EditorToolbar editor={editor} />
      <div className="editor-content-wrapper">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
