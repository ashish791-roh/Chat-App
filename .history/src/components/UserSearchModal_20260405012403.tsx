"use client";

import { useState } from "react";
import { Search, UserPlus, Phone, Hash, X } from "lucide-react";
import {
  collection, query, where, getDocs, limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/types/chat";
import { cn } from "@/lib/chatHelpers";

interface UserSearchModalProps {
  myUid: string;
  onStartChat: (user: UserProfile) => void;
  onClose: () => void;
}

type SearchMode = "uid" | "phone";

export default function UserSearchModal({
  myUid,
  onStartChat,
  onClose,
}: UserSearchModalProps) {
  const [mode, setMode] = useState<SearchMode>("uid");
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    const val = searchInput.trim();
    if (!val) return;

    setSearching(true);
    setError("");
    setResults([]);
    setSearched(false);

    try {
      let q;

      if (mode === "uid") {
        // Exact UID match — document ID lookup
        q = query(
          collection(db, "users"),
          where("__name__", "==", val),
          limit(1)
        );
      } else {
        // Phone number match
        q = query(
          collection(db, "users"),
          where("phoneNumber", "==", val),
          limit(5)
        );
      }

      const snap = await getDocs(q);
      const found: UserProfile[] = [];

      snap.forEach((d) => {
        if (d.id === myUid) return; // exclude self
        const data = d.data();
        found.push({
          uid: d.id,
          displayName: data.displayName ?? "Unknown",
          avatar: data.avatar ?? null,
          phoneNumber: data.phoneNumber ?? null,
          isOnline: data.isOnline ?? false,
        });
      });

      setResults(found);
      setSearched(true);

      if (found.length === 0) {
        setError(
          mode === "uid"
            ? "No user found with that UID."
            : "No user found with that phone number."
        );
      }
    } catch (err) {
      console.error("User search failed:", err);
      setError("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border dark:border-slate-800 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
              <Search size={18} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Find a User
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl mb-5">
          <button
            onClick={() => { setMode("uid"); setResults([]); setSearched(false); setError(""); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
              mode === "uid"
                ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <Hash size={14} />
            By UID
          </button>
          <button
            onClick={() => { setMode("phone"); setResults([]); setSearched(false); setError(""); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
              mode === "phone"
                ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <Phone size={14} />
            By Phone
          </button>
        </div>

        {/* Search Input */}
        <div className="flex gap-2 mb-4">
          <input
            type={mode === "phone" ? "tel" : "text"}
            placeholder={
              mode === "uid"
                ? "Paste exact UID…"
                : "+91 98765 43210"
            }
            className="flex-1 p-4 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border dark:border-slate-700 focus:ring-2 ring-blue-500 outline-none text-sm"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            autoFocus
          />
          <button
            onClick={handleSearch}
            disabled={!searchInput.trim() || searching}
            className="px-5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all text-sm shadow-lg shadow-blue-500/20"
          >
            {searching ? "…" : "Search"}
          </button>
        </div>

        {/* UID hint */}
        {mode === "uid" && (
          <p className="text-[10px] text-gray-400 mb-4 ml-1">
            Share your UID with others so they can find you:
            <span className="font-mono font-bold text-blue-500 ml-1 select-all">{myUid}</span>
          </p>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-500 mb-4 ml-1">{error}</p>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {results.map((user) => (
              <div
                key={user.uid}
                className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700 hover:border-blue-400 transition-all group"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {user.displayName.charAt(0)}
                  </div>
                  {user.isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-white truncate">
                    {user.displayName}
                  </p>
                  {user.phoneNumber && (
                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Phone size={9} />
                      {user.phoneNumber}
                    </p>
                  )}
                  <p className="text-[10px] font-mono text-gray-300 dark:text-gray-600 truncate">
                    {user.uid}
                  </p>
                </div>

                <button
                  onClick={() => { onStartChat(user); onClose(); }}
                  className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95 transition-all opacity-0 group-hover:opacity-100"
                  title="Start chat"
                >
                  <UserPlus size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}