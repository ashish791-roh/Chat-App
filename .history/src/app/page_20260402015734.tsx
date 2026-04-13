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
import { subscribeToUserStatus } from "@/lib/auth";

function cn(...inputs: (string | false | null | undefined)[]) {
  return inputs.filter(Boolean).join(" ");
}

const CreateGroupModal = ({ friends, currentUser, onClose, onCreate }: any) => {
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleMember = (id: string) =>
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );

  const handleSubmit = () => {
    if (!groupName || selectedIds.length === 0) return;
    onCreate({ name: groupName, members: [...selectedIds, currentUser.uid] });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6">Create Group</h2>

        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Group name"
          className="w-full p-3 rounded-xl mb-4 bg-gray-100 dark:bg-slate-800"
        />

        {friends.map((f: any) => (
          <div key={f.uid} onClick={() => toggleMember(f.uid)} className="p-2 cursor-pointer">
            {f.displayName}
          </div>
        ))}

        <button onClick={handleSubmit} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl">
          Create
        </button>
      </div>
    </div>
  );
};

export default function ChatPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [userStatus, setUserStatus] = useState<any>(null);

  // UI
  const [input, setInput] = useState("");
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const friends = [
    { uid: "other", displayName: "Shiwani" },
    { uid: "2", displayName: "Tanvi" }
  ];

  const chats = [
    { id: "other", name: "Shiwani", isGroup: false, status: "offline" }
  ];

  // ✅ AUTH FIX (NO LOOP)
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login");
    }
  }, [user, loading]);

  // ✅ USER STATUS (REAL-TIME)
  useEffect(() => {
    if (!activeChat?.id) return;

    const unsub = subscribeToUserStatus(activeChat.id, setUserStatus);
    return () => unsub();
  }, [activeChat?.id]);

  // ✅ SOCKET FIX (NO LOOP)
  useEffect(() => {
    if (!socket.connected) socket.connect();

    return () => {
      socket.off("typing");
      socket.off("stop_typing");
    };
  }, []);

  // ✅ AUTO SCROLL
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages]);

  // ✅ SEND MESSAGE
  const handleSend = (e: any) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const msg: Message = {
      id: Date.now().toString(),
      senderId: user.id,
      senderName: user.name,
      text: input,
      timestamp: new Date().toISOString(),
      isMe: true,
      status: "sent"
    };

    setMessages(prev => [...prev, msg]);
    setInput("");
  };

  if (loading || !user) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  const currentUser = {
    uid: user.id,
    displayName: user.name,
    avatar: user.avatar
  };

  return (
    <main className="flex h-screen">

      {/* SIDEBAR */}
      <aside className="w-80 border-r p-4">
        {chats.map(chat => (
          <div key={chat.id} onClick={() => setActiveChat(chat)} className="p-3 cursor-pointer">
            {chat.name}
          </div>
        ))}
      </aside>

      {/* CHAT */}
      <section className="flex-1 flex flex-col">

        {/* HEADER */}
        {activeChat && (
          <div className="p-4 border-b flex justify-between">
            <div>
              <h2>{activeChat.name}</h2>
              <p className="text-xs text-gray-400">
                {userStatus?.isOnline
                  ? "Online"
                  : userStatus?.lastSeen
                    ? `Last seen ${new Date(userStatus.lastSeen.seconds * 1000).toLocaleTimeString()}`
                    : "Offline"}
              </p>
            </div>
          </div>
        )}

        {/* MESSAGES */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {messages.map(msg => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
        </div>

        {/* INPUT */}
        <form onSubmit={handleSend} className="p-4 flex gap-2 border-t">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-2 bg-gray-100 rounded-xl"
            placeholder="Type message..."
          />
          <button className="bg-blue-600 text-white px-4 rounded-xl">
            <Send size={18} />
          </button>
        </form>

      </section>
    </main>
  );
}