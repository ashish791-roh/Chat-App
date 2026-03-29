// src/components/EmojiPicker.tsx
"use client";
import EmojiPicker, { Theme } from "emoji-picker-react";

export default function ChatEmojiPicker({ onEmojiClick, theme = "dark" }: { 
  onEmojiClick: (emoji: string) => void,
  theme?: "light" | "dark" 
}) {
  return (
    <div className="shadow-2xl rounded-2xl overflow-hidden border border-slate-700 bg-slate-900">
      <EmojiPicker
        onEmojiClick={(emojiData) => onEmojiClick(emojiData.emoji)}
        // This line forces the dark theme
        theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
        autoFocusSearch={false}
        width={300}
        height={400}
        skinTonesDisabled
        searchPlaceholder="Search emoji..."
        previewConfig={{ showPreview: false }} // Makes it more compact
      />
    </div>
  );
}