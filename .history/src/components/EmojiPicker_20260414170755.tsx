// src/components/EmojiPicker.tsx
"use client";

import dynamic from "next/dynamic";
import { Theme } from "emoji-picker-react";

// ✅ Must be loaded client-side only — the package uses `window`
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

export default function ChatEmojiPicker({
  onEmojiClick,
  theme = "dark",
}: {
  onEmojiClick: (emoji: string) => void;
  theme?: "light" | "dark";
}) {
  return (
    <div className="absolute bottom-2 left-40 z-[120]
      w-[360px] h-[420px]
      bg-black dark:bg-slate-900 border border-slate-700 bg-slate-900">
      <EmojiPicker
        onEmojiClick={(emojiData) => onEmojiClick(emojiData.emoji)}
        theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
        autoFocusSearch={false}
        width={400}
        height={400}
        skinTonesDisabled
        searchPlaceholder="Search emoji..."
        previewConfig={{ showPreview: false }}
      />
    </div>
  );
}