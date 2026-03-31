"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send, Users, Phone, Video, X, Trash2,
  Reply, Settings, Search, UserPlus, Paperclip, File,
  Smile, Gift, MoreVertical
} from "lucide-react";
import { useRouter } from "next/navigation";

// Components
import ChatBubble from "@/components/ChatBubble";
import { ThemeToggle } from "@/components/ThemeToggle";
import ChatEmojiPicker from "@/components/EmojiPicker";
import GifPicker from "@/components/GifPicker";
import ProfileModal from "@/components/ProfileModal";
import MediaSidebar from "@/components/MediaSidebar";
import TypingIndicator from "@/components/TypingIndicator";

// Hooks & Libs
import { Message } from "@/types";
import { socket } from "@/lib/socket";
import { useAuth } from "@/hooks/useAuth";

// Helper
function cn(...inputs: (string | false | null | undefined)[]) {
  return inputs.filter(Boolean).join(" ");
}

export default function ChatPage() {
  const router = useRouter();
  const { user: authUser, loading } = useAuth();

  const currentUser = authUser
    ? {
        uid: authUser.id,
        displayName: authUser.name,
        profilePic: authUser.avatar || null,
      }
    : null;

  // UI states
  const [input, setInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);

  // realtime
  const [isTyping, setIsTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [chats] = useState([
    { id: "other", name: "Shiwani", isGroup: false, status: "Active now" }
  ]);

  const [activeChat, setActiveChat] = useState(chats[0]);

  const [messages, setMessages] = useState<Message[]>([]);

  // 🔐 Redirect if not logged in
  useEffect(() => {
    if (!loading && !authUser) {
      router.push("/auth/login");
    }
  }, [authUser, loading, router]);

  // 🔌 Socket setup
  useEffect(() => {
    if (!currentUser) return;

    if (!socket.connected) socket.connect();

    const handleTyping = () => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);

    socket.on("typing", handleTyping);
    socket.on("stop_typing", handleStopTyping);

    return () => {
      socket.off("typing", handleTyping);
      socket.off("stop_typing", handleStopTyping);
    };
  }, [currentUser]);

  // 📜 Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  // ✍️ Typing handler
  const handleInputChange = (val: string) => {
    setInput(val);

    if (!currentUser) return;

    if (val) {
      socket.emit("typing", { to: activeChat.id });
    } else {
      socket.emit("stop_typing", { to: activeChat.id });
    }
  };

  // 📤 Send message
  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !currentUser) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      text: input,
      timestamp: new Date().toISOString(),
      isMe: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setReplyingTo(null);

    socket.emit("stop_typing", { to: activeChat.id });
  };

  // 📎 File send
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const fileMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      text: file.name,
      timestamp: new Date().toISOString(),
      isMe: true,
    };

    setMessages((prev) => [...prev, fileMessage]);
  };

  if (loading || !currentUser) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading Chat...
      </div>
    );
  }

  return (
    <main className="flex h-screen bg-white dark:bg-slate-950">

      {/* Sidebar */}
      <aside className="w-72 border-r p-4 hidden md:block">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold">Chats</h2>
          <ThemeToggle />
        </div>

        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => setActiveChat(chat)}
            className="p-3 cursor-pointer hover:bg-gray-100 rounded"
          >
            {chat.name}
          </div>
        ))}
      </aside>

      {/* Chat */}
      <section className="flex-1 flex flex-col">

        {/* Header */}
        <header className="p-4 border-b flex justify-between">
          <h2>{activeChat.name}</h2>
          <div className="flex gap-2">
            <Video />
            <Phone />
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {isTyping && <TypingIndicator username={activeChat.name} />}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 flex gap-2 border-t">
          <input
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
            placeholder="Type message..."
          />

          <button type="button" onClick={() => fileInputRef.current?.click()}>
            <Paperclip />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            hidden
            onChange={handleFile}
          />

          <button type="submit">
            <Send />
          </button>
        </form>
      </section>
    </main>
  );
}