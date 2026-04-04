import { useState, useEffect, useCallback } from "react";

const HISTORY_KEY = "snapcut_history";

export interface HistoryItem {
  id: string;
  addedAt: number;
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage on mount (avoids hydration mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // ensure valid format, clean out old malformed data if any
          const validItems = parsed.filter(item => item && typeof item.id === 'string');
          setHistory(validItems);
        }
      }
    } catch (e) {
      console.error("Failed to parse history from localStorage", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to local storage whenever history changes, if it's been loaded
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  }, [history, isLoaded]);

  const addVideoToHistory = useCallback((id: string) => {
    setHistory((prev) => {
      // Don't add duplicate
      if (prev.some((item) => item.id === id)) {
        return prev;
      }
      return [{ id, addedAt: Date.now() }, ...prev];
    });
  }, []);

  const removeVideoFromHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  return {
    history,
    isLoaded,
    addVideoToHistory,
    removeVideoFromHistory,
    clearHistory,
  };
}
