"use client";

import { cn } from "@/lib/chatHelpers";
import { Check, CheckCheck } from "lucide-react";

export default function ChatBubble({ message, onReply, onActionMenu }: any) {
  const isMe = message.isMe;

  return (
    <div
      className={cn(
        "flex w-full mb-1 group transition-all duration-300",
        isMe ? "justify-end" : "justify-start"
      )}
      onContextMenu={(e) => {
        e.preventDefault();
        onActionMenu(message);
      }}
    >
      <div
        className={cn(
          "relative px-3 py-2 rounded-2xl max-w-[85%] md:max-w-[70%] shadow-sm",
          isMe
            ? "bg-[#005c4b] text-white rounded-tr-none"
            : "bg-[#202c33] text-[#e9edef] rounded-tl-none border border-white/5"
        )}
      >
        {/* Reply Preview */}
        {message.replyTo && (
          <div className="text-[11px] bg-black/20 border-l-4 border-emerald-500 rounded-lg p-2 mb-2 opacity-80 cursor-pointer">
            <span className="font-bold text-emerald-400 block truncate">
              {message.replyTo.senderName}
            </span>
            <p className="truncate italic">{message.replyTo.text}</p>
          </div>
        )}

        {/* Message Content */}
        <div className="flex flex-col gap-1">
          {message.text?.startsWith("http") && message.text?.includes("firebasestorage") ? (
            <img src={message.text} className="rounded-lg max-h-72 object-cover" alt="attachment" />
          ) : (
            <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words px-1">
              {message.text}
            </p>
          )}

          {/* Time & Ticks */}
          <div className="flex justify-end items-center gap-1 -mt-1 select-none">
            <span className="text-[10px] opacity-60 font-medium uppercase">
              {message.timestamp?.toDate?.().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
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

        {/* Reactions - Instagram Style Floating Pills */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className={cn(
            "absolute -bottom-3 flex gap-0.5",
            isMe ? "right-2 flex-row-reverse" : "left-2"
          )}>
            {Object.entries(message.reactions).map(([emoji, users]: any) => (
              <div
                key={emoji}
                className="flex items-center bg-[#374248] border border-white/10 rounded-full px-1.5 py-0.5 shadow-md scale-90 hover:scale-110 transition-transform cursor-pointer"
                title={users.length > 1 ? `${users.length} reactions` : ""}
              >
                <span className="text-xs">{emoji}</span>
                {users.length > 1 && <span className="text-[9px] ml-0.5 font-bold">{users.length}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}