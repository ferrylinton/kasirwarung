import { useThemeStore } from '../store/themeStore';

export function useTheme() {
  const { theme, accent, setTheme, setAccent, toggleTheme } = useThemeStore();

  const isDark = theme === 'dark';

  return {
    theme,
    accent,
    isDark,
    setTheme,
    setAccent,
    toggleTheme,
  };
}

export default useTheme;
