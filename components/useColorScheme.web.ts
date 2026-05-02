import { useTheme } from './ThemeContext';

export function useColorScheme() {
  return useTheme().colorScheme;
}
