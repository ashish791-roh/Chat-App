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
  
  // Simple check: If it starts with http, treat it as a GIF/Image
  const isImage = message.text.startsWith("http");

  useEffect(() => {
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
          "max-w-[70%] px-3 py-2 rounded-2xl text-sm shadow-sm transition-colors",
          message.isMe
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-100 rounded-bl-none",
          isImage && "bg-transparent shadow-none p-0" // GIFs don't need a bubble background
        )}
      >
        {isImage ? (
          <img 
            src={message.text} 
            alt="GIF" 
            className="rounded-lg max-h-60 w-auto border dark:border-slate-700 shadow-md" 
          />
        ) : (
          <p className="px-1">{message.text}</p>
        )}
        
        <span
          className={cn(
            "text-[10px] block mt-1 opacity-70 px-1",
            message.isMe ? "text-right" : "text-left",
            isImage && "text-gray-500 dark:text-gray-400"
          )}
        >
          {formattedTime}
        </span>
      </div>
    </div>
  );
}