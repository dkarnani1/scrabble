'use client';

import * as React from 'react';
import { Button } from '@ui/components/primitives';
import { cn } from '@ui/lib/classnames';

export type InviteCodeBoxProps = {
  inviteCode: string;
  inviteUrl: string;
  className?: string;
};

export function InviteCodeBox({ inviteCode, inviteUrl, className }: InviteCodeBoxProps) {
  const [copied, setCopied] = React.useState<'code' | 'link' | null>(null);

  async function copy(value: string, label: 'code' | 'link') {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Fallback: leave as no-op; the user can still select the text manually.
    }
  }

  return (
    <section
      data-testid="invite-code-box"
      className={cn(
        'rounded-lg border border-board-line bg-board-base/60 p-4',
        'flex flex-col gap-3',
        className,
      )}
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-tile-edge">
          Invite a friend
        </h2>
        <span className="text-xs text-tile-ink/60">single use</span>
      </header>

      <div className="flex items-center gap-2">
        <code
          data-testid="invite-code-value"
          className="flex-1 rounded-md border border-board-line bg-board-base px-3 py-2 font-mono text-lg tracking-[0.3em]"
        >
          {inviteCode}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copy(inviteCode, 'code')}
        >
          {copied === 'code' ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <input
          readOnly
          value={inviteUrl}
          aria-label="Invite link"
          className="flex-1 truncate rounded-md border border-board-line bg-board-base px-3 py-2 text-sm text-tile-ink/80"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copy(inviteUrl, 'link')}
        >
          {copied === 'link' ? 'Copied' : 'Copy link'}
        </Button>
      </div>
    </section>
  );
}
