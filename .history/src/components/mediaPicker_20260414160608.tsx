"use client";

import React, { useState } from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";

const gf = process.env.NEXT_PUBLIC_GIPHY_KEY
  ? new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_KEY)
  : null;

type Tab = "emoji" | "gif" | "sticker";

export default function MediaPicker({
  onSelect,
}: {
  onSelect: (item: any, type: Tab) => void;
}) {
  const [tab, setTab] = useState<Tab>("emoji");
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // -------------------------
  // 😀 EMOJI DATA
  // -------------------------
  const emojis = [
    "😀","😂","😍","😭","😎","🔥","❤️","👍","🎉","😡",
    "🥰","😴","🤔","😆","🤩","💀","👀","🙏"
  ];

  // -------------------------
  // ⚡ GIF FETCH
  // -------------------------
    const fetchGIFs = async (q: string) => {
  if (!gf) return;

  setLoading(true);

  try {
    const res =
      q && q !== "trending"
        ? await gf.search(q, { limit: 24, rating: "g" })
        : await gf.trending({ limit: 24, rating: "g" });

    setGifs(res?.data || []);
  } catch (err) {
    console.error("GIF error:", err);
    setGifs([]);
  } finally {
    setLoading(false);
  }
};
  // -------------------------
  // SEARCH DEBOUNCE
  // -------------------------
  React.useEffect(() => {
    if (tab !== "gif") return;

    const t = setTimeout(() => {
      fetchGIFs(query);
    }, 400);

    return () => clearTimeout(t);
  }, [query, tab]);

  // -------------------------
  // LOAD DEFAULT GIFS
  // -------------------------
  React.useEffect(() => {
    if (tab !== "gif") return;
        
    fetchGIFs("trending");
  }, [tab, query]);

  // -------------------------
  // STICKERS (simple packs)
  // -------------------------
  const stickers = ["😂", "❤️", "🔥", "👍", "😭", "😍", "🎉", "💯"];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/70 backdrop-blur-xl rounded-t-2xl shadow-xl p-3 max-h-[70vh] flex flex-col">
      {/* TOP TABS (WHATSAPP STYLE) */}
      <div className="flex justify-around border-b mb-2">
        <button
          onClick={() => setTab("emoji")}
          className={`py-2 px-3 ${tab === "emoji" ? "border-b-2 border-black" : ""}`}
        >
          😊
        </button>

        <button
          onClick={() => setTab("gif")}
          className={`py-2 px-3 ${tab === "gif" ? "border-b-2 border-black" : ""}`}
        >
          GIF
        </button>

        <button
          onClick={() => setTab("sticker")}
          className={`py-2 px-3 ${tab === "sticker" ? "border-b-2 border-black" : ""}`}
        >
          Sticker
        </button>
      </div>

      {/* SEARCH ONLY FOR GIF */}
      {tab === "gif" && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs..."
          className="border px-3 py-2 rounded mb-2 text-sm"
        />
      )}

      {/* CONTENT AREA */}
      <div className="overflow-y-auto grid grid-cols-4 gap-2">

        {/* ---------------- EMOJI ---------------- */}
        {tab === "emoji" &&
          emojis.map((e, i) => (
            <button
              key={i}
              onClick={() => onSelect(e, "emoji")}
              className="text-2xl p-2 hover:scale-110 transition"
            >
              {e}
            </button>
          ))}

        {/* ---------------- GIF ---------------- */}
        {tab === "gif" &&
          gifs.map((gif: any) => (
            <img
              key={gif.id}
              src={gif.images.fixed_width_small_still.url}
              onClick={() => onSelect(gif, "gif")}
              className="h-20 w-full object-cover rounded-md cursor-pointer"
            />
          ))}

        {/* ---------------- STICKER ---------------- */}
        {tab === "sticker" &&
          stickers.map((s, i) => (
            <button
              key={i}
              onClick={() => onSelect(s, "sticker")}
              className="text-3xl p-3 hover:scale-110 transition"
            >
              {s}
            </button>
          ))}
      </div>

      {/* LOADING */}
      {loading && tab === "gif" && (
        <div className="text-center text-sm mt-2">Loading GIFs...</div>
      )}
    </div>
  );
}