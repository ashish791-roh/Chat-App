// src/app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import ChatBubble from "@/components/ChatBubble";
import TypingIndicator from "@/components/TypingIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import ChatEmojiPicker from "@/components/EmojiPicker";
import GifPicker from "@/components/GifPicker";
import { Message } from "@/types";
import { Send, Users, LogOut, Search, MoreVertical, Smile, Gift } from "lucide-react";
import { clsx } from "clsx";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showEmoji, showGif]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "me",
      text: input,
      timestamp: new Date().toISOString(),
      isMe: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setShowEmoji(false);
  };

  const handleGifSend = (url: string) => {
    const gifMessage: Message = {
      id: Date.now().toString(),
      senderId: "me",
      text: url,
      timestamp: new Date().toISOString(),
      isMe: true,
    };
    setMessages((prev) => [...prev, gifMessage]);
    setShowGif(false);
  };

  return (
    <main className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden text-gray-900 dark:text-gray-100">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-80 border-r border-gray-200 dark:border-slate-800 hidden md:flex flex-col bg-gray-50 dark:bg-slate-900/50">
        <div className="p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xl">
             <Users size={24} /> ChatApp
          </div>
          <ThemeToggle />
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">P</div>
            <div>
              <p className="text-sm font-semibold">Parv Jo</p>
              <p className="text-xs text-green-500">Online</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-t dark:border-slate-800">
          <button className="flex items-center gap-2 text-red-500 text-sm font-medium w-full p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* --- CHAT AREA --- */}
      <section className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950">
        <header className="h-[73px] px-6 border-b dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold">Project Group</h2>
          <MoreVertical size={20} className="text-gray-400" />
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 bg-[#F8F9FB] dark:bg-slate-950 space-y-2">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
        </div>

        {/* --- INPUT BAR --- */}
        <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900 relative">
          {showEmoji && (
            <div className="absolute bottom-20 right-4 z-50">
              <ChatEmojiPicker onEmojiClick={(emoji) => setInput(prev => prev + emoji)} />
            </div>
          )}
          
          {showGif && (
            <div className="absolute bottom-20 right-4 z-50">
              <GifPicker onGifClick={handleGifSend} />
            </div>
          )}

          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-2 rounded-2xl">
            <button 
              type="button" 
              onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }}
              className={clsx("p-2 rounded-full transition", showEmoji ? "text-blue-500 bg-blue-100" : "text-gray-500 hover:bg-gray-200")}
            >
              <Smile size={22} />
            </button>
            
            <button 
              type="button" 
              onClick={() => { setShowGif(!showGif); setShowEmoji(false); }}
              className={clsx("p-2 rounded-full transition", showGif ? "text-pink-500 bg-pink-100" : "text-gray-500 hover:bg-gray-200")}
            >
              <Gift size={22} />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent border-none px-2 py-2 text-sm outline-none dark:text-white"
            />
            
            <button 
              type="submit"
              disabled={!input.trim()}
              className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}