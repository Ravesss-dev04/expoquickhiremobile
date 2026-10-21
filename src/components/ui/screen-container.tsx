import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenContainerProps = {
  children: ReactNode;
  className?: string;
};

export function ScreenContainer({ children, className }: ScreenContainerProps) {
  return (
    <SafeAreaView className={`flex-1 bg-background ${className ?? ''}`} edges={['top', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
}