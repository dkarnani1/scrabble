'use client';

import { Button } from '@ui/components/primitives';

export type SubmitButtonProps = {
  onSubmit: () => void;
  disabled?: boolean;
  pending?: boolean;
  rejectionReason?: string | null;
};

export function SubmitButton({ onSubmit, disabled, pending, rejectionReason }: SubmitButtonProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Button onClick={onSubmit} disabled={disabled || pending}>
        {pending ? 'Submitting…' : 'Submit'}
      </Button>
      {rejectionReason && (
        <p role="alert" className="text-xs text-premium-tw">
          {rejectionReason}
        </p>
      )}
    </div>
  );
}
