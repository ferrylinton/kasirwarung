import { create } from 'zustand';
import { AccentColor, ACCENT_COLORS, AccentThemeConfig } from '../types/theme';

interface ThemeState {
  accent: AccentColor;
  isDark: boolean;
  setAccent: (accent: AccentColor) => void;
  toggleDark: () => void;
  setDark: (isDark: boolean) => void;
  getCurrentConfig: () => AccentThemeConfig;
}

export function applyThemeToDOM(accent: AccentColor, isDark: boolean) {
  if (typeof document === 'undefined') return;

  const config = ACCENT_COLORS.find((c) => c.id === accent) || ACCENT_COLORS[7]; // default green

  const root = document.documentElement;
  const body = document.body;

  // 1. Toggle dark class on root <html> and <body> as explicitly required
  if (isDark) {
    root.classList.add('dark');
    body.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    body.classList.remove('dark');
    root.style.colorScheme = 'light';
  }

  // 2. Set theme accent dataset
  root.setAttribute('data-theme-accent', accent);
  body.setAttribute('data-theme-accent', accent);

  // 3. Set dynamic CSS variables for the 10 accents
  root.style.setProperty('--theme-primary', config.hex);
  root.style.setProperty('--theme-hover', config.hover);
  root.style.setProperty('--theme-light', isDark ? config.darkLight : config.light);
  root.style.setProperty('--theme-border', isDark ? config.darkBorder : config.border);
  root.style.setProperty('--theme-text', isDark ? config.darkText : config.text);
  root.style.setProperty('--theme-fg', config.fg);
  root.style.setProperty('--theme-ring', config.ring);

  // Store in localStorage
  try {
    localStorage.setItem('kasirwarung_theme_accent', accent);
    localStorage.setItem('kasirwarung_theme_dark', isDark ? 'true' : 'false');
  } catch (e) {
    console.warn('Failed to save theme to localStorage:', e);
  }
}

// Initial values from localStorage
const initialAccent: AccentColor = (typeof window !== 'undefined' &&
  (localStorage.getItem('kasirwarung_theme_accent') as AccentColor)) ||
  'green';

const initialDark: boolean =
  typeof window !== 'undefined'
    ? localStorage.getItem('kasirwarung_theme_dark') === 'true'
    : false;

// Apply immediately on script load
if (typeof window !== 'undefined') {
  applyThemeToDOM(initialAccent, initialDark);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  accent: initialAccent,
  isDark: initialDark,

  setAccent: (accent: AccentColor) => {
    set({ accent });
    applyThemeToDOM(accent, get().isDark);
  },

  toggleDark: () => {
    const nextDark = !get().isDark;
    set({ isDark: nextDark });
    applyThemeToDOM(get().accent, nextDark);
  },

  setDark: (isDark: boolean) => {
    set({ isDark });
    applyThemeToDOM(get().accent, isDark);
  },

  getCurrentConfig: () => {
    const currentAccent = get().accent;
    return ACCENT_COLORS.find((c) => c.id === currentAccent) || ACCENT_COLORS[7];
  },
}));
