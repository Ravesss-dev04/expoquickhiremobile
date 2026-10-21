import { Pressable, Text } from 'react-native';
import type { PressableProps } from 'react-native';

type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: 'primary' | 'secondary';
};

export function Button({ title, variant = 'primary', ...pressableProps }: ButtonProps) {
  const containerClassName =
    variant === 'primary'
      ? 'bg-primary'
      : 'border border-border bg-secondary';
  const titleClassName = variant === 'primary' ? 'text-white' : 'text-primary';

  return (
    <Pressable
      accessibilityRole="button"
      className={`min-h-12 items-center justify-center rounded-md px-4 py-3 active:opacity-80 disabled:opacity-50 ${containerClassName}`}
      {...pressableProps}>
      <Text className={`text-sm font-semibold ${titleClassName}`}>{title}</Text>
    </Pressable>
  );
}