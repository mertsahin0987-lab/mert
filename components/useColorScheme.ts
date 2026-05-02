export { useTheme as useColorSchemeContext } from './ThemeContext';

// Keep backward compat — screens call useColorScheme() and expect a string
import { useTheme } from './ThemeContext';
export function useColorScheme() {
  return useTheme().colorScheme;
}
