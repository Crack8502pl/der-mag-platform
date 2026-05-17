// frontend/src/hooks/useRailwayAutocomplete.ts
// Hooks for PKP PLK railway autocomplete with debounce + cache

import { useState, useEffect, useRef } from 'react';
import { railwayService, type RailwayLineDto, type RailwayStationDto } from '../services/railway.service';

const DEBOUNCE_MS = 300;

// ─── useLineSearch ────────────────────────────────────────────────────────────

interface LineSearchResult {
  lines: RailwayLineDto[];
  loading: boolean;
}

export function useLineSearch(query: string): LineSearchResult {
  const [lines, setLines] = useState<RailwayLineDto[]>([]);
  const [loading, setLoading] = useState(false);
  const cache = useRef<Map<string, RailwayLineDto[]>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const key = query.trim();

    if (cache.current.has(key)) {
      setLines(cache.current.get(key)!);
      setLoading(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await railwayService.searchLines(key || undefined);
        cache.current.set(key, result);
        setLines(result);
      } catch {
        setLines([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  return { lines, loading };
}

// ─── useStationSearch ─────────────────────────────────────────────────────────

interface StationSearchResult {
  stations: RailwayStationDto[];
  loading: boolean;
}

export function useStationSearch(query: string, lineCode?: string): StationSearchResult {
  const [stations, setStations] = useState<RailwayStationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const cache = useRef<Map<string, RailwayStationDto[]>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const q = query.trim();
    if (!q) {
      setStations([]);
      return;
    }

    const key = `${q}::${lineCode ?? ''}`;

    if (cache.current.has(key)) {
      setStations(cache.current.get(key)!);
      setLoading(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await railwayService.searchStations(q, lineCode);
        cache.current.set(key, result);
        setStations(result);
      } catch {
        setStations([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, lineCode]);

  return { stations, loading };
}
