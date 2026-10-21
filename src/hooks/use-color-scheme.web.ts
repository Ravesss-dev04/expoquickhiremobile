import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Use the native scheme value directly on web to avoid a hydration-based state update.
 */
export function useColorScheme() {
  const colorScheme = useRNColorScheme();

  return colorScheme ?? 'light';
}
