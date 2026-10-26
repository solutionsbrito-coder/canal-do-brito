import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
}

export interface TMDBDetails {
  id: number;
  genres: { id: number; name: string }[];
  runtime?: number;
  number_of_seasons?: number;
  [key: string]: unknown;
}

export const useTMDBSearch = () => {
  const [results, setResults] = useState<TMDBResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (action: string, query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("tmdb-proxy", {
        body: { action, query },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setResults(data?.results || []);
    } catch (e: any) {
      console.error("TMDB search error:", e);
      const msg = e?.message || "Erro ao buscar no TMDB";
      setError(msg);
      toast.error(msg);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (action: "movie_details" | "tv_details", id: number): Promise<TMDBDetails | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("tmdb-proxy", {
        body: { action, query: String(id) },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      return data as TMDBDetails;
    } catch (e) {
      console.error("TMDB details error:", e);
      return null;
    }
  };

  return { results, loading, error, search, setResults, fetchDetails };
};
