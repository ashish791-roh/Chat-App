// src/app/page.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Smile, Gift, X, Users, LogOut, ChevronLeft } from "lucide-react";
import ChatBubble from "@/components/ChatBubble";
import { Message } from "@/types";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: "1", senderId: "other", senderName: "Shiwani", 
      text: "Hii! Check out this **bold** text.", 
      timestamp: new Date().toISOString(), isMe: false, status: 'read' 
    }
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, replyingTo]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "me",
      senderName: "Ashish",
      text: input,
      timestamp: new Date().toISOString(),
      isMe: true,
      status: 'sending',
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, senderName: replyingTo.senderName } : undefined
    };

    setMessages(prev => [...prev, newMessage]);
    setInput("");
    setReplyingTo(null);
  };

  const handleReaction = (msgId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const currentReactions = m.reactions || {};
      const users = currentReactions[emoji] || [];
      return { 
        ...m, 
        reactions: { ...currentReactions, [emoji]: users.includes("me") ? users : [...users, "me"] } 
      };
    }));
  };

  return (
    <main className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden transition-colors">
      {/* Sidebar (Simplified for brevity) */}
      <aside className="w-80 border-r dark:border-slate-800 hidden md:flex flex-col bg-gray-50 dark:bg-slate-900/50">
        <div className="p-5 border-b dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="font-bold text-xl text-blue-600">BlinkChat</div>
          <ThemeToggle />
        </div>
        <div className="p-4 flex-1">
           <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700">
             <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">S</div>
             <div><p className="text-sm font-semibold">Shiwani</p><p className="text-xs text-green-500">Online</p></div>
           </div>
        </div>
      </aside>

      {/* Chat Area */}
      <section className="flex-1 flex flex-col h-full relative">
        <header className="h-[73px] px-6 border-b dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-20">
          <div className="flex items-center gap-3">
             <button className="md:hidden p-2 -ml-2 text-gray-500"><ChevronLeft size={24} /></button>
             <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">S</div>
             <div><h2 className="font-bold">Shiwani</h2><span className="text-[10px] text-green-500 font-bold">ACTIVE NOW</span></div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 bg-[#F8F9FB] dark:bg-slate-950 space-y-2 transition-colors">
          {messages.map(msg => (
            <ChatBubble key={msg.id} message={msg} onReply={setReplyingTo} onReaction={handleReaction} />
          ))}
        </div>

        {/* Input Bar with Reply Preview */}
        <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900 relative">
          
          {replyingTo && (
            <div className="mx-auto max-w-4xl mb-2 p-3 bg-gray-100 dark:bg-slate-800 rounded-t-xl border-l-4 border-blue-500 flex justify-between items-center animate-in slide-in-from-bottom-2">
              <div className="truncate pr-4">
                <p className="text-[10px] font-bold text-blue-500">Replying to {replyingTo.senderName}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{replyingTo.text}</p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-2 rounded-2xl border dark:border-slate-700 shadow-sm">
            <button type="button" className="p-2 text-gray-500 hover:text-blue-500"><Smile size={22} /></button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-transparent border-none px-2 py-1 text-sm outline-none dark:text-white"
            />
            <button type="submit" disabled={!input.trim()} className="bg-blue-600 text-white p-2.5 rounded-xl disabled:opacity-50">
              <Send size={18} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}