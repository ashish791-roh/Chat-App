"use client";

import React from "react";
import { X, Image as ImageIcon, Link as LinkIcon, File, ChevronRight } from "lucide-react";

// Helper for Tailwind classes
function cn(...inputs) {
  return inputs.filter(Boolean).join(" ");
}

const MediaSidebar = ({ isOpen, onClose, messages = [] }) => {
  // 1. FILTER LOGIC: Identify messages that contain media or links
  const mediaMessages = messages.filter((msg) => {
    const text = msg.text || "";
    // Checks for local blob URLs, Firebase storage links, or common image extensions
    return (
      text.startsWith("blob:") || 
      text.includes("firebasestorage") || 
      text.match(/\.(jpeg|jpg|gif|png)$/)
    );
  });

  const linkMessages = messages.filter((msg) => {
    const text = msg.text || "";
    return text.includes("http://") || text.includes("https://") || text.includes("www.");
  });

  const fileMessages = messages.filter((msg) => {
    const text = msg.text || "";
    return text.startsWith("📄");
  });

  return (
    <aside
      className={cn(
        "fixed right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 transition-transform duration-300 ease-in-out z-[150] shadow-2xl flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* HEADER */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Contact Info</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-500"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        
        {/* MEDIA GRID SECTION */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <ImageIcon size={14} /> Media
            </h3>
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {mediaMessages.length}
            </span>
          </div>

          {mediaMessages.length === 0 ? (
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-6 text-center border border-dashed border-gray-200 dark:border-slate-700">
              <p className="text-xs text-gray-400 italic">No media shared yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {mediaMessages.slice(0, 9).map((msg) => (
                <div 
                  key={msg.id} 
                  className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <img 
                    src={msg.text} 
                    alt="Shared content" 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                        e.target.src = "https://via.placeholder.com/150?text=File";
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* LINKS SECTION */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
            <LinkIcon size={14} /> Links
          </h3>
          <div className="space-y-3">
            {linkMessages.length === 0 ? (
               <p className="text-xs text-gray-400 italic ml-1">No links shared yet</p>
            ) : (
              linkMessages.slice(0, 3).map((link) => (
                <div key={link.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-blue-500 transition-colors cursor-pointer group">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                    <LinkIcon size={16} />
                  </div>
                  <p className="text-xs text-blue-500 truncate flex-1 font-medium">{link.text}</p>
                  <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-500" />
                </div>
              ))
            )}
          </div>
        </section>

        {/* FILES SECTION */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
            <File size={14} /> Docs
          </h3>
          <div className="space-y-3">
            {fileMessages.length === 0 ? (
               <p className="text-xs text-gray-400 italic ml-1">No documents shared yet</p>
            ) : (
              fileMessages.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800">
                  <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-lg">
                    <File size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">
                      {file.text.replace("📄 ", "")}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">PDF • 1.2 MB</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>

      {/* FOOTER ACTION */}
      <div className="p-6 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button className="w-full py-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl text-xs hover:bg-gray-200 dark:hover:bg-slate-700 transition-all">
          View All Shared Content
        </button>
      </div>
    </aside>
  );
};

export default MediaSidebar;