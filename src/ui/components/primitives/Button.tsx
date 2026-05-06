'use client';

import * as React from 'react';
import { Button as ShadcnButton } from '@ui/components/ui/button';

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<ButtonSize, 'sm' | 'default' | 'lg'> = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
};

export type ButtonProps = Omit<React.ComponentProps<typeof ShadcnButton>, 'size' | 'variant'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = 'default',
  size = 'md',
  type = 'button',
  ...rest
}: ButtonProps) {
  return <ShadcnButton variant={variant} size={SIZE_MAP[size]} type={type} {...rest} />;
}
