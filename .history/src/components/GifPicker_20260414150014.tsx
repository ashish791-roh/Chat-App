"use client";

import React, { useEffect, useState, useCallback } from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";

const gf = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_KEY || "");

type Gif = any;

interface GifPickerProps {
  onSelect: (gif: Gif) => void;
  onClose?: () => void;
  query?: string;
}

export default function GifPicker({
  onSelect,
  onClose,
  query = "trending",
}: GifPickerProps) {
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(query);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // 🔥 FIX: safe fetch function
  const fetchGifs = useCallback(async (q: string) => {
    if (!gf) {
      setError("Giphy API key missing");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await gf.search(q || "trending", {
        limit: 24,
        rating: "g",
      });

      if (res?.data) {
        setGifs(res.data);
      } else {
        setGifs([]);
      }
    } catch (err) {
      console.error("GIF fetch error:", err);
      setError("Error loading GIFs. Try again?");
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔥 FIX: debounce search
  useEffect(() => {
    const delay = setTimeout(() => {
      fetchGifs(search);
    }, 400);

    return () => clearTimeout(delay);
  }, [search, fetchGifs]);

  // initial load
  useEffect(() => {
    fetchGifs(query);
  }, [fetchGifs, query]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
      <div className="w-full md:w-[520px] bg-white rounded-t-2xl md:rounded-2xl p-3 max-h-[80vh] flex flex-col shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-lg">GIFs</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black text-sm"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search GIFs..."
          className="w-full border rounded-md px-3 py-2 text-sm mb-3 outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-200 animate-pulse rounded-md"
                />
              ))}
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm text-center py-6">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-3 gap-2">
              {gifs.map((gif: any) => (
                <div
                  key={gif.id}
                  className="cursor-pointer"
                  onClick={() => onSelect(gif)}
                  onMouseEnter={() => setHoveredId(gif.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <img
                    src={
                      hoveredId === gif.id
                        ? gif.images.fixed_width.url
                        : gif.images.fixed_width_small_still.url
                    }
                    alt="gif"
                    className="rounded-md w-full h-24 object-cover transition"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}