"use client";

import React, { useEffect, useRef, useState } from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";

const gf = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_KEY || "");

type Gif = any;
type Mode = "gif" | "sticker";

interface Props {
  onSelect: (gif: Gif, mode: Mode) => void;
  onClose?: () => void;
}

export default function GifPickerV3({ onSelect, onClose }: Props) {
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("gif");

  const loaderRef = useRef<HTMLDivElement | null>(null);

  // -----------------------------
  // 🔥 SUGGESTIONS (WHATSAPP STYLE)
  // -----------------------------
  const suggestions = [
    "love",
    "happy",
    "sad",
    "angry",
    "funny",
    "wow",
    "party",
    "cat",
  ];

  const stickers = ["😂", "❤️", "🔥", "👍", "😭", "😍", "🎉"];

  // -----------------------------
  // ⚡ TRENDING (FIXED)
  // -----------------------------
  const fetchTrending = async (offsetValue = 0) => {
    if (!gf) return;

    setLoading(true);

    const res = await gf.trending({
      limit: 24,
      offset: offsetValue,
      rating: "g",
    });

    const data = res?.data || [];

    setGifs((prev) => (offsetValue === 0 ? data : [...prev, ...data]));
    setOffset(offsetValue + 24);
    setHasMore(data.length > 0);

    setLoading(false);
  };

  // -----------------------------
  // 🔍 SEARCH (FIXED + SAFE)
  // -----------------------------
  const fetchSearch = async (q: string, reset = true) => {
    if (!gf) return;

    setLoading(true);

    const res = await gf.search(q || "trending", {
      limit: 24,
      offset: reset ? 0 : offset,
      rating: "g",
    });

    const data = res?.data || [];

    setGifs((prev) => (reset ? data : [...prev, ...data]));
    setOffset((prev) => prev + 24);
    setHasMore(data.length > 0);

    setLoading(false);
  };

  // -----------------------------
  // 🚀 INITIAL LOAD (FIX BLANK ISSUE)
  // -----------------------------
  useEffect(() => {
    fetchTrending(0);
  }, []);

  // -----------------------------
  // 🔍 DEBOUNCED SEARCH
  // -----------------------------
  useEffect(() => {
    const t = setTimeout(() => {
      if (!query) {
        fetchTrending(0);
      } else {
        fetchSearch(query, true);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [query]);

  // -----------------------------
  // 📜 INFINITE SCROLL
  // -----------------------------
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          if (query) {
            fetchSearch(query, false);
          } else {
            fetchTrending(offset);
          }
        }
      },
      { threshold: 1 }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);

    return () => observer.disconnect();
  }, [hasMore, loading, query, offset]);

  // -----------------------------
  // 😀 EMOJI / QUICK SELECT
  // -----------------------------
  const handleQuickSelect = (value: string) => {
    setQuery(value);
  };

  // -----------------------------
  // 🧠 SELECT GIF / STICKER
  // -----------------------------
  const handleSelect = (gif: Gif) => {
    onSelect(gif, mode);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
      <div className="w-full md:w-[520px] bg-white rounded-t-2xl md:rounded-2xl p-3 max-h-[85vh] flex flex-col">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">GIFs & Stickers</h2>
          <button onClick={onClose} className="text-lg">✕</button>
        </div>

        {/* MODE SWITCH */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setMode("gif")}
            className={`px-3 py-1 rounded text-sm ${
              mode === "gif" ? "bg-black text-white" : "bg-gray-200"
            }`}
          >
            GIF
          </button>

          <button
            onClick={() => setMode("sticker")}
            className={`px-3 py-1 rounded text-sm ${
              mode === "sticker" ? "bg-black text-white" : "bg-gray-200"
            }`}
          >
            Sticker 🔥
          </button>
        </div>

        {/* STICKER QUICK BAR */}
        <div className="flex gap-2 mb-2 flex-wrap">
          {stickers.map((s, i) => (
            <button
              key={i}
              onClick={() => handleQuickSelect(s)}
              className="text-lg bg-gray-100 px-2 py-1 rounded hover:scale-110 transition"
            >
              {s}
            </button>
          ))}
        </div>

        {/* SEARCH INPUT */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs or emojis..."
          className="border px-3 py-2 rounded mb-2 text-sm outline-none"
        />

        {/* SUGGESTIONS */}
        <div className="flex gap-2 overflow-x-auto mb-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleQuickSelect(s)}
              className="px-3 py-1 text-xs bg-gray-200 rounded-full whitespace-nowrap"
            >
              {s}
            </button>
          ))}
        </div>

        {/* GRID */}
        <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2">
          {gifs.map((gif: any) => (
            <div
              key={gif.id}
              onClick={() => handleSelect(gif)}
              onMouseEnter={() => setHoveredId(gif.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="cursor-pointer"
            >
              <img
                src={
                  hoveredId === gif.id
                    ? gif.images.fixed_width.url
                    : gif.images.fixed_width_small_still.url
                }
                className={`w-full h-24 object-cover rounded-md transition ${
                  mode === "sticker" ? "rounded-2xl scale-95" : ""
                }`}
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {/* LOADER (INFINITE SCROLL) */}
        <div ref={loaderRef} className="h-10 flex items-center justify-center">
          {loading && <span className="text-sm">Loading...</span>}
        </div>
      </div>
    </div>
  );
}