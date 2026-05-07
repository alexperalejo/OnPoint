import { useEffect, useState } from 'react';

const STORAGE_KEY = 'onpoint-theme';

function getInitialMode() {
  // Manual override wins; fall back to system preference
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(getInitialMode);

  // Listen for system changes (only applies when no manual override is stored)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setIsDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply to <html> whenever mode changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  function toggleDarkMode() {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  }

  return { isDarkMode, toggleDarkMode };
}
