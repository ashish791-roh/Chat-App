"use client";

import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";
import { useState } from "react";

const gf = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_API_KEY || "");

export default function GifPicker({ onGifClick }: { onGifClick: (url: string) => void }) {
  const [search, setSearch] = useState("");

  const fetchGifs = (offset: number) =>
    search
      ? gf.search(search, { offset, limit: 12 })
      : gf.trending({ offset, limit: 12 });

  return (
    <div className="
      absolute bottom-20 left-0 z-[120]
      w-[360px] h-[420px]
      bg-white dark:bg-slate-900
      border border-gray-200 dark:border-slate-700
      rounded-2xl shadow-2xl
      flex flex-col overflow-hidden
    ">
      
      {/* 🔍 Search Bar */}
      <div className="p-3 border-b border-gray-200 dark:border-slate-700">
        <input
          type="text"
          placeholder="Search GIFs..."
          className="
            w-full p-2 rounded-lg text-sm outline-none
            bg-gray-100 dark:bg-slate-800
            text-gray-800 dark:text-white
          "
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 🎬 GIF Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <Grid
          width={340}               // ✅ must match container
          columns={2}               // ✅ best layout
          gutter={6}                // spacing
          fetchGifs={fetchGifs}
          key={search}
          onGifClick={(gif, e) => {
            e.preventDefault();
            onGifClick(gif.images.fixed_height.url);
          }}
        />
      </div>
    </div>
  );
}