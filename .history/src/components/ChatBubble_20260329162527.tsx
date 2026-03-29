// src/components/ChatBubble.tsx
"use client";

import { useEffect, useState } from "react";
import { Message } from "@/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ChatBubble({ message }: { message: Message }) {
  const [formattedTime, setFormattedTime] = useState<string>("");

  useEffect(() => {
    // Only format time on the client to avoid hydration mismatch
    setFormattedTime(
      new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [message.timestamp]);

  return (
    <div className={cn("flex w-full mb-4", message.isMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow-sm transition-colors",
          message.isMe
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-100 rounded-bl-none"
        )}
      >
        <p>{message.text}</p>
        <span
          className={cn(
            "text-[10px] block mt-1 opacity-70",
            message.isMe ? "text-right" : "text-left"
          )}
        >
          {formattedTime}
        </span>
      </div>
    </div>
  );
}