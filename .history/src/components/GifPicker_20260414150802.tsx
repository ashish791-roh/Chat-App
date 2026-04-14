"use client";

import React, { useEffect, useRef, useState } from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";

type Gif = any;
type Mode = "gif" | "sticker";

const gf = process.env.NEXT_PUBLIC_GIPHY_KEY
  ? new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_KEY)
  : null;

export default function GifPickerV3({
  onSelect,
  onClose,
}: {
  onSelect: (gif: Gif, mode: Mode) => void;
  onClose?: () => void;
}) {
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("gif");

  const loaderRef = useRef<HTMLDivElement | null>(null);

  // -----------------------------
  // 🚀 SAFE FETCH (TRENDING)
  // -----------------------------
  const fetchTrending = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!gf) {
        setError("Missing Giphy API Key");
        setLoading(false);
        return;
      }

      const res = await gf.trending({
        limit: 24,
        rating: "g",
      });

      setGifs(res?.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load GIFs");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // 🚀 SAFE SEARCH
  // -----------------------------
  const fetchSearch = async (q: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!gf) {
        setError("Missing Giphy API Key");
        setLoading(false);
        return;
      }

      const res = await gf.search(q || "trending", {
        limit: 24,
        rating: "g",
      });

      setGifs(res?.data || []);
    } catch (err) {
      console.error(err);
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // 🚀 INIT LOAD (NO BLANK SCREEN FIX)
  // -----------------------------
  useEffect(() => {
    fetchTrending();
  }, []);

  // -----------------------------
  // 🔍 SEARCH WITH DEBOUNCE
  // -----------------------------
  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim().length === 0) {
        fetchTrending();
      } else {
        fetchSearch(query);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
      <div className="w-full md:w-[520px] bg-white rounded-t-2xl md:rounded-2xl p-3 max-h-[85vh] flex flex-col">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">GIFs & Stickers</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* MODE */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setMode("gif")}
            className={`px-3 py-1 rounded ${
              mode === "gif" ? "bg-black text-white" : "bg-gray-200"
            }`}
          >
            GIF
          </button>

          <button
            onClick={() => setMode("sticker")}
            className={`px-3 py-1 rounded ${
              mode === "sticker" ? "bg-black text-white" : "bg-gray-200"
            }`}
          >
            Sticker
          </button>
        </div>

        {/* SEARCH */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs..."
          className="border px-3 py-2 rounded mb-2 text-sm"
        />

        {/* ERROR STATE (IMPORTANT) */}
        {error && (
          <div className="text-red-500 text-sm mb-2">{error}</div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="text-sm text-gray-500 mb-2">Loading...</div>
        )}

        {/* GRID */}
        <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2">
          {gifs.map((gif: any) => (
            <img
              key={gif.id}
              src={gif.images.fixed_width_small_still.url}
              onClick={() => onSelect(gif, mode)}
              className={`w-full h-24 object-cover rounded-md cursor-pointer ${
                mode === "sticker" ? "rounded-2xl scale-95" : ""
              }`}
            />
          ))}
        </div>

      </div>
    </div>
  );
}