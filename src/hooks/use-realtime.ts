"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeState<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
}

export function useRealtimeSubscription<T extends { id: unknown }>(
  table: string,
  filter?: { column: string; value: unknown },
): RealtimeState<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase.from(table).select("*");
      if (filter) {
        query = query.eq(filter.column, filter.value);
      }

      const { data: rows, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setData((rows ?? []) as T[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  }, [table, filter?.column, filter?.value]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let channel: RealtimeChannel;

    const setupSubscription = () => {
      channel = supabase
        .channel(`${table}-changes`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table,
            ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
          },
          (payload) => {
            setData((prev) => [...prev, payload.new as T]);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table,
            ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
          },
          (payload) => {
            setData((prev) =>
              prev.map((item) =>
                (item as Record<string, unknown>).id === (payload.new as Record<string, unknown>).id
                  ? (payload.new as T)
                  : item,
              ),
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table,
            ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
          },
          (payload) => {
            setData((prev) =>
              prev.filter(
                (item) =>
                  (item as Record<string, unknown>).id !== (payload.old as Record<string, unknown>).id,
              ),
            );
          },
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [table, filter?.column, filter?.value]);

  return { data, isLoading, error };
}