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

export default function GifPickerV2({ onSelect, onClose }: Props) {
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [query, setQuery] = useState("trending");
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("gif");

  const loaderRef = useRef<HTMLDivElement | null>(null);

  // -----------------------------
  // 🧠 Smart suggestions (light AI)
  // -----------------------------
  function smartQuery(text: string) {
    const map: Record<string, string> = {
      happy: "happy",
      birthday: "birthday",
      love: "love",
      angry: "angry",
      yes: "yes",
      no: "no",
      cry: "cry",
    };

    for (const key of Object.keys(map)) {
      if (text.toLowerCase().includes(key)) return map[key];
    }

    return "trending";
  }

  // -----------------------------
  // 📦 Recent GIFs storage
  // -----------------------------
  function saveRecent(gif: Gif) {
    const old = JSON.parse(localStorage.getItem("recent_gifs") || "[]");
    const updated = [gif, ...old.filter((g: Gif) => g.id !== gif.id)].slice(0, 20);
    localStorage.setItem("recent_gifs", JSON.stringify(updated));
  }

  // -----------------------------
  // ⚡ Fetch GIFs (pagination)
  // -----------------------------
  const fetchGifs = async (reset = false, customQuery?: string) => {
    if (!gf) return;

    setLoading(true);

    const currentOffset = reset ? 0 : offset;
    const q = customQuery || query;

    const res = await gf.search(q, {
      limit: 24,
      offset: currentOffset,
      rating: "g",
    });

    const newGifs = res.data || [];

    setGifs((prev) => (reset ? newGifs : [...prev, ...newGifs]));
    setHasMore(newGifs.length > 0);

    setOffset(currentOffset + 24);
    setLoading(false);
  };

  // -----------------------------
  // 🔍 Search effect (debounced)
  // -----------------------------
  useEffect(() => {
    const t = setTimeout(() => {
      setGifs([]);
      setOffset(0);
      fetchGifs(true, query);
    }, 400);

    return () => clearTimeout(t);
  }, [query]);

  // -----------------------------
  // 📜 Infinite scroll observer
  // -----------------------------
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchGifs(false);
        }
      },
      { threshold: 1 }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);

    return () => observer.disconnect();
  }, [hasMore, loading]);

  // -----------------------------
  // 😀 Emoji → GIF
  // -----------------------------
  function handleEmojiInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;

    const smart = smartQuery(val);
    setQuery(smart);
  }

  // -----------------------------
  // 🧠 Select GIF
  // -----------------------------
  function handleSelect(gif: Gif) {
    saveRecent(gif);
    onSelect(gif, mode);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
      <div className="w-full md:w-[520px] bg-white rounded-t-2xl md:rounded-2xl p-3 max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">GIFs</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Mode Switch */}
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
            Sticker 🔥
          </button>
        </div>

        {/* Emoji / Search input */}
        <input
          placeholder="Type emoji or keyword 🙂🔥❤️"
          onChange={handleEmojiInput}
          className="border px-3 py-2 rounded mb-2 text-sm"
        />

        {/* Grid */}
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
              />
            </div>
          ))}
        </div>

        {/* Infinite scroll loader */}
        <div ref={loaderRef} className="h-10 flex justify-center items-center">
          {loading && <span className="text-sm">Loading...</span>}
        </div>
      </div>
    </div>
  );
}