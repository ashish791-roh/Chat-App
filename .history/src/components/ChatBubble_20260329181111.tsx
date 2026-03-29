"use client";
import { useEffect, useState, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, CheckCheck, Reply } from "lucide-react";
import { Message } from "@/types";

export default function ChatBubble({ 
  message, onReply, onActionMenu 
}: { 
  message: Message, 
  onReply: (msg: Message) => void,
  onActionMenu: (msg: Message) => void 
}) {
  const [formattedTime, setFormattedTime] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setFormattedTime(new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }, [message.timestamp]);

  // LONG PRESS DETECTION
  const startPress = () => {
    timerRef.current = setTimeout(() => {
      onActionMenu(message);
    }, 500); // 500ms hold
  };

  const endPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  if (message.isDeletedForMe) return null;

  if (message.isDeleted) {
    return (
      <div className={`flex w-full mb-4 ${message.isMe ? "justify-end" : "justify-start"}`}>
        <div className="italic text-gray-400 text-[11px] border border-gray-100 dark:border-slate-800 rounded-2xl px-4 py-2 bg-gray-50/30 dark:bg-slate-900/20">
          This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group flex flex-col mb-4 ${message.isMe ? "items-end" : "items-start"}`}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
    >
      {message.replyTo && (
        <div className="text-[10px] bg-gray-200 dark:bg-slate-800 px-3 py-2 rounded-t-xl border-l-4 border-blue-500 opacity-70 mb-[-10px] max-w-[60%] truncate">
          <span className="font-bold">{message.replyTo.senderName}</span>: {message.replyTo.text}
        </div>
      )}

      <div className={`relative max-w-[80%] px-4 py-2 rounded-2xl shadow-sm cursor-pointer select-none transition-transform active:scale-95 ${
        message.isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 rounded-tl-none border dark:border-slate-700"
      }`}>
        <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed">
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

        {/* Reaction Display */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="absolute -bottom-3 left-2 flex gap-1 z-10">
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <span key={emoji} className="bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-full px-1.5 py-0.5 text-[10px] shadow-md animate-in zoom-in">
                {emoji} <span className="ml-0.5">{users.length > 1 && users.length}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}