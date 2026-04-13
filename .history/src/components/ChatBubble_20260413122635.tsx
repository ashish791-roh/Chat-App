"use client";

import { cn } from "@/lib/chatHelpers";
import { Check, CheckCheck, FileText, Download, ExternalLink } from "lucide-react";

export default function ChatBubble({ message, onReply, onActionMenu }: any) {
  const isMe = message.isMe;

  // Guard against non-string text
  const text = typeof message.text === "string" ? message.text : "";
  const fileType: string = message.fileType || "";
  const fileName: string = message.fileName || "File";

  const hasUrl = text.startsWith("http");

  // ── Detect image ──────────────────────────────────────────────────────────
  // Firebase Storage URLs look like:
  //   https://firebasestorage.googleapis.com/v0/b/.../o/...%2Fphoto.jpg?alt=media&token=...
  // We check fileType first (set explicitly at upload time), then fall back to URL inspection.
  const isImage =
    fileType === "image" ||
    (fileType === "" &&
      hasUrl &&
      (() => {
        try {
          const decoded = decodeURIComponent(text);
          return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(decoded);
        } catch {
          return /\.(jpg|jpeg|png|webp|gif)/i.test(text);
        }
      })());

  // ── Detect PDF ────────────────────────────────────────────────────────────
  const isPdf =
    fileType === "pdf" ||
    (fileType === "" &&
      hasUrl &&
      (() => {
        try {
          const decoded = decodeURIComponent(text);
          return /\.pdf(\?|$)/i.test(decoded);
        } catch {
          return /\.pdf/i.test(text);
        }
      })());

  // ── Detect generic file (Word, Excel, zip, etc.) ──────────────────────────
  const isFile =
    fileType === "file" ||
    (fileType === "" &&
      hasUrl &&
      !isImage &&
      !isPdf &&
      (() => {
        try {
          const decoded = decodeURIComponent(text);
          return /\.(docx?|xlsx?|pptx?|zip|rar|txt|csv)(\?|$)/i.test(decoded);
        } catch {
          return false;
        }
      })());

  return (
    <div
      className={cn("flex w-full mb-1 group", isMe ? "justify-end" : "justify-start")}
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
        <div className="flex flex-col gap-1">

          {/* ── IMAGE ── */}
          {isImage && hasUrl ? (
            /*
             * Use a real <a> tag with target="_blank" instead of window.open().
             * window.open() can be silently blocked by popup-blockers in some
             * browsers / OS combinations, especially when the call happens
             * inside an async handler or is triggered programmatically.
             * A native anchor tag with target="_blank" is NEVER blocked.
             */
            <a
              href={text}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block cursor-pointer mt-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={text}
                className="rounded-lg max-h-72 w-full object-cover border border-white/10"
                alt={fileName}
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 right-2 bg-black/40 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink size={16} className="text-white" />
              </div>
            </a>

          ) : isPdf && hasUrl ? (
            /* ── PDF ── */
            <a
              href={text}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-black/30 p-3 rounded-xl border border-white/5 cursor-pointer hover:bg-black/50 transition-colors mt-1 no-underline"
            >
              <div className="bg-red-500/20 p-2 rounded-lg">
                <FileText size={24} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">{fileName}</p>
                <p className="text-[10px] opacity-60 text-gray-300">PDF Document · tap to open</p>
              </div>
              <Download size={18} className="text-emerald-400 shrink-0" />
            </a>

          ) : isFile && hasUrl ? (
            /* ── GENERIC FILE (Word, Excel, etc.) ── */
            <a
              href={text}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-black/30 p-3 rounded-xl border border-white/5 cursor-pointer hover:bg-black/50 transition-colors mt-1 no-underline"
            >
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <FileText size={24} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">{fileName}</p>
                <p className="text-[10px] opacity-60 text-gray-300">File · tap to open</p>
              </div>
              <Download size={18} className="text-emerald-400 shrink-0" />
            </a>

          ) : (
            /* ── TEXT FALLBACK ── */
            <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words px-1">
              {text || (message.fileType ? "📎 Media is processing..." : "")}
            </p>
          )}

          {/* ── TIME & STATUS ── */}
          <div className="flex justify-end items-center gap-1 mt-1 select-none">
            <span className="text-[10px] opacity-60 font-medium uppercase">
              {message.timestamp
                ? new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
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