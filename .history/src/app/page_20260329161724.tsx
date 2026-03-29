// src/app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import ChatBubble from "@/components/ChatBubble";
import TypingIndicator from "@/components/TypingIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Message } from "@/types";
import { Send, Users, LogOut, Search, MoreVertical } from "lucide-react";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", senderId: "other", text: "Hey! Did you see the new Dark Mode?", timestamp: new Date().toISOString(), isMe: false },
    { id: "2", senderId: "me", text: "Yes, it looks amazing with Tailwind!", timestamp: new Date().toISOString(), isMe: true },
  ]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOtherUserTyping]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  return (
    <main className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden text-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-80 border-r border-gray-200 dark:border-slate-800 hidden md:flex flex-col bg-gray-50 dark:bg-slate-900/50">
        <div className="p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-500/20">
              <Users className="text-white" size={20} />
            </div>
            <h1 className="font-bold text-xl tracking-tight dark:text-white">ChatApp</h1>
          </div>
          <ThemeToggle />
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <p className="px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-4 tracking-widest">Direct Messages</p>
          
          <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 shadow-sm dark:shadow-none rounded-2xl cursor-pointer border border-gray-100 dark:border-slate-700 transition-all">
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center font-bold text-white">
                P
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold dark:text-white">Parv Joshi</p>
              <p className="text-xs text-blue-500 dark:text-blue-400 font-medium">Typing...</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full py-2.5 rounded-xl transition-all">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* --- CHAT WINDOW --- */}
      <section className="flex-1 flex flex-col h-full relative bg-white dark:bg-slate-950">
        
        {/* Header */}
        <header className="h-[73px] px-6 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 dark:bg-slate-800 rounded-full flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">P</div>
            <div>
              <h2 className="font-bold text-gray-800 dark:text-white leading-none">Parv Joshi</h2>
              <span className="text-xs text-green-500 font-medium">Online</span>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400">
            <MoreVertical size={20} />
          </button>
        </header>

        {/* Messages Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-2 bg-[#F8F9FB] dark:bg-slate-950 transition-colors"
        >
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {isOtherUserTyping && <TypingIndicator username="Parv" />}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
          <form 
            onSubmit={handleSendMessage} 
            className="max-w-4xl mx-auto flex items-center gap-3 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500 transition-all shadow-inner"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write your message..."
              className="flex-1 bg-transparent border-none px-4 py-2 text-sm outline-none text-gray-800 dark:text-white placeholder-gray-400"
            />
            <button 
              type="submit"
              disabled={!input.trim()}
              className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 shadow-md hover:shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              <Send size={18} fill="currentColor" />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}