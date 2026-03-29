"use client";

import { useState, useEffect, useRef } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  Send, Users, LogOut, Search, MoreVertical, 
  Smile, Gift, ChevronLeft, Phone, Video, X 
} from "lucide-react";

import ChatBubble from "@/components/ChatBubble";
import TypingIndicator from "@/components/TypingIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import ChatEmojiPicker from "@/components/EmojiPicker";
import GifPicker from "@/components/GifPicker";
import { Message } from "@/types";

/** * Utility for clean Tailwind classes 
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: "1", 
      senderId: "other", 
      senderName: "Anchal",
      text: "Hii", 
      timestamp: new Date().toISOString(), 
      isMe: false,
      status: 'read'
    }
  ]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages or pickers change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showEmoji, showGif, replyingTo]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "me",
      senderName: "Ashish", // Your name for the reply context
      text: input,
      timestamp: new Date().toISOString(),
      isMe: true,
      status: 'sent',
      replyTo: replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.text,
        senderName: replyingTo.senderName
      } : undefined
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setShowEmoji(false);
    setReplyingTo(null); // Clear reply after sending
  };

  const handleGifSend = (url: string) => {
    const gifMessage: Message = {
      id: Date.now().toString(),
      senderId: "me",
      senderName: "Ashish",
      text: url,
      timestamp: new Date().toISOString(),
      isMe: true,
      status: 'sent'
    };
    setMessages((prev) => [...prev, gifMessage]);
    setShowGif(false);
  };

  const handleReaction = (msgId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const currentReactions = m.reactions || {};
      const users = currentReactions[emoji] || [];
      
      // Toggle reaction logic
      const newUsers = users.includes("me") 
        ? users.filter(u => u !== "me") 
        : [...users, "me"];
        
      const newReactions = { ...currentReactions, [emoji]: newUsers };
      if (newUsers.length === 0) delete newReactions[emoji];

      return { ...m, reactions: newReactions };
    }));
  };

  const handleDeleteMessage = (msgId: string) => {
  // In a real app, you would emit a socket event here:
  // socket.emit("delete_message", msgId);

  setMessages((prev) =>
    prev.map((m) =>
      m.id === msgId ? { ...m, isDeleted: true, text: "", reactions: {} } : m
    )
  );
};

  return (
    <main className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden text-gray-900 dark:text-gray-100 transition-colors">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-80 border-r border-gray-200 dark:border-slate-800 hidden md:flex flex-col bg-gray-50 dark:bg-slate-900/50">
        <div className="p-5 border-b dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xl">
              <div className="bg-blue-600 p-1.5 rounded-lg text-white"><Users size={20} /></div>
              BlinkChat
          </div>
          <ThemeToggle />
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          <p className="px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Messages</p>
          <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700 cursor-pointer">
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">S</div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Anchal</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Hii</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900">
          <button className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium hover:text-red-500 w-full py-2 rounded-xl transition-all">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* --- MAIN CHAT AREA --- */}
      <section className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 relative">
        
        {/* ENHANCED HEADER */}
        <header className="h-[73px] px-4 md:px-6 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-2 md:gap-3">
            <button className="md:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-500 transition-colors">
              <ChevronLeft size={24} />
            </button>

            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold border-2 border-white dark:border-slate-800 shadow-sm">
                S
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
            </div>

            <div>
              <h2 className="font-bold text-gray-800 dark:text-white leading-tight">Anchal</h2>
              <span className="text-[11px] text-green-500 font-medium">Active now</span>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <button className="p-2 text-gray-400 hover:text-blue-500 transition-colors hidden sm:block">
              <Phone size={20} />
            </button>
            <button className="p-2 text-gray-400 hover:text-blue-500 transition-colors hidden sm:block">
              <Video size={20} />
            </button>
            <button className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <MoreVertical size={20} />
            </button>
          </div>
        </header>

        {/* MESSAGES AREA */}
        <div 
          ref={scrollRef} 
          className="flex-1 overflow-y-auto p-6 bg-[#F8F9FB] dark:bg-slate-950 space-y-1 transition-colors"
        >
          {messages.map((msg) => (
            <ChatBubble 
              key={msg.id} 
              message={msg} 
              onReply={setReplyingTo}
              onReaction={handleReaction}
            />
          ))}
        </div>

        {messages.map((msg) => (
  <ChatBubble 
    key={msg.id} 
    message={msg} 
    onReply={setReplyingTo}
    onReaction={handleReaction}
    onDelete={handleDeleteMessage} // Pass the new handler
  />
))}

        {/* INPUT AREA */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative">
          
          {/* Reply Preview Bar */}
          {replyingTo && (
            <div className="max-w-4xl mx-auto mb-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-t-xl border-l-4 border-blue-600 flex justify-between items-center animate-in slide-in-from-bottom-2">
              <div className="truncate pr-4">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">Replying to {replyingTo.senderName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{replyingTo.text.startsWith('http') ? '📁 Image/GIF' : replyingTo.text}</p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
          )}

          {/* Pickers */}
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

          <form 
            onSubmit={handleSendMessage} 
            className={cn(
              "max-w-4xl mx-auto flex items-center gap-1 md:gap-2 bg-gray-100 dark:bg-slate-800 p-2 border dark:border-slate-700 transition-all shadow-sm",
              replyingTo ? "rounded-b-2xl" : "rounded-2xl"
            )}
          >
            <button 
              type="button" 
              onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }}
              className={cn(
                "p-2 rounded-full transition-all", 
                showEmoji ? "text-blue-500 bg-blue-100 dark:bg-blue-900/30" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700"
              )}
            >
              <Smile size={22} />
            </button>
            
            <button 
              type="button" 
              onClick={() => { setShowGif(!showGif); setShowEmoji(false); }}
              className={cn(
                "p-2 rounded-full transition-all", 
                showGif ? "text-pink-500 bg-pink-100 dark:bg-pink-900/30" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700"
              )}
            >
              <Gift size={22} />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent border-none px-2 py-2 text-sm outline-none dark:text-white placeholder:text-gray-400"
            />
            
            <button 
              type="submit"
              disabled={!input.trim()}
              className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-500/20"
            >
              <Send size={18} fill="currentColor" />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}