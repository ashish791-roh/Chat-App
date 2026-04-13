"use client";

import React from "react";
import {
  X,
  Image as ImageIcon,
  Link as LinkIcon,
  File,
  ChevronRight,
} from "lucide-react";
import { Message } from "@/types";

// Helper for Tailwind classes
function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(" ");
}

// ✅ Proper Props Typing
interface MediaSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
}

const MediaSidebar: React.FC<MediaSidebarProps> = ({
  isOpen,
  onClose,
  messages,
}) => {
  // ✅ Filter different message types
  const mediaMessages = messages.filter(
    (msg) =>
      msg.text?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  );

  const linkMessages = messages.filter(
    (msg) =>
      msg.text?.startsWith("http://") ||
      msg.text?.startsWith("https://")
  );

  const fileMessages = messages.filter(
    (msg) =>
      msg.text?.match(/\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i)
  );

  return (
    <div
      className={cn(
        "fixed top-0 right-0 h-full w-80 bg-white shadow-lg z-50 transform transition-transform duration-300",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Media & Files</h2>
        <button onClick={onClose}>
          <X />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 overflow-y-auto h-[calc(100%-60px)]">
        
        {/* Media Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon size={18} />
            <h3 className="font-medium">Media</h3>
          </div>

          {mediaMessages.length === 0 ? (
            <p className="text-sm text-gray-500">No media found</p>
          ) : (
            mediaMessages.map((msg) => (
              <div key={msg.id} className="text-sm truncate">
                {msg.text}
              </div>
            ))
          )}
        </div>

        {/* Links Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LinkIcon size={18} />
            <h3 className="font-medium">Links</h3>
          </div>

          {linkMessages.length === 0 ? (
            <p className="text-sm text-gray-500">No links found</p>
          ) : (
            linkMessages.map((msg) => (
              <a
                key={msg.id}
                href={msg.text}
                target="_blank"
                className="block text-blue-500 text-sm truncate"
              >
                {msg.text}
              </a>
            ))
          )}
        </div>

        {/* Files Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <File size={18} />
            <h3 className="font-medium">Files</h3>
          </div>

          {fileMessages.length === 0 ? (
            <p className="text-sm text-gray-500">No files found</p>
          ) : (
            fileMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="truncate">{msg.text}</span>
                <ChevronRight size={16} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaSidebar;