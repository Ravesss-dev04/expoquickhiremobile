import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

type CardProps = ViewProps & {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className, ...viewProps }: CardProps) {
  return (
    <View
      className={`gap-4 rounded-md border border-border bg-surface p-5 ${className ?? ''}`}
      {...viewProps}>
      {children}
    </View>
  );
}