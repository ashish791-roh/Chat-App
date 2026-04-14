"use client";

import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";
import { useState } from "react";

const gf = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_API_KEY || "");

export default function GifPicker({ onGifClick }: { onGifClick: (url: string) => void }) {
  const [search, setSearch] = useState("");

  const fetchGifs = (offset: number) => 
    search ? gf.search(search, { offset, limit: 10 }) : gf.trending({ offset, limit: 10 });

  return (
    <div className="absolute bottom-16 right-0 z-50 bg-white dark:bg-slate-900 p-4 border dark:border-slate-700 rounded-2xl shadow-2xl w-80 h-96 flex flex-col gap-2">
      <input 
        type="text"
        placeholder="Search GIPHY..."
        className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-sm outline-none"
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        <Grid
          width={280}
          columns={2}
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