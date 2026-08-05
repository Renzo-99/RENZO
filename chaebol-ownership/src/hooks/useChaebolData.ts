"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Chaebol, Company, OwnershipLink } from "@/types/database";

interface ChaebolData {
  chaebol: Chaebol;
  companies: Company[];
  links: OwnershipLink[];
}

export function useChaebolList() {
  const [chaebols, setChaebols] = useState<Chaebol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from("chaebols")
        .select("*")
        .order("rank");

      if (error) {
        setError(error.message);
      } else {
        setChaebols(data ?? []);
      }
      setLoading(false);
    }
    fetch();
  }, []);

  return { chaebols, loading, error };
}

export function useChaebolDetail(chaebolId: string | null) {
  const [data, setData] = useState<ChaebolData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    const [chaebolRes, companiesRes, linksRes] = await Promise.all([
      supabase.from("chaebols").select("*").eq("id", id).single(),
      supabase.from("companies").select("*").eq("chaebol_id", id),
      supabase.from("ownership_links").select("*").eq("chaebol_id", id),
    ]);

    if (chaebolRes.error) {
      setError(chaebolRes.error.message);
      setLoading(false);
      return;
    }

    setData({
      chaebol: chaebolRes.data,
      companies: companiesRes.data ?? [],
      links: linksRes.data ?? [],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (chaebolId) fetchData(chaebolId);
  }, [chaebolId, fetchData]);

  return { data, loading, error, refetch: () => chaebolId && fetchData(chaebolId) };
}
