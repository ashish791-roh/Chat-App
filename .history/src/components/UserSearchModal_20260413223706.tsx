"use client";

import { useState } from "react";
import { Search, UserPlus, Phone, Hash, X, AtSign } from "lucide-react";
import {
  collection, query, where, getDocs, limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/types";
import { cn } from "@/lib/chatHelpers";

interface UserSearchModalProps {
  myUid: string;
  onStartChat: (user: UserProfile) => void;
  onClose: () => void;
}

type SearchMode = "username" | "uid" | "phone";

export default function UserSearchModal({
  myUid,
  onStartChat,
  onClose,
}: UserSearchModalProps) {
  const [mode, setMode] = useState<SearchMode>("username");
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const resetState = (newMode: SearchMode) => {
    setMode(newMode);
    setResults([]);
    setSearched(false);
    setError("");
    setSearchInput("");
  };

  const handleSearch = async () => {
    const val = searchInput.trim();
    if (!val) return;

    setSearching(true);
    setError("");
    setResults([]);
    setSearched(false);

    try {
      let q;

      if (mode === "username") {
        // Strip leading @ if user typed it, then lowercase
        const normalised = val.replace(/^@/, "").toLowerCase();
        q = query(
          collection(db, "users"),
          where("username", "==", normalised),
          limit(1)
        );
      } else if (mode === "uid") {
        // Exact Firestore document ID lookup
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
          displayName: data.name ?? data.displayName ?? "Unknown",
          username: data.username ?? null,
          avatar: data.avatar ?? null,
          phoneNumber: data.phoneNumber ?? null,
          isOnline: data.isOnline ?? false,
        });
      });

      setResults(found);
      setSearched(true);

      if (found.length === 0) {
        const msgs: Record<SearchMode, string> = {
          username: "No user found with that username.",
          uid: "No user found with that UID.",
          phone: "No user found with that phone number.",
        };
        setError(msgs[mode]);
      }
    } catch (err) {
      console.error("User search failed:", err);
      setError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const placeholders: Record<SearchMode, string> = {
    username: "@ashish_rohilla",
    uid: "Paste exact UID…",
    phone: "+91 98765 43210",
  };

  const tabs: { mode: SearchMode; icon: React.ReactNode; label: string }[] = [
    { mode: "username", icon: <AtSign size={14} />, label: "Username" },
    { mode: "uid",      icon: <Hash size={14} />,   label: "By UID"   },
    { mode: "phone",    icon: <Phone size={14} />,  label: "By Phone" },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border dark:border-slate-800 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
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

        {/* ── Mode Tabs ── */}
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl mb-5 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.mode}
              onClick={() => resetState(tab.mode)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all",
                mode === tab.mode
                  ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Search Input ── */}
        <div className="flex gap-2 mb-3">
          <input
            type={mode === "phone" ? "tel" : "text"}
            placeholder={placeholders[mode]}
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

        {/* ── Contextual Hints ── */}
        {mode === "username" && !searched && (
          <p className="text-[11px] text-gray-400 mb-4 ml-1">
            Search by username, e.g.{" "}
            <span className="font-mono text-blue-500">@ashish_rohilla</span>
          </p>
        )}
        {mode === "uid" && !searched && (
          <p className="text-[10px] text-gray-400 mb-4 ml-1">
            Share your UID:{" "}
            <span className="font-mono font-bold text-blue-500 select-all">{myUid}</span>
          </p>
        )}

        {/* ── Error ── */}
        {error && (
          <p className="text-xs text-red-500 mb-4 ml-1">{error}</p>
        )}

        {/* ── Results ── */}
        {results.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {results.map((user) => (
              <div
                key={user.uid}
                className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700 hover:border-blue-400 transition-all group"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {user.pro ? (
                    <img
                      src={user.avatar}
                      alt={user.displayName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-blue-600"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {user.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-white truncate">
                    {user.displayName}
                  </p>
                  {user.username && (
                    <p className="text-[12px] text-blue-500 font-mono font-semibold">
                      @{user.username}
                    </p>
                  )}
                  {user.phoneNumber && (
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Phone size={9} />
                      {user.phoneNumber}
                    </p>
                  )}
                </div>

                {/* Start Chat button */}
                <button
                  onClick={() => { onStartChat(user); onClose(); }}
                  className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                  title="Start chat"
                >
                  <UserPlus size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {searched && results.length === 0 && !error && (
          <p className="text-center text-sm text-gray-400 py-4">No users found.</p>
        )}
      </div>
    </div>
  );
}