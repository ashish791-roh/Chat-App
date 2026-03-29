// src/app/page.tsx
"use client"; // Required for interactivity in Next.js App Router
import { useState } from "react";
import ChatBubble from "@/components/ChatBubble";
import { Message } from "@/types";
import { Send, Users, LogOut } from "lucide-react";

export default function ChatPage() {
  const [input, setInput] = useState("");
  
  // Mock data for now (Your teammate will eventually provide this via Socket.io)
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", senderId: "other", text: "Hey! How is the project going?", timestamp: new Date().toISOString(), isMe: false },
    { id: "2", senderId: "me", text: "Almost done with the UI setup!", timestamp: new Date().toISOString(), isMe: true },
  ]);

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

    setMessages([...messages, newMessage]);
    setInput("");
    // TODO: socket.emit("send_message", newMessage)
  };

  return (
    <main className="flex h-screen bg-gray-50 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-80 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-4 border-b font-bold text-xl flex items-center gap-2">
          <Users className="text-blue-600" /> ChatApp
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Online Friends</p>
          <div className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">P</div>
            <div>
              <p className="text-sm font-medium">Parv Joshi</p>
              <p className="text-xs text-green-500">online</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-t">
          <button className="flex items-center gap-2 text-red-500 text-sm font-medium hover:bg-red-50 w-full p-2 rounded-lg">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* CHAT WINDOW */}
      <section className="flex-1 flex flex-col h-full bg-white">
        {/* Header */}
        <header className="p-4 border-b flex items-center justify-between bg-white shadow-sm">
          <h2 className="font-semibold text-gray-700">Project Discussion</h2>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#f0f2f5]">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button 
            type="submit"
            className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition"
          >
            <Send size={20} />
          </button>
        </form>
      </section>
    </main>
  );
}