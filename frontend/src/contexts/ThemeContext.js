import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

// Accent color palettes
const ACCENT_COLORS = {
  black: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
  },
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  yellow: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
  },
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
  },
};

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme-mode') || 'dark';
    }
    return 'dark';
  });

  const [accentColor, setAccentColor] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme-accent') || 'green';
    }
    return 'green';
  });

  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('theme-accent', accentColor);
    
    // Apply theme to document
    const root = document.documentElement;
    const colors = ACCENT_COLORS[accentColor];
    
    // Set CSS variables for accent color
    root.style.setProperty('--accent-50', colors[50]);
    root.style.setProperty('--accent-100', colors[100]);
    root.style.setProperty('--accent-200', colors[200]);
    root.style.setProperty('--accent-300', colors[300]);
    root.style.setProperty('--accent-400', colors[400]);
    root.style.setProperty('--accent-500', colors[500]);
    root.style.setProperty('--accent-600', colors[600]);
    root.style.setProperty('--accent-700', colors[700]);
    
    // Set mode class
    if (mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [mode, accentColor]);

  const toggleMode = () => {
    setMode(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const value = {
    mode,
    setMode,
    toggleMode,
    accentColor,
    setAccentColor,
    isDark: mode === 'dark',
    isLight: mode === 'light',
    colors: ACCENT_COLORS[accentColor],
    availableColors: Object.keys(ACCENT_COLORS),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { ACCENT_COLORS };
