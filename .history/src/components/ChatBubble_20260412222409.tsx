"use client";

import { cn } from "@/lib/chatHelpers";
import { Check, CheckCheck, FileText, Download, ExternalLink } from "lucide-react";

export default function ChatBubble({ message, onReply, onActionMenu }: any) {
  const isMe = message.isMe;
  
  // Improved detection logic
  const text = message.text || "";
  const isImage = text.includes("firebasestorage") && text.match(/\.(jpeg|jpg|gif|png|webp|alt)/i) || text.startsWith("blob:");
  const isPdf = text.includes(".pdf") || text.includes("📄");

  // Helper to get clean URL without the "📄 " prefix
  const getCleanUrl = (rawText: string) => {
    return rawText.replace("📄 ", "").trim();
  };

  return (
    <div className={cn("flex w-full mb-1 group", isMe ? "justify-end" : "justify-start")}
      onContextMenu={(e) => { e.preventDefault(); onActionMenu(message); }}>
      
      <div className={cn(
        "relative px-3 py-2 rounded-2xl max-w-[85%] md:max-w-[70%] shadow-sm",
        isMe ? "bg-[#005c4b] text-white rounded-tr-none" : "bg-[#202c33] text-[#e9edef] rounded-tl-none border border-white/5"
      )}>
        
        {message.replyTo && (
          <div className="text-[11px] bg-black/20 border-l-4 border-emerald-500 rounded-lg p-2 mb-2 opacity-80">
            <span className="font-bold text-emerald-400 block truncate">{message.replyTo.senderName}</span>
            <p className="truncate italic">{message.replyTo.text}</p>
          </div>
        )}

        <div className="flex flex-col gap-1">
          {isImage ? (
            <div className="relative group/img cursor-pointer" onClick={() => window.open(getCleanUrl(text), '_blank')}>
              <img src={getCleanUrl(text)} className="rounded-lg max-h-72 w-full object-cover border border-white/10" alt="Shared Image" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                <ExternalLink size={20} className="text-white" />
              </div>
            </div>
          ) : isPdf ? (
            <div className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5 cursor-pointer hover:bg-black/30 transition-colors"
                 onClick={() => window.open(getCleanUrl(text), '_blank')}>
              <div className="bg-red-500/20 p-2 rounded-lg">
                <FileText size={24} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Document.pdf</p>
                <p className="text-[10px] opacity-60">Click to view document</p>
              </div>
              <Download size={18} className="text-emerald-400 shrink-0" />
            </div>
          ) : (
            <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words px-1">{text}</p>
          )}

          <div className="flex justify-end items-center gap-1 -mt-1 select-none">
            <span className="text-[10px] opacity-60 font-medium uppercase">
              {message.timestamp?.toDate?.().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {isMe && (
              <span className="flex items-center">
                {message.status === "sent" && <Check size={13} className="text-gray-400" />}
                {message.status === "delivered" && <CheckCheck size={13} className="text-gray-400" />}
                {message.status === "seen" && <CheckCheck size={13} className="text-sky-400" />}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}