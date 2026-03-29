"use client";
import { X, Image as ImageIcon, Link as LinkIcon, FileText } from "lucide-react";
import { Message } from "@/types";

export default function MediaSidebar({ 
  isOpen, 
  onClose, 
  messages 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  messages: Message[] 
}) {
  // Filter messages that contain Giphy links or external URLs
  const sharedMedia = messages.filter(m => m.text.startsWith("http") && m.text.includes("giphy.com"));
  const sharedLinks = messages.filter(m => m.text.startsWith("http") && !m.text.includes("giphy.com"));

  return (
    <div className={cn(
      "fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-900 border-l dark:border-slate-800 z-[100] shadow-2xl transition-transform duration-300 transform",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-lg">Contact Info</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Media/GIFs Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold text-sm text-gray-500 uppercase tracking-widest">
                <ImageIcon size={16} /> Media
              </div>
              <span className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                {sharedMedia.length}
              </span>
            </div>
            
            {sharedMedia.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {sharedMedia.map((media) => (
                  <div key={media.id} className="aspect-square rounded-lg overflow-hidden border dark:border-slate-800 bg-gray-100 dark:bg-slate-800">
                    <img src={media.text} alt="Shared" className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No media shared yet</p>
            )}
          </section>

          {/* Links Section */}
          <section>
            <div className="flex items-center gap-2 font-bold text-sm text-gray-500 uppercase tracking-widest mb-4">
              <LinkIcon size={16} /> Links
            </div>
            <div className="space-y-3">
              {sharedLinks.length > 0 ? (
                sharedLinks.map((link) => (
                  <a 
                    key={link.id} 
                    href={link.text} 
                    target="_blank" 
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-transparent hover:border-blue-500 transition-all"
                  >
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                      <LinkIcon size={14} />
                    </div>
                    <span className="text-xs truncate font-medium dark:text-gray-300">{link.text}</span>
                  </a>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">No links shared yet</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// Small helper for CN if not imported
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}