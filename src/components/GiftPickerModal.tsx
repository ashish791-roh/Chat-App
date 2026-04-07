"use client";

import { useState } from "react";
import { X, Gift } from "lucide-react";
import { cn } from "@/lib/chatHelpers";

export interface GiftItem {
  id: string;
  emoji: string;
  label: string;
  cost: number;
}

export const GIFTS: GiftItem[] = [
  { id: "rose",        emoji: "🌹", label: "Rose",         cost: 10  },
  { id: "heart",       emoji: "❤️",  label: "Heart",        cost: 15  },
  { id: "cake",        emoji: "🎂",  label: "Birthday Cake",cost: 20  },
  { id: "trophy",      emoji: "🏆",  label: "Trophy",       cost: 50  },
  { id: "diamond",     emoji: "💎",  label: "Diamond",      cost: 100 },
  { id: "fire",        emoji: "🔥",  label: "Fire",         cost: 25  },
  { id: "star",        emoji: "⭐",  label: "Star",         cost: 30  },
  { id: "crown",       emoji: "👑",  label: "Crown",        cost: 75  },
  { id: "balloon",     emoji: "🎈",  label: "Balloon",      cost: 12  },
  { id: "unicorn",     emoji: "🦄",  label: "Unicorn",      cost: 60  },
  { id: "pizza",       emoji: "🍕",  label: "Pizza",        cost: 18  },
  { id: "rocket",      emoji: "🚀",  label: "Rocket",       cost: 40  },
];

interface GiftPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (gift: GiftItem) => void;
  recipientName: string;
}

export default function GiftPickerModal({
  isOpen,
  onClose,
  onSend,
  recipientName,
}: GiftPickerModalProps) {
  const [selected, setSelected] = useState<GiftItem | null>(null);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!selected) return;
    setSent(true);
    onSend(selected);
    setTimeout(() => {
      setSent(false);
      setSelected(null);
      onClose();
    }, 800);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl border dark:border-slate-800 animate-in slide-in-from-bottom-4 sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-pink-100 dark:bg-pink-900/30 rounded-2xl flex items-center justify-center">
              <Gift size={17} className="text-pink-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800 dark:text-white leading-tight">
                Send a Gift
              </h2>
              {recipientName && (
                <p className="text-[11px] text-gray-400">to {recipientName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* Gift Grid */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {GIFTS.map((gift) => (
            <button
              key={gift.id}
              onClick={() => setSelected(gift)}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all active:scale-95",
                selected?.id === gift.id
                  ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20 scale-105 shadow-md"
                  : "border-transparent bg-gray-50 dark:bg-slate-800 hover:border-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/10"
              )}
            >
              <span className="text-2xl leading-none">{gift.emoji}</span>
              <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 truncate w-full text-center">
                {gift.label}
              </span>
              <span className="text-[9px] font-bold text-pink-500">
                {gift.cost} 🪙
              </span>
            </button>
          ))}
        </div>

        {/* Selected preview + Send button */}
        <div className="flex items-center gap-3">
          <div className="flex-1 p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl min-h-[44px] flex items-center">
            {selected ? (
              <span className="text-sm text-gray-700 dark:text-gray-200 font-medium flex items-center gap-2">
                <span className="text-xl">{selected.emoji}</span>
                {selected.label}
                <span className="text-xs text-pink-500 font-bold ml-auto">{selected.cost} 🪙</span>
              </span>
            ) : (
              <span className="text-xs text-gray-400">Pick a gift above…</span>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!selected || sent}
            className={cn(
              "px-5 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg",
              selected && !sent
                ? "bg-pink-500 hover:bg-pink-600 text-white shadow-pink-500/30"
                : "bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed"
            )}
          >
            {sent ? "Sent! 🎉" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}