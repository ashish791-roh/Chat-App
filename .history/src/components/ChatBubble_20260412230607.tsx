"use client";

import { cn } from "@/lib/chatHelpers";
import { Check, CheckCheck, FileText, Download, ExternalLink } from "lucide-react";

export default function ChatBubble({ message, onReply, onActionMenu }: any) {
  const isMe = message.isMe;
  
  // Safe extraction of properties
  const text = typeof message.text === 'string' ? message.text : "";
  const fileType = message.fileType || "";
  const fileName = message.fileName || "File";

  // Detection logic
  const isImage = fileType === "image" || text.match(/\.(jpeg|jpg|gif|png|webp)/i);
  const isPdf = fileType === "pdf" || text.toLowerCase().includes(".pdf");

  return (
    <div className={cn("flex w-full mb-1 group", isMe ? "justify-end" : "justify-start")}
      onContextMenu={(e) => { e.preventDefault(); onActionMenu(message); }}>
      
      <div className={cn(
        "relative px-3 py-2 rounded-2xl max-w-[85%] md:max-w-[70%] shadow-sm",
        isMe ? "bg-[#005c4b] text-white rounded-tr-none" : "bg-[#202c33] text-[#e9edef] rounded-tl-none border border-white/5"
      )}>
        
        <div className="flex flex-col gap-1">
          {isImage && text ? (
            <div className="relative group/img cursor-pointer mt-1" onClick={() => window.open(text, '_blank')}>
              <img src={text} className="rounded-lg max-h-72 w-full object-cover border border-white/10" alt="Shared Media" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                <ExternalLink size={20} className="text-white" />
              </div>
            </div>
          ) : isPdf && text ? (
            <div className="flex items-center gap-3 bg-black/30 p-3 rounded-xl border border-white/5 cursor-pointer hover:bg-black/50 transition-colors mt-1"
                 onClick={() => window.open(text, '_blank')}>
              <div className="bg-red-500/20 p-2 rounded-lg">
                <FileText size={24} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">{fileName}</p>
                <p className="text-[10px] opacity-60 text-gray-300">PDF Document</p>
              </div>
              <Download size={18} className="text-emerald-400 shrink-0" />
            </div>
          ) : (
            <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words px-1">
              {text || "Media unavailable"}
            </p>
          )}

          <div className="flex justify-end items-center gap-1 mt-1 select-none">
            <span className="text-[10px] opacity-60 font-medium">
              {message.timestamp?.toDate?.().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) || ""}
            </span>
            {isMe && (
              <span className="flex items-center ml-1">
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