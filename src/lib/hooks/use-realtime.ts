"use client";

import { useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabase/client";

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE";

interface UseRealtimeOptions {
  table: string;
  event?: RealtimeEvent | "*";
  filter?: string;
  onRecord: (payload: { new: Record<string, unknown>; old: Record<string, unknown>; eventType: RealtimeEvent }) => void;
  enabled?: boolean;
}

export function useRealtime({ table, event = "*", filter, onRecord, enabled = true }: UseRealtimeOptions) {
  const callbackRef = useRef(onRecord);
  callbackRef.current = onRecord;

  useEffect(() => {
    if (!enabled) return;

    let channel: ReturnType<ReturnType<typeof getSupabase>["channel"]> | null = null;

    try {
      const supabase = getSupabase();
      const channelName = `realtime-${table}-${Date.now()}`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const channelConfig: any = {
        event,
        schema: "public",
        table,
      };

      if (filter) {
        channelConfig.filter = filter;
      }

      channel = supabase
        .channel(channelName)
        .on("postgres_changes", channelConfig, (payload: { new: Record<string, unknown>; old: Record<string, unknown>; eventType: RealtimeEvent }) => {
          callbackRef.current(payload);
        })
        .subscribe();
    } catch (err) {
      console.warn("[useRealtime] Supabase not configured, skipping realtime subscription:", err);
    }

    return () => {
      if (channel) {
        try {
          const supabase = getSupabase();
          supabase.removeChannel(channel);
        } catch {
          // Supabase not configured
        }
      }
    };
  }, [table, event, filter, enabled]);
}
