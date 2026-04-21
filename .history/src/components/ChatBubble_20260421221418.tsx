"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/chatHelpers";
import { X, Download, Reply, Heart, Star, Phone, Video, PhoneMissed, FileText, File as FileIcon, Music, Play, Pause, MapPin, User, Clock } from "lucide-react";

export default function ChatBubble({
  message,
  onReply,
  onActionMenu,
  onReact,
}: any) {
  const isMe = message.isMe;
  const [showImageModal, setShowImageModal] = useState(false);
  const [showHeartPop,   setShowHeartPop]   = useState(false);
  const [imgError,       setImgError]       = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleDoubleClick = () => {
    if (onReact) {
      onReact(message.id, "❤️");
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 800);
    }
  };

  // ── Parse message content ─────────────────────────────────────────────────
  let isImage     = false;
  let isAudio     = false;
  let isFile      = false;   // PDF / doc / generic file
  let fileName    = "Attachment";
  let fileExt     = "";
  let contentText = typeof message.text === "string" ? message.text : "";

  if (contentText.startsWith("IMG::")) {
    // Explicit image prefix (new uploads)
    isImage     = true;
    contentText = contentText.slice(5);

  } else if (contentText.startsWith("FILE::")) {
    // FILE::<name>::<url-or-base64>
    const parts = contentText.split("::");
    if (parts.length >= 3) {
      fileName    = parts[1] || "Attachment";
      contentText = parts.slice(2).join("::");
    }
    fileExt = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (fileName === "Audio Note") {
      isAudio = true;
    } else {
      isFile = true;
    }

  } else if (
    // Legacy: bare Firebase Storage image URL (old messages before IMG:: prefix)
    contentText.startsWith("https://firebasestorage.googleapis.com") ||
    contentText.startsWith("https://storage.googleapis.com")
  ) {
    // Heuristic: check for common image extensions in the path
    const pathPart = contentText.split("?")[0].toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)/.test(pathPart)) {
      isImage = true;
    } else if (/\.(mp3|ogg|wav|webm|aac|m4a)/.test(pathPart)) {
      isAudio = true;
    } else {
      isFile    = true;
      // Try to extract filename from URL
      const decoded = decodeURIComponent(pathPart.split("/").pop() ?? "");
      fileName = decoded.replace(/^\d+_/, "") || "Attachment"; // strip timestamp prefix
      fileExt  = fileName.split(".").pop()?.toLowerCase() ?? "";
    }

  } else if (contentText.startsWith("data:image/")) {
    isImage = true;
  } else if (contentText.startsWith("data:audio/")) {
    isAudio = true;
  } else if (contentText.startsWith("data:")) {
    isFile = true;
  }

  // Explicit fileType override from message metadata (legacy support)
  if (message.fileType === "image")                               isImage = true;
  if (message.fileType === "pdf" || message.fileType === "file") isFile  = true;
  if (message.fileName && fileName === "Attachment")             fileName = message.fileName;

  // ── File icon helper ──────────────────────────────────────────────────────
  const getFileIcon = () => {
    if (["pdf"].includes(fileExt))                              return <FileText size={28} className="text-red-400" />;
    if (["doc","docx"].includes(fileExt))                       return <FileText size={28} className="text-blue-400" />;
    if (["xls","xlsx","csv"].includes(fileExt))                 return <FileText size={28} className="text-green-400" />;
    if (["mp3","ogg","wav","aac","m4a","webm"].includes(fileExt)) return <Music  size={28} className="text-purple-400" />;
    return <FileIcon size={28} className="text-gray-300" />;
  };

  const fileSizeLabel = message.fileSize
    ? message.fileSize > 1_000_000
      ? `${(message.fileSize / 1_000_000).toFixed(1)} MB`
      : `${(message.fileSize / 1_000).toFixed(0)} KB`
    : null;

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a    = document.createElement("a");
    a.href     = contentText;
    a.download = fileName;
    a.target   = "_blank";
    a.rel      = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── Bubble style ──────────────────────────────────────────────────────────
  const bubbleBase = cn(
    "relative shadow-lg transition-all duration-200 hover:shadow-xl",
    "max-w-[85%] sm:max-w-[70%]",
    message.isDeleted
      ? "bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-dashed border-white/20 text-white/40 italic rounded-3xl backdrop-blur-sm px-4 py-3 text-sm"
      : isMe
      ? "bg-gradient-to-br from-violet-500 to-cyan-500 text-white rounded-3xl rounded-br-md shadow-violet-500/25"
      : "bg-gradient-to-br from-slate-700/80 to-slate-800/80 text-white border border-white/10 rounded-3xl rounded-bl-md backdrop-blur-sm",
    // Padding depends on content type
    isImage && !message.isDeleted ? "p-1.5" : "px-4 py-3 text-sm leading-relaxed"
  );

  return (
    <>
      <div
        className={cn("flex w-full mb-1 group", isMe ? "justify-end" : "justify-start")}
        onContextMenu={(e) => {
          e.preventDefault();
          onActionMenu({ message, x: e.clientX, y: e.clientY });
        }}
      >
        {/* Swipe-to-reply icon */}
        <div
          className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity self-center flex items-center justify-center cursor-pointer p-1.5 rounded-full hover:bg-white/10 active:scale-90 shrink-0",
            isMe ? "order-first mr-1" : "order-last ml-1"
          )}
          onClick={() => onReply && onReply(message)}
        >
          <Reply size={14} className="text-gray-400 hover:text-white" />
        </div>

        {/* ── Bubble ─────────────────────────────────────────────────────── */}
        <div onDoubleClick={handleDoubleClick} className={bubbleBase}>
          {showHeartPop && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none animate-in zoom-in spin-in-12 duration-300">
              <Heart size={isImage ? 80 : 48} className="text-red-500 drop-shadow-2xl fill-red-500 opacity-90" />
            </div>
          )}

          {/* Reply preview */}
          {message.replyTo && (
            <div className={cn(
              "text-xs opacity-70 border-l-2 pl-2 mb-2 rounded-sm py-1 pr-1",
              isMe ? "border-white/60 bg-white/10" : "border-violet-400/60 bg-white/5",
              isImage ? "mx-2 mt-1" : ""
            )}>
              <span className="font-semibold block">{message.replyTo.senderName}</span>
              <p className="truncate opacity-80">{message.replyTo.text}</p>
            </div>
          )}

          {/* ── Content ──────────────────────────────────────────────────── */}
          {message.isDeleted ? (
            <div className="flex items-center gap-2 opacity-70 text-xs">
              🚫 <span>This message was deleted</span>
            </div>

          ) : message.voiceUrl ? (
            /* ── Voice message ─────────────────────────────────────────── */
            <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded">
              <button
                onClick={() => {
                  if (audioRef.current) {
                    if (isPlaying) {
                      audioRef.current.pause();
                    } else {
                      audioRef.current.play();
                    }
                    setIsPlaying(!isPlaying);
                  }
                }}
                className="p-1 bg-blue-500 text-white rounded-full"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className="flex-1">
                <div className="h-1 bg-gray-300 rounded">
                  <div className="h-1 bg-blue-500 rounded" style={{ width: '50%' }}></div>
                </div>
              </div>
              <span className="text-xs">{message.voiceDuration}s</span>
              <audio ref={audioRef} src={message.voiceUrl} onEnded={() => setIsPlaying(false)} />
            </div>

          ) : message.location ? (
            /* ── Location message ───────────────────────────────────────── */
            <div className="bg-gray-100 p-2 rounded">
              <div className="flex items-center space-x-2">
                <MapPin size={16} className="text-red-500" />
                <span className="text-sm">Location</span>
              </div>
              <p className="text-xs text-gray-600">{message.location.address}</p>
            </div>

          ) : message.contact ? (
            /* ── Contact message ────────────────────────────────────────── */
            <div className="bg-gray-100 p-2 rounded flex items-center space-x-2">
              <User size={16} />
              <div>
                <p className="font-medium">{message.contact.name}</p>
                <p className="text-sm text-gray-600">{message.contact.phoneNumber}</p>
              </div>
            </div>

          ) : isImage ? (
            /* ── Image bubble ─────────────────────────────────────────── */
            imgError ? (
              /* Broken image fallback — show as file card */
              <div className="flex items-center gap-3 px-2 py-2 min-w-[180px]">
                <FileIcon size={28} className="text-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate opacity-80">Image</p>
                  <button onClick={handleDownload} className="text-[11px] underline opacity-60 hover:opacity-100">Open link</button>
                </div>
              </div>
            ) : (
              <div className="relative group/img cursor-pointer" onClick={() => setShowImageModal(true)}>
                <img
                  src={contentText}
                  className="rounded-[14px] max-h-[300px] max-w-full w-auto object-cover block"
                  alt="Image"
                  onError={() => setImgError(true)}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/15 transition-colors rounded-[14px]" />
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(e); }}
                  className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full"
                  title="Download"
                >
                  <Download size={13} />
                </button>
              </div>
            )

          ) : isAudio ? (
            /* ── Audio bubble ─────────────────────────────────────────── */
            <div className="flex items-center gap-2 pr-2 py-1 min-w-[200px]">
              <audio controls src={contentText} className="h-9 w-full opacity-90" />
            </div>

          ) : isFile ? (
            /* ── File card (WhatsApp-style) ───────────────────────────── */
            <div
              className={cn(
                "flex items-center gap-3 rounded-2xl p-3 min-w-[220px] max-w-[280px] cursor-pointer select-none",
                isMe
                  ? "bg-white/15 hover:bg-white/20"
                  : "bg-black/20 hover:bg-black/30",
                "transition-colors"
              )}
              onClick={handleDownload}
              title={`Download ${fileName}`}
            >
              {/* File type icon */}
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                isMe ? "bg-white/20" : "bg-white/10"
              )}>
                {getFileIcon()}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">{fileName}</p>
                <p className="text-[11px] opacity-60 mt-0.5 uppercase tracking-wide">
                  {fileExt || "File"}{fileSizeLabel ? ` · ${fileSizeLabel}` : ""}
                </p>
              </div>

              {/* Download icon */}
              <Download size={16} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity" />
            </div>

          ) : message.gift ? (
            <div className="flex flex-col items-center p-2 min-w-[100px]">
              <span className="text-5xl animate-bounce mb-2 drop-shadow-lg">{message.gift.emoji}</span>
              <span className="font-bold text-sm bg-black/20 px-3 py-1 rounded-full text-white backdrop-blur-sm shadow-inner">
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
              <span className="font-extrabold text-lg mt-2 bg-yellow-900/40 border border-yellow-500/50 px-3 py-1 rounded-full text-yellow-300 backdrop-blur-sm shadow-inner">
                {message.coinTransfer.amount} Coins
              </span>
            </div>

          ) : message.callLog ? (
            <div className="flex items-center gap-3 p-1 pr-4 min-w-[180px]">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                message.callLog.status === "completed"
                  ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-200 border border-red-500/30"
              }`}>
                {message.callLog.status === "completed"
                  ? (message.callLog.isVideo ? <Video size={16} /> : <Phone size={16} />)
                  : <PhoneMissed size={16} />}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">{message.callLog.isVideo ? "Video Call" : "Voice Call"}</span>
                <span className={`text-[11px] font-bold uppercase tracking-wider mt-0.5 ${
                  message.callLog.status === "completed" ? "text-emerald-300" : "text-red-300"
                }`}>
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

          {/* ── Footer: timestamp + ticks ─────────────────────────────── */}
          <div className={cn(
            "flex justify-end items-center gap-1 mt-1",
            isImage && !message.isDeleted && !imgError
              ? "absolute bottom-2.5 right-2.5 bg-black/50 px-2 py-0.5 rounded-full text-white backdrop-blur-sm"
              : ""
          )}>
            {(message.starredBy?.length ?? 0) > 0 && !message.isDeleted && (
              <Star size={9} className="text-yellow-400 fill-yellow-400 mr-0.5" />
            )}
            {message.isEdited && !message.isDeleted && (
              <span className="text-[9px] opacity-60 mr-1 italic">edited</span>
            )}
            <span className={cn(
              "text-[10px]",
              isImage && !message.isDeleted && !imgError ? "opacity-100 font-medium" : "opacity-60"
            )}>
              {(message.timestamp?.toDate ? message.timestamp.toDate() : new Date())
                .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {isMe && !message.isDeleted && (
              <span className={cn("text-[11px]", message.status === "seen" ? "text-cyan-400" : "opacity-60")}>
                {message.status === "sent"      && "✓"}
                {message.status === "delivered" && "✓✓"}
                {message.status === "seen"      && "✓✓"}
              </span>
            )}
          </div>

          {/* Reactions */}
          {message.reactions && (
            <div className={cn("flex gap-1 flex-wrap", isImage && !imgError ? "absolute bottom-2.5 left-2.5" : "mt-1.5")}>
              {Object.entries(message.reactions).map(([emoji, users]: any) => (
                <span key={emoji} className="text-xs bg-black/30 px-2 py-[2px] rounded-full backdrop-blur-sm text-white border border-white/10">
                  {emoji} {users.length}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Fullscreen Image Modal ──────────────────────────────────────────── */}
      {showImageModal && isImage && !imgError && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex flex-col pointer-events-auto">
          <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex flex-col">
              <span className="text-white font-medium text-lg">{message.senderName}</span>
              <span className="text-white/70 text-sm">{message.timestamp?.toDate?.().toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleDownload} className="text-white opacity-80 hover:opacity-100 hover:bg-white/10 transition-all p-2.5 rounded-full" title="Download">
                <Download size={22} />
              </button>
              <button onClick={() => setShowImageModal(false)} className="text-white opacity-80 hover:opacity-100 hover:bg-white/10 transition-all p-2.5 rounded-full" title="Close">
                <X size={22} />
              </button>
            </div>
          </div>
          <div
            className="flex-1 flex items-center justify-center p-4 overflow-hidden"
            onClick={() => setShowImageModal(false)}
          >
            <img
              src={contentText}
              className="max-w-full max-h-full object-contain cursor-default select-none shadow-2xl rounded-2xl"
              onClick={(e) => e.stopPropagation()}
              alt="Full size"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
            />
          </div>
        </div>
      )}
    </>
  );
}