"use client";
import { useEffect, useState, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, CheckCheck, Reply, Trash2, MoreHorizontal } from "lucide-react";
import { Message } from "@/types";

export default function ChatBubble({ 
  message, onReply, onReaction, onDeleteOptions 
}: { 
  message: Message, 
  onReply: (msg: Message) => void,
  onReaction: (id: string, emoji: string) => void,
  onDeleteOptions: (msg: Message) => void // Trigger the popup
}) {
  const [formattedTime, setFormattedTime] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setFormattedTime(new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }, [message.timestamp]);

  // LONG PRESS LOGIC
  const handleTouchStart = () => {
    timerRef.current = setTimeout(() => {
      onDeleteOptions(message);
    }, 600); // 600ms hold triggers the menu
  };

  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  if (message.isDeletedForMe) return null; // Completely hide if deleted for me

  if (message.isDeleted) {
    return (
      <div className="flex w-full mb-4 justify-center md:justify-start">
        <div className="italic text-gray-400 text-[11px] border border-gray-100 dark:border-slate-800 rounded-2xl px-4 py-2 bg-gray-50/30 dark:bg-slate-900/20">
          This message was deleted for everyone
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group flex flex-col mb-4 ${message.isMe ? "items-end" : "items-start"}`}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Reply UI */}
      {message.replyTo && (
        <div className="text-[10px] bg-gray-200 dark:bg-slate-800 px-3 py-2 rounded-t-xl border-l-4 border-blue-500 opacity-70 mb-[-10px] max-w-[60%] truncate">
          <span className="font-bold">{message.replyTo.senderName}</span>: {message.replyTo.text}
        </div>
      )}

      <div className={`relative max-w-[80%] px-4 py-2 rounded-2xl shadow-sm cursor-pointer select-none ${
        message.isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 rounded-tl-none border dark:border-slate-700"
      }`}>
        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
        </div>

        <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
          <span className="text-[9px]">{formattedTime}</span>
          {message.isMe && (
            <span>
              {message.status === 'read' ? <CheckCheck size={12} className="text-cyan-300" /> : <Check size={12} />}
            </span>
          )}
        </div>
      </div>

      {/* Desktop Hover Actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-3 mt-1 px-2">
        <button onClick={() => onDeleteOptions(message)} className="text-gray-400 hover:text-red-500 transition-colors">
          <MoreHorizontal size={14} />
        </button>
        <button onClick={() => onReply(message)} className="text-gray-400 hover:text-blue-500 text-[10px]">Reply</button>
      </div>
    </div>
  );
}