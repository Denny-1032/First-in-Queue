"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseApiOptions<T> {
  url: string;
  fallback: T;
  enabled?: boolean;
}

interface UseApiResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T>({ url, fallback, enabled = true }: UseApiOptions<T>): UseApiResult<T> {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch data";
      console.error(`[useApi] Error fetching ${url}:`, message);
      setError(message);
      // Only use fallback on first load if no data has been set yet
      if (JSON.stringify(data) === JSON.stringify(fallbackRef.current)) {
        setData(fallbackRef.current);
      }
    } finally {
      setLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
