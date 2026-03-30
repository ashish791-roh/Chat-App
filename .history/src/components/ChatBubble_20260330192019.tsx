"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, CheckCheck, Reply, Trash2, File } from "lucide-react";
import { Message } from "@/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** * Utility for clean Tailwind classes */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ChatBubble({ 
  message, 
  onReply, 
  onActionMenu,
  onPreview 
}: { 
  message: Message, 
  onReply: (msg: Message) => void,
  onActionMenu: (msg: Message) => void,
  onPreview: (url: string) => void 
}) {
  const [formattedTime, setFormattedTime] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // LOGIC: Check if the message is a Giphy/Image/Blob URL
  const isMedia = 
    message.text.startsWith("blob:") || 
    message.text.startsWith("data:image") ||
    message.text.includes("giphy.com") || 
    message.text.match(/\.(jpeg|jpg|gif|png|webp|svg|heic)/i) != null ||
    message.type === 'image';

  useEffect(() => {
    // Only format time on client to avoid hydration mismatch
    setFormattedTime(
      new Date(message.timestamp).toLocaleTimeString([], { 
        hour: "2-digit", 
        minute: "2-digit" 
      })
    );
  }, [message.timestamp]);

  // LONG PRESS DETECTION
  const startPress = () => {
    timerRef.current = setTimeout(() => {
      onActionMenu(message);
    }, 500);
  };

  const endPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  if (message.isDeletedForMe) return null;

  if (message.isDeleted) {
    return (
      <div className={cn("flex w-full mb-4", message.isMe ? "justify-end" : "justify-start")}>
        <div className="italic text-gray-400 dark:text-gray-500 text-[11px] border border-gray-200 dark:border-slate-800 rounded-2xl px-4 py-2 bg-gray-50/50 dark:bg-slate-900/30 flex items-center gap-2">
          <Trash2 size={12} /> This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn("group flex flex-col mb-4", message.isMe ? "items-end" : "items-start")}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
    >
      {/* Reply Context Header */}
      {message.replyTo && (
        <div className="text-[10px] bg-gray-200 dark:bg-slate-800 px-3 py-2 rounded-t-xl border-l-4 border-blue-500 opacity-70 mb-[-10px] max-w-[60%] truncate dark:text-gray-300">
          <span className="font-bold">{message.replyTo.senderName}</span>: {message.replyTo.text}
        </div>
      )}

      {/* Main Message Bubble */}
      <div className={cn(
        "relative max-w-[80%] rounded-2xl shadow-sm cursor-pointer select-none transition-transform active:scale-95",
        message.isMe 
          ? "bg-blue-600 text-white rounded-tr-none" 
          : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 rounded-tl-none border dark:border-slate-700",
        isMedia && "bg-transparent border-none shadow-none p-0 overflow-hidden"
      )}>
        
        {isMedia ? (
          // RENDER GIF/IMAGE
          <div className="relative rounded-xl border dark:border-slate-700 overflow-hidden bg-gray-200 dark:bg-slate-800 min-w-[150px] min-h-[100px]">
            <img 
              src={message.text} 
              alt="Sent media" 
              className="max-h-72 w-full object-contain"
              loading="lazy"
              onClick={() => onPreview(message.text)} // Trigger preview modal
            />
            <div className="absolute bottom-1 right-1 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-lg flex items-center gap-1 text-white">
              <span className="text-[9px]">{formattedTime}</span>
              {message.isMe && (
                 <CheckCheck size={10} className={message.status === 'read' ? "text-cyan-400" : "text-gray-300"} />
              )}
            </div>
          </div>
        ) : (
          // RENDER TEXT / DOCUMENTS
          <div className="px-4 py-2 prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed">
            {message.text.startsWith("📄") ? (
              <div 
                onClick={() => onPreview(message.text.replace("📄 ", ""))} 
                
                window.open(fileUrl, "_blank", "noopener,noreferrer")// Trigger preview for documents
                className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 hover:border-blue-500 transition-all cursor-pointer group"
              >
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <File size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{message.text.replace("📄 ", "")}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">View Document</p>
                </div>
              </div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
            )}
            
            <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
              <span className="text-[9px]">{formattedTime}</span>
              {message.isMe && (
                <span>
                  {message.status === 'read' ? (
                    <CheckCheck size={12} className="text-cyan-300" />
                  ) : (
                    <Check size={12} />
                  )}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Reactions Overlay */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className={cn(
            "absolute -bottom-3 flex gap-1 z-10",
            message.isMe ? "right-2" : "left-2"
          )}>
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <span key={emoji} className="bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-full px-1.5 py-0.5 text-[10px] shadow-md animate-in zoom-in duration-200">
                {emoji} <span className="ml-0.5 font-medium">{users.length > 1 && users.length}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}