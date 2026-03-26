"use client";

import { useState, useEffect, useCallback } from "react";

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
      console.warn(`[useApi] Falling back to mock data for ${url}:`, err);
      setData(fallback);
      setError(null); // Silently use fallback
    } finally {
      setLoading(false);
    }
  }, [url, enabled, fallback]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
