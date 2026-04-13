"use client";

import React, { useState } from "react";
import {
  X,
  Image as ImageIcon,
  Link as LinkIcon,
  FileText,
  Download,
} from "lucide-react";
import { Message } from "@/types/chat";

function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(" ");
}

interface MediaSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
}

function parseMediaMessage(msg: Message) {
  let isImage = false;
  let isPdfOrFile = false;
  let isPlainLink = false;
  let fileName = "Document";
  let contentText = typeof msg.text === "string" ? msg.text : "";

  // WhatsApp-style unified string format
  if (contentText.startsWith("FILE::")) {
    const parts = contentText.split("::");
    if (parts.length >= 3) {
      fileName = parts[1] || "Attachment";
      contentText = parts.slice(2).join("::");
    }
  }

  // Gracefully fallback on old format if exists
  if (msg.fileType === "image") isImage = true;
  else if (msg.fileType === "pdf" || msg.fileType === "file") isPdfOrFile = true;
  if (msg.fileName && fileName === "Document") fileName = msg.fileName;

  // Infer gracefully from prefix
  if (!isImage && !isPdfOrFile) {
    if (contentText.startsWith("data:image/") || contentText.startsWith("blob:")) {
      isImage = true;
    } else if (contentText.startsWith("data:")) {
      isPdfOrFile = true;
    } else if (contentText.startsWith("http") && !contentText.includes(" ")) {
      if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(contentText)) {
        isImage = true;
      } else {
        isPlainLink = true;
      }
    }
  }

  return { ...msg, isImage, isPdfOrFile, isPlainLink, fileName, contentText };
}

const MediaSidebar: React.FC<MediaSidebarProps> = ({ isOpen, onClose, messages }) => {
  const [selectedImage, setSelectedImage] = useState<{url: string, name: string} | null>(null);

  const parsed = messages.map(parseMediaMessage);
  const mediaMessages = parsed.filter(p => p.isImage);
  const fileMessages = parsed.filter(p => p.isPdfOrFile);
  const linkMessages = parsed.filter(p => p.isPlainLink);

  const triggerDownload = (e: React.MouseEvent, url: string, name: string) => {
    e.stopPropagation();
    if (url.startsWith("data:") || url.startsWith("blob:")) {
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <>
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-80 z-50 transform transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{ background: "var(--bg-panel)", borderLeft: "1px solid var(--border)", boxShadow: "-10px 0 30px rgba(0,0,0,0.1)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Media &amp; Files
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/8 transition-colors active:scale-95"
            style={{ color: "var(--text-secondary)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 overflow-y-auto h-[calc(100%-60px)]">

          {/* ── Images ── */}
          <Section icon={<ImageIcon size={18} />} title="Photos">
            {mediaMessages.length === 0 ? (
              <Empty label="No photos shared yet" />
            ) : (
              <div className="grid grid-cols-3 gap-1 mt-3">
                {mediaMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="aspect-square bg-white/5 overflow-hidden cursor-pointer hover:opacity-80 transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                    onClick={() => setSelectedImage({ url: msg.contentText, name: msg.fileName })}
                  >
                    <img
                      src={msg.contentText}
                      alt={msg.fileName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── PDFs / Files ── */}
          <Section icon={<FileText size={18} />} title="Documents">
            {fileMessages.length === 0 ? (
              <Empty label="No documents shared yet" />
            ) : (
              <div className="space-y-2 mt-3">
                {fileMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer border hover:shadow-md transition-all active:scale-[0.98]"
                    style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
                    onClick={(e) => triggerDownload(e, msg.contentText, msg.fileName)}
                  >
                    <div className="p-2.5 rounded-xl shrink-0 bg-blue-500/10">
                      <FileText size={20} className="text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {msg.fileName}
                      </p>
                      <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                        File Document
                      </p>
                    </div>
                    <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors shrink-0">
                      <Download size={16} className="text-emerald-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── Links ── */}
          <Section icon={<LinkIcon size={18} />} title="Links">
            {linkMessages.length === 0 ? (
              <Empty label="No links shared yet" />
            ) : (
              <div className="space-y-2 mt-3">
                {linkMessages.map((msg) => (
                  <a
                    key={msg.id}
                    href={msg.contentText}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm truncate rounded-xl px-4 py-3 hover:opacity-80 transition-all border shadow-sm active:scale-[0.98]"
                    style={{ background: "var(--bg-elevated)", borderColor: "var(--border)", color: "var(--accent-2)" }}
                  >
                    {msg.contentText}
                  </a>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Media Lightbox Viewer (Instagram/WhatsApp style) for Sidebar */}
      {selectedImage && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex flex-col pointer-events-auto transition-all animate-in fade-in duration-200">
          <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <span className="text-white font-medium truncate max-w-[60%]">
              {selectedImage.name}
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => triggerDownload(e, selectedImage.url, selectedImage.name)}
                className="text-white opacity-80 hover:opacity-100 hover:bg-white/10 transition-all p-2.5 rounded-full"
                title="Download"
              >
                <Download size={22} />
              </button>
              <button 
                onClick={() => setSelectedImage(null)}
                className="text-white opacity-80 hover:opacity-100 hover:bg-white/10 transition-all p-2.5 rounded-full"
              >
                <X size={22} />
              </button>
            </div>
          </div>
          
          <div 
            className="flex-1 flex items-center justify-center p-4 overflow-hidden"
            onClick={() => setSelectedImage(null)}
          >
            <img
              src={selectedImage.url}
              className="max-w-[95%] max-h-[95%] object-contain cursor-default select-none shadow-2xl rounded-sm"
              onClick={(e) => e.stopPropagation()}
              alt="Expanded view"
            />
          </div>
        </div>
      )}
    </>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: "var(--text-secondary)" }}>{icon}</span>
        <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <p className="text-xs font-medium px-1" style={{ color: "var(--text-muted)" }}>
      {label}
    </p>
  );
}

export default MediaSidebar;