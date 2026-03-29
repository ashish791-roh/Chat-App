
"use client";

import EmojiPicker, { Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";

export default function ChatEmojiPicker({ onEmojiClick }: { onEmojiClick: (emoji: string) => void }) {
  const { theme } = useTheme();

  return (
    <div className="absolute bottom-16 right-0 z-50 shadow-2xl border rounded-xl overflow-hidden">
      <EmojiPicker
        theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
        onEmojiClick={(emojiData) => onEmojiClick(emojiData.emoji)}
        lazyLoadEmojis={true}
      />
    </div>
  );
}