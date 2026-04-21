"use client";

import { useState } from "react";
import { cn } from "@/lib/chatHelpers";
import { X, Download, Reply, Heart, Star, Phone, Video, PhoneMissed } from "lucide-react";

export default function ChatBubble({
  message,
  onReply,
  onActionMenu,
  onReact,
}: any) {
  const isMe = message.isMe;
  const [showImageModal, setShowImageModal] = useState(false);
  const [showHeartPop, setShowHeartPop] = useState(false);

  const handleDoubleClick = () => {
    if (onReact) {
      onReact(message.id, "❤️");
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 800);
    }
  };

  let isImage = false;
  let isAudio = false;
  let isPdfOrFile = false;
  let fileName = "Document";
  let contentText = typeof message.text === "string" ? message.text : "";

  if (contentText.startsWith("FILE::")) {
    const parts = contentText.split("::");
    if (parts.length >= 3) {
      fileName = parts[1] || "Attachment";
      contentText = parts.slice(2).join("::");
    }
  }

  if (
    contentText.startsWith("data:image/") ||
    contentText.startsWith("blob:") ||
    (contentText.startsWith("http") && !contentText.includes(" "))
  ) {
    isImage = true;
  } else if (contentText.startsWith("data:audio/")) {
    isAudio = true;
  } else if (contentText.startsWith("data:")) {
    isPdfOrFile = true;
  }

  if (message.fileType === "image") isImage = true;
  if (message.fileType === "pdf" || message.fileType === "file") isPdfOrFile = true;
  if (message.fileName && fileName === "Document") fileName = message.fileName;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contentText.startsWith("data:") || contentText.startsWith("blob:")) {
      const a = document.createElement("a");
      a.href = contentText;
      a.download = isImage ? fileName || "image.png" : fileName;
      a.click();
    } else {
      window.open(contentText, "_blank");
    }
  };

  return (
    <>
      {/* Row: justify-end for sent, justify-start for received */}
      <div
        className={cn(
          "flex w-full mb-1 group",
          isMe ? "justify-end" : "justify-start"
        )}
        onContextMenu={(e) => {
          e.preventDefault();
          onActionMenu({ message, x: e.clientX, y: e.clientY });
        }}
      >
        {/* Reply icon on opposite side */}
        <div
          className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity self-center flex items-center justify-center cursor-pointer p-1.5 rounded-full hover:bg-white/10 active:scale-90 shrink-0",
            isMe ? "order-first mr-1" : "order-last ml-1"
          )}
          onClick={() => onReply && onReply(message)}
        >
          <Reply size={14} className="text-gray-400 hover:text-white" />
        </div>

        {/* Enhanced Bubble */}
        <div
          onDoubleClick={handleDoubleClick}
          className={cn(
            "relative shadow-lg transition-all duration-200 hover:shadow-xl",
            "max-w-[85%] sm:max-w-[70%]",
            !isImage && !message.isDeleted ? "hover:scale-[1.02] hover:-translate-y-0.5" : "",
            isImage && !message.isDeleted ? "p-1.5" : "px-4 py-3 text-sm leading-relaxed",
            message.isDeleted
              ? "bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-dashed border-white/20 text-white/40 italic rounded-3xl backdrop-blur-sm"
              : isMe
              ? "bg-gradient-to-br from-violet-500 to-cyan-500 text-white rounded-3xl rounded-br-md shadow-violet-500/25"
              : "bg-gradient-to-br from-slate-700/80 to-slate-800/80 text-white border border-white/10 rounded-3xl rounded-bl-md backdrop-blur-sm"
          )}
        >
          {showHeartPop && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none animate-in zoom-in spin-in-12 duration-300">
              <Heart size={isImage ? 80 : 48} className="text-red-500 drop-shadow-2xl fill-red-500 opacity-90" />
            </div>
          )}

          {/* Reply Preview */}
          {message.replyTo && (
            <div
              className={cn(
                "text-xs opacity-70 border-l-2 pl-2 mb-2 rounded-sm py-1 pr-1",
                isMe ? "border-white/60 bg-white/10" : "border-violet-400/60 bg-white/5",
                isImage ? "mx-2 mt-1" : ""
              )}
            >
              <span className="font-semibold block">{message.replyTo.senderName}</span>
              <p className="truncate opacity-80">{message.replyTo.text}</p>
            </div>
          )}

          {/* Content */}
          {message.isDeleted ? (
            <div className="flex items-center gap-2 opacity-70 text-xs">
              🚫 <span>This message was deleted</span>
            </div>
          ) : isImage ? (
            <div className="relative group cursor-pointer flex" onClick={() => setShowImageModal(true)}>
              <img
                src={contentText}
                className="rounded-[14px] max-h-[280px] w-auto object-cover"
                alt={fileName}
              />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[14px]" />
            </div>
          ) : isAudio ? (
            <div className="flex items-center gap-2 pr-2 py-1">
              <audio controls src={contentText} className="h-9 w-48 sm:w-56 opacity-90 scale-95 origin-left" />
            </div>
          ) : isPdfOrFile ? (
            <div className="flex items-center gap-2 p-1">
              <span className="text-xl">📄</span>
              <a
                href={contentText}
                download={fileName}
                target={contentText.startsWith("data:") || contentText.startsWith("blob:") ? "_self" : "_blank"}
                rel="noopener noreferrer"
                className="font-medium underline hover:opacity-80 break-all"
              >
                {fileName}
              </a>
            </div>
          ) : message.gift ? (
            <div className="flex flex-col items-center p-2 min-w-[100px]">
              <span className="text-5xl animate-bounce mb-2 drop-shadow-lg">{message.gift.emoji}</span>
              <span className="font-bold text-sm bg-black/20 px-3 py-1 rounded-full text-white backdrop-blur-sm shadow-inner cursor-default">
                {message.gift.label}
              </span>
              <span className="text-[10px] font-bold text-pink-200 mt-2 tracking-widest uppercase">Gift</span>
            </div>
          ) : message.coinTransfer ? (
            <div className="flex flex-col items-center p-2 min-w-[100px]">
              <div className="relative">
                <span className="text-5xl drop-shadow-xl animate-pulse">🪙</span>
                <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-20 rounded-full" />
              </div>
              <span className="font-extrabold text-lg mt-2 bg-yellow-900/40 border border-yellow-500/50 px-3 py-1 rounded-full text-yellow-300 backdrop-blur-sm shadow-inner cursor-default">
                {message.coinTransfer.amount} Coins
              </span>
            </div>
          ) : message.callLog ? (
            <div className="flex items-center gap-3 p-1 pr-4 min-w-[180px]">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  message.callLog.status === "completed"
                    ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                    : "bg-red-500/20 text-red-200 border border-red-500/30"
                }`}
              >
                {message.callLog.status === "completed" ? (
                  message.callLog.isVideo ? <Video size={16} /> : <Phone size={16} />
                ) : (
                  <PhoneMissed size={16} />
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">{message.callLog.isVideo ? "Video Call" : "Voice Call"}</span>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider mt-0.5 ${
                    message.callLog.status === "completed" ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {message.callLog.status === "completed"
                    ? message.callLog.duration > 59
                      ? `${Math.floor(message.callLog.duration / 60)}m ${message.callLog.duration % 60}s`
                      : `${message.callLog.duration}s`
                    : message.callLog.status}
                </span>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{contentText}</p>
          )}

          {/* Footer */}
          <div
            className={cn(
              "flex justify-end items-center gap-1 mt-1",
              isImage && !message.isDeleted
                ? "absolute bottom-2.5 right-2.5 bg-black/50 px-2 py-0.5 rounded-full text-white backdrop-blur-sm"
                : ""
            )}
          >
            {(message.starredBy?.length ?? 0) > 0 && !message.isDeleted && (
              <Star size={9} className="text-yellow-400 fill-yellow-400 mr-0.5" />
            )}
            {message.isEdited && !message.isDeleted && (
              <span className="text-[9px] opacity-60 mr-1 italic">edited</span>
            )}
            <span className={cn("text-[10px]", isImage && !message.isDeleted ? "opacity-100 font-medium" : "opacity-60")}>
              {(message.timestamp?.toDate ? message.timestamp.toDate() : new Date()).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {isMe && !message.isDeleted && (
              <span className={cn("text-[11px]", message.status === "seen" ? "text-cyan-400" : "opacity-60")}>
                {message.status === "sent" && "✓"}
                {message.status === "delivered" && "✓✓"}
                {message.status === "seen" && "✓✓"}
              </span>
            )}
          </div>

          {/* Reactions */}
          {message.reactions && (
            <div className={cn("flex gap-1 flex-wrap", isImage ? "absolute bottom-2.5 left-2.5" : "mt-1.5")}>
              {Object.entries(message.reactions).map(([emoji, users]: any) => (
                <span key={emoji} className="text-xs bg-black/30 px-2 py-[2px] rounded-full backdrop-blur-sm text-white border border-white/10">
                  {emoji} {users.length}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {showImageModal && isImage && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex flex-col pointer-events-auto">
          <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex flex-col">
              <span className="text-white font-medium text-lg">{message.senderName}</span>
              <span className="text-white/70 text-sm">{message.timestamp?.toDate?.().toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleDownload} className="text-white opacity-80 hover:opacity-100 hover:bg-white/10 transition-all p-2.5 rounded-full">
                <Download size={22} />
              </button>
              <button onClick={() => setShowImageModal(false)} className="text-white opacity-80 hover:opacity-100 hover:bg-white/10 transition-all p-2.5 rounded-full">
                <X size={22} />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden" onClick={() => setShowImageModal(false)}>
            <img
              src={contentText}
              className="max-w-full max-h-full object-contain cursor-default select-none shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              alt="Expanded view"
            />
          </div>
        </div>
      )}
    </>
  );
}