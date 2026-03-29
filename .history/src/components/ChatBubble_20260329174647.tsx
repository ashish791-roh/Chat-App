// src/components/ChatBubble.tsx
"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, CheckCheck, Reply } from "lucide-react";
import { Message } from "@/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ChatBubble({ 
  message, 
  onReply, 
  onReaction 
}: { 
  message: Message, 
  onReply: (msg: Message) => void,
  onReaction: (id: string, emoji: string) => void 
}) {
  const [formattedTime, setFormattedTime] = useState("");

  useEffect(() => {
    setFormattedTime(new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }, [message.timestamp]);

  if (message.isDeleted) {
    return (
      <div className={cn("flex w-full mb-2", message.isMe ? "justify-end" : "justify-start")}>
        <div className="italic text-gray-400 text-xs border border-gray-200 dark:border-slate-800 rounded-full px-4 py-1">
          This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group flex flex-col mb-6", message.isMe ? "items-end" : "items-start")}>
      
      {/* Reply Thread Header */}
      {message.replyTo && (
        <div className="text-[10px] bg-gray-200 dark:bg-slate-800 px-3 py-2 rounded-t-xl border-l-4 border-blue-500 opacity-70 mb-[-10px] max-w-[60%] truncate dark:text-gray-300">
          <span className="font-bold">{message.replyTo.senderName}</span>: {message.replyTo.text}
        </div>
      )}

      <div className={cn(
        "relative max-w-[80%] px-4 py-2 rounded-2xl shadow-sm transition-all",
        message.isMe 
          ? "bg-blue-600 text-white rounded-tr-none" 
          : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 rounded-tl-none border dark:border-slate-700"
      )}>
        {/* Markdown Text Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
        </div>

        <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
          <span className="text-[9px]">{formattedTime}</span>
          {message.isMe && (
            <span>
              {message.status === 'read' ? <CheckCheck size={12} className="text-cyan-300" /> : 
               message.status === 'delivered' ? <CheckCheck size={12} /> : <Check size={12} />}
            </span>
          )}
        </div>

        {/* Reactions Overlay */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="absolute -bottom-3 left-2 flex gap-1">
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <span key={emoji} className="bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-full px-1.5 py-0.5 text-[10px] shadow-md">
                {emoji} <span className="ml-0.5">{users.length > 1 && users.length}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hover Actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-3 mt-1 px-2">
        <button onClick={() => onReaction(message.id, "❤️")} className="text-sm hover:scale-125 transition">❤️</button>
        <button onClick={() => onReaction(message.id, "👍")} className="text-sm hover:scale-125 transition">👍</button>
        <button onClick={() => onReply(message)} className="text-gray-400 hover:text-blue-500 flex items-center gap-1 text-[10px]">
          <Reply size={12} /> Reply
        </button>
      </div>
    </div>
  );
}