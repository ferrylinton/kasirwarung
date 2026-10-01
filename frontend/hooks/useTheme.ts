import { useThemeStore } from '../stores/themeStore';

export function useTheme() {
  const { accent, isDark, setAccent, toggleDark, setDark } = useThemeStore();

  return {
    accent,
    isDark,
    theme: isDark ? ('dark' as const) : ('light' as const),
    setAccent,
    toggleTheme: toggleDark,
    setDark,
  };
}

export default useTheme;
