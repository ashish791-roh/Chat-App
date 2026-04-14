"use client";

import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";
import { useEffect, useState } from "react";

const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY || "";
const gf = new GiphyFetch(apiKey);

const categories = ["Trending", "😂 Funny", "❤️ Love", "🔥 Reactions", "🙏 Thanks"];

export default function GifPicker({
  onGifClick,
}: {
  onGifClick: (url: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Trending");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [error, setError] = useState(false);

  // ✅ Load favorites + recent searches
  useEffect(() => {
    setFavorites(JSON.parse(localStorage.getItem("gif_favs") || "[]"));
    setRecentSearches(JSON.parse(localStorage.getItem("gif_recent") || "[]"));
  }, []);

  // ✅ Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ✅ Save recent searches
  useEffect(() => {
    if (debouncedSearch) {
      const updated = [debouncedSearch, ...recentSearches.filter(s => s !== debouncedSearch)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("gif_recent", JSON.stringify(updated));
    }
  }, [debouncedSearch]);

  // ✅ Fetch GIFs
  const fetchGifs = async (offset: number) => {
    try {
      setError(false);

      if (activeCategory !== "Trending" && !debouncedSearch) {
        return await gf.search(activeCategory, { offset, limit: 12 });
      }

      return debouncedSearch
        ? await gf.search(debouncedSearch, { offset, limit: 12 })
        : await gf.trending({ offset, limit: 12 });

    } catch (err) {
      console.error(err);
      setError(true);
      return { data: [] };
    }
  };

  // ✅ Toggle favorite
  const toggleFavorite = (url: string) => {
    let updated;
    if (favorites.includes(url)) {
      updated = favorites.filter(f => f !== url);
    } else {
      updated = [url, ...favorites];
    }
    setFavorites(updated);
    localStorage.setItem("gif_favs", JSON.stringify(updated));
  };

  return (
    <div className="
      absolute bottom-2 left-20 z-[120]
      w-[360px] h-[420px]
      bg-white dark:bg-slate-900
      border border-gray-200 dark:border-slate-700
      rounded-2xl shadow-2xl
      flex flex-col overflow-hidden
    ">

      {/* 🔍 Search */}
      <div className="p-3 border-b dark:border-slate-700 space-y-2">
        <input
          type="text"
          placeholder="Search GIFs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-sm outline-none"
        />

        {/* Recent searches */}
        {recentSearches.length > 0 && !search && (
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((item, i) => (
              <button
                key={i}
                onClick={() => setSearch(item)}
                className="text-xs px-2 py-1 bg-gray-200 dark:bg-slate-700 rounded-full"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 📂 Categories */}
      <div className="flex gap-2 overflow-x-auto px-3 py-2 border-b dark:border-slate-700 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              setSearch("");
            }}
            className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ${
              activeCategory === cat
                ? "bg-blue-500 text-white"
                : "bg-gray-200 dark:bg-slate-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ❤️ Favorites */}
      {favorites.length > 0 && !search && (
        <div className="px-3 py-2 border-b dark:border-slate-700">
          <p className="text-xs mb-2 text-gray-500">Favorites</p>
          <div className="flex gap-2 overflow-x-auto">
            {favorites.map((url, i) => (
              <img
                key={i}
                src={url}
                onClick={() => onGifClick(url)}
                className="w-16 h-16 object-cover rounded cursor-pointer"
              />
            ))}
          </div>
        </div>
      )}

      {/* GIF GRID */}
      {error ? (
        <div className="flex flex-col items-center justify-center flex-1 text-sm text-gray-500">
          Error loading GIFs
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          <Grid
            key={debouncedSearch + activeCategory}
            width={360}
            columns={3}
            gutter={6}
            fetchGifs={fetchGifs}
            onGifClick={(gif, e) => {
              e.preventDefault();
              onGifClick(gif.images.fixed_height.url);
            }}
            renderGif={(gif, i) => {
              const url = gif.images.fixed_height.url;
              const isFav = favorites.includes(url);

              return (
                <div key={i} className="relative group">
                  <img
                    src={url}
                    className="w-full rounded cursor-pointer"
                    onClick={() => onGifClick(url)}
                  />

                  {/* ❤️ Favorite button */}
                  <button
                    onClick={() => toggleFavorite(url)}
                    className="absolute top-1 right-1 text-white text-xs bg-black/50 px-1 rounded opacity-0 group-hover:opacity-100"
                  >
                    {isFav ? "❤️" : "🤍"}
                  </button>
                </div>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}