'use client';

import { useState, useEffect } from 'react';

export function useVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleChange = () => setIsVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleChange);
    return () => document.removeEventListener('visibilitychange', handleChange);
  }, []);

  return isVisible;
}