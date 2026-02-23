import { useEffect, useState } from 'react';

export function useDarkMode() {
  // listens to system on first load
  const getSystemPref = () =>
  !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;


  const [isDarkMode, setIsDarkMode] = useState(getSystemPref);

  // Listen once for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      setIsDarkMode(e.matches); // system always overrides
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply to <html> whenever it changes
  useEffect(() => {
    applyDarkMode(isDarkMode);
  }, [isDarkMode]);


  return { isDarkMode};
}

function applyDarkMode(isDark) {
  document.documentElement.classList.toggle('dark', isDark);
}
