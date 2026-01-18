'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NewsletterSignupProps {
  title?: string;
  description?: string;
}

export function NewsletterSignup({
  title = 'Get the latest from Cloud Climb',
  description = 'Thoughts on technology, engineering, and the future of software. Delivered to your inbox.',
}: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return;

    setStatus('loading');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Thanks for subscribing!');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="bg-[var(--color-notion-bg-secondary)] rounded-xl p-12 text-center max-w-[680px] mx-auto my-24">
      <h3 className="font-serif text-3xl font-semibold mb-4 text-[var(--color-notion-text-primary)]">
        {title}
      </h3>
      <p className="text-lg text-[var(--color-notion-text-tertiary)] mb-8">
        {description}
      </p>

      {status === 'success' ? (
        <p className="text-[var(--color-notion-link)] font-medium">{message}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={status === 'loading'}
            className="flex-1"
          />
          <Button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
          </Button>
        </form>
      )}

      {status === 'error' && (
        <p className="mt-4 text-sm text-red-600">{message}</p>
      )}
    </div>
  );
}
