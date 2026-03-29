// src/app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import ChatBubble from "@/components/ChatBubble";
import TypingIndicator from "@/components/TypingIndicator";
import { Message } from "@/types";
import { Send, Users, LogOut, Search, MoreVertical } from "lucide-react";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Mock data - This will eventually come from your teammate's Backend/Socket
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", senderId: "other", text: "Hey Ashish! Did you start the frontend?", timestamp: new Date().toISOString(), isMe: false },
    { id: "2", senderId: "me", text: "Yes! Just setting up the layout now.", timestamp: new Date().toISOString(), isMe: true },
  ]);

  // AUTO-SCROLL: Keeps the chat at the bottom when new messages arrive
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
    
    // BACKEND SYNC: Your teammate will handle this event
    // socket.emit("send_message", newMessage);
  };

  // TYPING LOGIC: Simulating the behavior for now
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    // BACKEND SYNC:
    // socket.emit("typing");
    
    // For Demo: Let's pretend the other person starts typing when you type "hello"
    if (e.target.value.toLowerCase() === "hello") {
      setIsOtherUserTyping(true);
      setTimeout(() => setIsOtherUserTyping(false), 3000);
    }
  };

  return (
    <main className="flex h-screen bg-white overflow-hidden text-gray-900">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-80 border-r border-gray-200 hidden md:flex flex-col bg-gray-50">
        <div className="p-5 border-b flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Users className="text-white" size={20} />
            </div>
            <h1 className="font-bold text-xl tracking-tight">ChatApp</h1>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full bg-white border border-gray-200 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase mb-2">Direct Messages</p>
          
          {/* Friend Item - Repeating this would be dynamic later */}
          <div className="flex items-center gap-3 p-3 hover:bg-white hover:shadow-sm rounded-xl cursor-pointer transition-all border border-transparent hover:border-gray-100 group">
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center font-bold text-white shadow-md">
                P
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Parv Joshi</p>
              <p className="text-xs text-gray-500 truncate">Typing...</p>
            </div>
            <span className="text-[10px] text-gray-400">12:45 PM</span>
          </div>
        </div>

        <div className="p-4 border-t bg-white">
          <button className="flex items-center justify-center gap-2 text-gray-600 text-sm font-medium hover:text-red-600 hover:bg-red-50 w-full py-2.5 rounded-xl transition-colors">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* --- CHAT WINDOW --- */}
      <section className="flex-1 flex flex-col h-full relative bg-white">
        
        {/* Chat Header */}
        <header className="h-[73px] px-6 border-b flex items-center justify-between bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">P</div>
            <div>
              <h2 className="font-bold text-gray-800 leading-none">Parv Joshi</h2>
              <span className="text-xs text-green-500 font-medium">Online</span>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
            <MoreVertical size={20} />
          </button>
        </header>

        {/* Messages Scrolling Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-2 bg-[#F8F9FB] scroll-smooth"
        >
          <div className="flex justify-center mb-6">
            <span className="text-[11px] bg-gray-200 text-gray-500 px-3 py-1 rounded-full uppercase font-bold tracking-wider">Today</span>
          </div>

          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {isOtherUserTyping && <TypingIndicator username="Parv" />}
        </div>

        {/* Message Input Bar */}
        <div className="p-4 bg-white border-t">
          <form 
            onSubmit={handleSendMessage} 
            className="max-w-4xl mx-auto flex items-center gap-3 bg-gray-100 p-1.5 rounded-2xl focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 transition-all shadow-inner"
          >
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Write your message..."
              className="flex-1 bg-transparent border-none px-4 py-2 text-sm outline-none text-gray-800"
            />
            <button 
              type="submit"
              disabled={!input.trim()}
              className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:hover:shadow-none"
            >
              <Send size={18} fill="currentColor" />
            </button>
          </form>
          <p className="text-center text-[10px] text-gray-400 mt-2">Press Enter to send</p>
        </div>
      </section>
    </main>
  );
}