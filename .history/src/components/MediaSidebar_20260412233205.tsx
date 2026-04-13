"use client";

import React from "react";
import {
  X,
  Image as ImageIcon,
  Link as LinkIcon,
  File,
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

// ── Helpers ──────────────────────────────────────────────────────────────────
// Firebase Storage URLs encode the file path, so we must decode before testing
// the extension. Example URL:
//   https://firebasestorage.googleapis.com/v0/b/xxx/o/chats%2F123%2Fphoto.jpg?alt=media&token=abc
function decodedUrlTest(url: string, pattern: RegExp): boolean {
  try {
    return pattern.test(decodeURIComponent(url));
  } catch {
    return pattern.test(url);
  }
}

function isImageUrl(msg: Message): boolean {
  if (msg.fileType === "image") return true;
  if (!msg.text?.startsWith("http")) return false;
  return decodedUrlTest(msg.text, /\.(jpg|jpeg|png|gif|webp)(\?|$)/i);
}

function isPdfUrl(msg: Message): boolean {
  if (msg.fileType === "pdf") return true;
  if (!msg.text?.startsWith("http")) return false;
  return decodedUrlTest(msg.text, /\.pdf(\?|$)/i);
}

function isFileUrl(msg: Message): boolean {
  if (msg.fileType === "file") return true;
  if (!msg.text?.startsWith("http")) return false;
  return decodedUrlTest(
    msg.text,
    /\.(docx?|xlsx?|pptx?|zip|rar|txt|csv)(\?|$)/i
  );
}

function isPlainLink(msg: Message): boolean {
  if (!msg.text?.startsWith("http")) return false;
  // Exclude Firebase Storage file uploads — those are already shown in media/files
  if (msg.text.includes("firebasestorage.googleapis.com")) return false;
  return true;
}

// ── Component ─────────────────────────────────────────────────────────────────
const MediaSidebar: React.FC<MediaSidebarProps> = ({ isOpen, onClose, messages }) => {
  const mediaMessages = messages.filter(isImageUrl);
  const pdfMessages   = messages.filter(isPdfUrl);
  const fileMessages  = messages.filter(isFileUrl);
  const linkMessages  = messages.filter(isPlainLink);

  return (
    <div
      className={cn(
        "fixed top-0 right-0 h-full w-80 z-50 transform transition-transform duration-300",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
      style={{ background: "var(--bg-panel)", borderLeft: "1px solid var(--border)" }}
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
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/8 transition-colors"
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
            <Empty label="No photos" />
          ) : (
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {mediaMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer border border-white/10 hover:opacity-90 transition-opacity"
                  onClick={() => window.open(msg.text, "_blank", "noopener,noreferrer")}
                >
                  <img
                    src={msg.text}
                    alt={msg.fileName || "photo"}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── PDFs ── */}
        <Section icon={<FileText size={18} />} title="PDFs">
          {pdfMessages.length === 0 ? (
            <Empty label="No PDFs" />
          ) : (
            <div className="space-y-2 mt-2">
              {pdfMessages.map((msg) => (
                <FileRow
                  key={msg.id}
                  name={msg.fileName || "Document.pdf"}
                  sub="PDF Document"
                  url={msg.text}
                  iconColor="text-red-400"
                  iconBg="bg-red-500/20"
                />
              ))}
            </div>
          )}
        </Section>

        {/* ── Other files ── */}
        <Section icon={<File size={18} />} title="Files">
          {fileMessages.length === 0 ? (
            <Empty label="No files" />
          ) : (
            <div className="space-y-2 mt-2">
              {fileMessages.map((msg) => (
                <FileRow
                  key={msg.id}
                  name={msg.fileName || "File"}
                  sub="File"
                  url={msg.text}
                  iconColor="text-blue-400"
                  iconBg="bg-blue-500/20"
                />
              ))}
            </div>
          )}
        </Section>

        {/* ── Links ── */}
        <Section icon={<LinkIcon size={18} />} title="Links">
          {linkMessages.length === 0 ? (
            <Empty label="No links" />
          ) : (
            <div className="space-y-1.5 mt-2">
              {linkMessages.map((msg) => (
                <a
                  key={msg.id}
                  href={msg.text}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm truncate rounded-lg px-3 py-2 hover:bg-white/5 transition-colors"
                  style={{ color: "var(--accent-2)" }}
                >
                  {msg.text}
                </a>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
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
      <div className="flex items-center gap-2 mb-1">
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
    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
      {label}
    </p>
  );
}

function FileRow({
  name,
  sub,
  url,
  iconColor,
  iconBg,
}: {
  name: string;
  sub: string;
  url: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div
      className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border border-white/5 hover:bg-white/5 transition-colors"
      style={{ background: "var(--bg-elevated)" }}
      onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
    >
      <div className={cn("p-2 rounded-lg shrink-0", iconBg)}>
        <FileText size={18} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
          {name}
        </p>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          {sub}
        </p>
      </div>
      <Download size={15} className="text-emerald-400 shrink-0" />
    </div>
  );
}

export default MediaSidebar;