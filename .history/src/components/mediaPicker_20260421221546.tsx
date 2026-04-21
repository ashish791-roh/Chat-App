"use client";

import React, { useEffect, useState, useRef } from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { FileText } from "lucide-react";

const gf = process.env.NEXT_PUBLIC_GIPHY_KEY
  ? new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_KEY)
  : null;

type Tab = "emoji" | "gif" | "sticker" | "document";

export default function MediaPicker({
  onSelect,
}: {
  onSelect: (item: any, type: Tab) => void;
}) {
  const [tab, setTab] = useState<Tab>("emoji");
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const emojis = [
    "😀","😂","😍","😭","😎","🔥","❤️","👍","🎉","😡",
    "🥰","😴","🤔","😆","🤩","💀","👀","🙏"
  ];

  const stickers = ["😂", "❤️", "🔥", "👍", "😭", "😍", "🎉", "💯"];

  const handleDocumentSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Upload document and send message
      onSelect(file, "document");
    }
  };

  const fetchGIFs = async (q: string) => {
    if (!gf) {
      setError("Missing Giphy API Key");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res =
        q && q !== "trending"
          ? await gf.search(q, { limit: 24, rating: "g" })
          : await gf.trending({ limit: 24, rating: "g" });

      setGifs(res.data || []);
    } catch (err) {
      console.error("GIF fetch error:", err);
      setError("Failed to load GIFs. Try again.");
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED DEBOUNCE (only ONE effect)
  useEffect(() => {
    if (tab !== "gif") return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchGIFs(query || "trending");
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, tab]);

  // load trending when GIF tab opens
  useEffect(() => {
    if (tab === "gif") {
      setQuery("");
      fetchGIFs("trending");
    }
  }, [tab]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/70 backdrop-blur-xl rounded-t-2xl shadow-xl p-3 max-h-[70vh] flex flex-col">

      {/* TABS */}
      <div className="flex justify-around border-b mb-2 text-white">
        <button onClick={() => setTab("emoji")} className="py-2 px-3">😊</button>
        <button onClick={() => setTab("gif")} className="py-2 px-3">GIF</button>
        <button onClick={() => setTab("sticker")} className="py-2 px-3">Sticker</button>
        <button onClick={() => setTab("document")} className="py-2 px-3">
          <FileText size={16} />
        </button>
      </div>

      {/* SEARCH */}
      {tab === "gif" && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs..."
          className="border px-3 py-2 rounded mb-2 text-sm"
        />
      )}

      {/* ERROR */}
      {error && tab === "gif" && (
        <div className="text-red-400 text-sm mb-2 text-center">
          {error}
        </div>
      )}

      {/* CONTENT */}
      <div className="overflow-y-auto grid grid-cols-4 gap-2">

        {/* EMOJI */}
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

        {/* GIF */}
        {tab === "gif" &&
          gifs.map((gif: any) => (
            <img
              key={gif.id}
              src={gif.images.fixed_width.url}
              onClick={() => onSelect(gif, "gif")}
              className="h-20 w-full object-cover rounded-md cursor-pointer"
            />
          ))}

        {/* STICKERS */}
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

        {/* DOCUMENTS */}
        {tab === "document" && (
          <div className="col-span-4 flex flex-col items-center justify-center p-8">
            <FileText size={48} className="text-gray-400 mb-4" />
            <p className="text-white text-center mb-4">Share documents, PDFs, and files</p>
            <button
              onClick={() => documentInputRef.current?.click()}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Select File
            </button>
          </div>
        )}
      </div>

      {/* Hidden document input */}
      <input
        type="file"
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
        onChange={handleDocumentSelect}
        className="hidden"
        ref={documentInputRef}
      />

      {loading && tab === "gif" && (
        <div className="text-center text-sm mt-2 text-white">
          Loading GIFs...
        </div>
      )}
    </div>
  );
}