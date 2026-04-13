"use client";

/* ================== IMPORTS ================== */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Users, Phone, Video, X, Trash2, Reply,
  Settings, Search, UserPlus, Paperclip, Smile,
  Gift, MoreVertical, Menu, ChevronDown,
  ImageIcon, Zap
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  collection, doc, addDoc, updateDoc, getDoc,
  serverTimestamp, Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/* COMPONENTS */
import ChatBubble from "@/components/ChatBubble";
import ChatEmojiPicker from "@/components/EmojiPicker";
import GifPicker from "@/components/GifPicker";
import ProfileModal from "@/components/ProfileModal";
import MediaSidebar from "@/components/MediaSidebar";
import CallScreen from "@/components/CallScreen";
import PhoneNumberModal from "@/components/PhoneNumberModal";
import UserSearchModal from "@/components/UserSearchModal";
import CreateGroupModal from "@/components/CreateGroupModal";
import GiftPickerModal, { GiftItem } from "@/components/GiftPickerModal";

/* HOOKS */
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { useFriends } from "@/hooks/useFriends";
import { useChats } from "@/hooks/useChats";
import { useMessages } from "@/hooks/useMessages";
import { useCall } from "@/hooks/useCall";
import { useDeliveryStatus } from "@/hooks/useDeliveryStatus";

/* UTILS */
import { socket } from "@/lib/socket";
import { ensureDmChat, cn } from "@/lib/chatHelpers";
import { Message, UserProfile } from "@/types";
import { Chat } from "@/types";

/* ================== AVATAR ================== */
function Avatar({ name, isOnline, src }: any) {
  const initials = name?.slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg">
        {src ? (
          <img src={src} className="w-full h-full rounded-full object-cover" />
        ) : (
          initials
        )}
      </div>

      {isOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-black animate-pulse" />
      )}
    </div>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const { user: authUser, loading } = useAuth();

  const [input, setInput] = useState("");
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  const currentUser = authUser
    ? {
        uid: authUser.id,
        displayName: authUser.name,
      }
    : null;

  /* HOOKS */
  usePresence(currentUser);
  const { friends, onlineStatusMap } = useFriends(currentUser?.uid ?? null);
  const chats = useChats(currentUser?.uid ?? null, onlineStatusMap);
  const messages = useMessages(activeChat?.id ?? null, currentUser?.uid ?? null);

  useDeliveryStatus(activeChat?.id ?? null, currentUser?.uid ?? null);

  const { callState, startCall } = useCall({
    myUid: currentUser?.uid ?? "",
    myName: currentUser?.displayName ?? "",
  });


  useEffect(() => {
    if (!loading && !authUser) router.replace("/auth/login");
  }, [authUser, loading]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  /* SEND MESSAGE */
  const handleSend = async () => {
    if (!input.trim() || !activeChat || !currentUser) return;

    const chatId = await ensureDmChat(
      currentUser.uid,
      activeChat.id,
      activeChat.name
    );

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: input,
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      timestamp: serverTimestamp(),
      isDeleted: false,
    });

    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: input,
      lastMessageAt: serverTimestamp(),
    });

    setInput("");
    setShowEmoji(false);
  };

  const filteredChats = chats.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || !currentUser) {
    return (
      <div className="h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <main className="flex h-screen bg-[#0b0c10] text-white">

      {/* SIDEBAR */}
      <aside className="w-[300px] border-r border-white/10 flex flex-col">

        <div className="p-4 flex justify-between items-center">
          <h1 className="font-bold text-lg flex items-center gap-2">
            <Zap size={18}/> BlinkChat
          </h1>

          <button onClick={() => setIsSidebarOpen(false)}>
            <X />
          </button>
        </div>

        <div className="px-3 pb-3">
          <input
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 rounded-lg outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.map(chat => (
            <div
              key={chat.id}
              onClick={() => setActiveChat(chat)}
              className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer"
            >
              <Avatar name={chat.name} />
              <div>
                <p className="font-semibold">{chat.name}</p>
                <p className="text-xs text-gray-400">
                  {chat.lastMessage}
                </p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* CHAT PANEL */}
      <section className="flex-1 flex flex-col">

        {/* HEADER */}
        <div className="p-4 border-b border-white/10 flex justify-between">
          {activeChat ? activeChat.name : "Select Chat"}

          <div className="flex gap-3">
            <Phone onClick={() => startCall(activeChat?.id)} />
            <Video />
          </div>
        </div>

        {/* MESSAGES */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-2"
        >
          {messages.map(msg => (
            <ChatBubble
              key={msg.id}
              message={msg}
              onReply={setReplyingTo}
            />
          ))}
        </div>

        {/* INPUT */}
        <div className="p-4 border-t border-white/10">

          {showEmoji && (
            <ChatEmojiPicker
              onEmojiClick={(e:any)=>setInput(input+e)}
              theme="dark"
            />
          )}

          <div className="flex gap-2 items-center">

            <button onClick={()=>setShowEmoji(!showEmoji)}>
              <Smile />
            </button>

            <button onClick={()=>setShowGif(!showGif)}>
              GIF
            </button>

            <input
              value={input}
              onChange={e=>setInput(e.target.value)}
              className="flex-1 px-3 py-2 bg-white/5 rounded-lg outline-none"
              placeholder="Type message..."
            />

            <button
              onClick={handleSend}
              className="bg-gradient-to-r from-violet-500 to-cyan-500 p-2 rounded-lg"
            >
              <Send />
            </button>

          </div>
        </div>
      </section>
    </main>
  );
}