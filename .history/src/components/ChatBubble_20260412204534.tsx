"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, CheckCheck, Trash2, File, Clock } from "lucide-react";
import { Message } from "@/types";

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** WhatsApp-style status ticks */
function MessageStatus({ status }: { status: Message["status"] }) {
  if (status === "sending") return <Clock size={11} style={{ color: "rgba(255,255,255,0.45)" }} />;
  if (status === "sent")     return <Check size={12} style={{ color: "rgba(255,255,255,0.45)" }} />;
  if (status === "delivered") return <CheckCheck size={12} style={{ color: "rgba(255,255,255,0.55)" }} />;
  // read — cyan
  return <CheckCheck size={12} style={{ color: "#00d4ff" }} />;
}

export default function ChatBubble({
  message,
  onReply,
  onActionMenu,
}: {
  message: Message;
  onReply: (msg: Message) => void;
  onActionMenu: (msg: Message) => void;
}) {
  const [formattedTime, setFormattedTime] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isMedia =
    message.text.startsWith("blob:") ||
    message.text.startsWith("data:image") ||
    message.text.includes("giphy.com") ||
    message.text.match(/\.(jpeg|jpg|gif|png|webp|svg|heic)/i) != null ||
    (message as any).type === "image";

  useEffect(() => {
    setFormattedTime(
      new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }, [message.timestamp]);

  const startPress = () => { timerRef.current = setTimeout(() => onActionMenu(message), 500); };
  const endPress   = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  if ((message as any).isDeletedForMe) return null;

  if (message.isDeleted) {
    return (
      <div className={cn("flex w-full mb-3", message.isMe ? "justify-end" : "justify-start")}>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl text-[11px] italic"
          style={{ color: "var(--text-muted)", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <Trash2 size={11} /> This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("group flex flex-col mb-3", message.isMe ? "items-end" : "items-start")}
      onMouseDown={startPress} onMouseUp={endPress}
      onTouchStart={startPress} onTouchEnd={endPress}
    >
      {/* Reply preview */}
      {message.replyTo && (
        <div
          className="text-[10px] px-3 py-1.5 rounded-xl mb-[-8px] max-w-[65%] truncate"
          style={{
            background: "var(--bg-elevated)",
            borderLeft: "3px solid var(--accent-1)",
            color: "var(--text-secondary)",
          }}
        >
          <span className="font-bold" style={{ color: "var(--accent-2)" }}>{message.replyTo.senderName}</span>
          {": "}
          {message.replyTo.text}
        </div>
      )}

      {/* Bubble */}
      <div
        className={cn(
          "relative max-w-[75%] cursor-pointer select-none transition-transform active:scale-[0.98]",
          isMedia
            ? "rounded-xl overflow-hidden"
            : message.isMe
            ? "bubble-sent px-4 py-2.5"
            : "bubble-recv px-4 py-2.5"
        )}
      >
        {isMedia ? (
          /* ── Media ── */
          <div className="relative min-w-[160px] min-h-[100px]"
            style={{ background: "var(--bg-elevated)", borderRadius: 16 }}>
            <img
              src={message.text}
              alt="Media"
              className="max-h-72 w-full object-contain rounded-2xl"
              loading="lazy"
              onClick={() => window.open(message.text, "_blank", "noopener,noreferrer")}
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}>
              <span className="text-[9px] text-white">{formattedTime}</span>
              {message.isMe && <MessageStatus status={message.status} />}
            </div>
          </div>
        ) : message.text.startsWith("📄") ? (
          /* ── File ── */
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => window.open(message.text.replace("📄 ", ""), "_blank", "noopener,noreferrer")}
            style={{ minWidth: 200 }}
          >
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(108,99,255,0.25)" }}>
              <File size={18} style={{ color: "var(--accent-2)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{message.text.replace("📄 ", "")}</p>
              <p className="text-[10px] opacity-60 uppercase tracking-wide font-bold mt-0.5">Open file</p>
            </div>
          </div>
        ) : (
          /* ── Text ── */
          <div>
            <div
              className="prose prose-sm max-w-none break-words leading-relaxed"
              style={{
                color: message.isMe ? "rgba(255,255,255,0.95)" : "var(--text-primary)",
                fontSize: 13.5,
                fontFamily: "var(--font-body)",
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
            </div>
            {/* Time + ticks */}
            <div className="flex items-center justify-end gap-1 mt-1" style={{ opacity: 0.65 }}>
              <span style={{ fontSize: 10 }}>{formattedTime}</span>
              {message.isMe && <MessageStatus status={message.status} />}
            </div>
          </div>
        )}

        {/* Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className={cn("absolute -bottom-3.5 flex gap-1 z-10", message.isMe ? "right-2" : "left-2")}>
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <span key={emoji}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] shadow-lg"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                {emoji}
                {users.length > 1 && (
                  <span className="font-semibold" style={{ color: "var(--text-muted)", fontSize: 9 }}>
                    {users.length}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}