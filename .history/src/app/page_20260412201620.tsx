"use client";

// ✅ SAME IMPORTS (unchanged)
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Users, Phone, Video, X, Trash2, Reply,
  Settings, Search, UserPlus, Paperclip, File,
  Smile, Gift, MoreVertical, Menu,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { collection, doc, addDoc, updateDoc, getDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

import ChatBubble from "@/components/ChatBubble";
import { ThemeToggle } from "@/components/ThemeToggle";
import ChatEmojiPicker from "@/components/EmojiPicker";
import GifPicker from "@/components/GifPicker";
import ProfileModal from "@/components/ProfileModal";
import MediaSidebar from "@/components/MediaSidebar";
import TypingIndicator from "@/components/TypingIndicator";
import CallScreen from "@/components/CallScreen";
import PhoneNumberModal from "@/components/PhoneNumberModal";
import UserSearchModal from "@/components/UserSearchModal";
import CreateGroupModal from "@/components/CreateGroupModal";
import GiftPickerModal, { GiftItem } from "@/components/GiftPickerModal";

import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { useFriends } from "@/hooks/useFriends";
import { useChats } from "@/hooks/useChats";
import { useMessages } from "@/hooks/useMessages";
import { useCall } from "@/hooks/useCall";

import { socket } from "@/lib/socket";
import { ensureDmChat, cn } from "@/lib/chatHelpers";
import { Message, UserProfile } from "@/types";
import { Chat } from "@/types";

export default function ChatPage() {
  const router = useRouter();
  const { user: authUser, loading } = useAuth();

  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [giftAnimation, setGiftAnimation] = useState<{ emoji: string; label: string } | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false); // ✅ NEW

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const currentUser = authUser
    ? {
        uid: authUser.id,
        displayName: authUser.name,
        avatar: (authUser as any).avatar ?? (authUser as any).avatar ?? null,
      }
    : null;

  usePresence(currentUser);

  const { friends, onlineStatusMap, myPhone } = useFriends(currentUser?.uid ?? null);
  const chats = useChats(currentUser?.uid ?? null, onlineStatusMap);
  const messages = useMessages(activeChat?.id ?? null, currentUser?.uid ?? null);

  const {
    callState, activeCall, isMuted, isCameraOff,
    startCall, acceptCall, endCall, toggleMute, toggleCamera,
  } = useCall({
    myUid: currentUser?.uid ?? "",
    myName: currentUser?.displayName ?? "",
    myPhone,
    localVideoRef,
    remoteVideoRef,
  });

  // ✅ SEEN LOGIC
  useEffect(() => {
    if (!activeChat || !currentUser || messages.length === 0) return;

    const markSeen = async () => {
      for (const msg of messages) {
        if (msg.senderId !== currentUser.uid && msg.status !== "seen") {
          await updateDoc(doc(db, "chats", activeChat.id, "messages", msg.id), {
            status: "seen",
          });
        }
      }
    };

    markSeen();
  }, [messages, activeChat?.id, currentUser?.uid]);

  // ✅ DELIVERY SOCKET
  useEffect(() => {
    const handler = async (data: any) => {
      if (!activeChat) return;
      await updateDoc(
        doc(db, "chats", activeChat.id, "messages", data.messageId),
        { status: "delivered" }
      );
    };
    socket.on("message_delivered", handler);
    return () => socket.off("message_delivered", handler);
  }, [activeChat?.id]);

  // ✅ SMOOTH SCROLL
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isOtherUserTyping]);

  // ✅ SCROLL BUTTON
  useEffect(() => {
    const div = scrollRef.current;
    if (!div) return;

    const handleScroll = () => {
      const nearBottom =
        div.scrollHeight - div.scrollTop - div.clientHeight < 100;
      setShowScrollBtn(!nearBottom);
    };

    div.addEventListener("scroll", handleScroll);
    return () => div.removeEventListener("scroll", handleScroll);
  }, []);

  const handleInputChange = (val: string) => {
    setInput(val);

    if (!currentUser || !activeChat) return;

    if (val.trim().length > 0) {
      socket.emit("typing", { from: currentUser.uid, to: activeChat.id });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing", { from: currentUser.uid, to: activeChat.id });
      }, 1500);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading BlinkChat…
      </div>
    );
  }

  return (
    <main className="flex h-screen">

      {/* ✅ CHAT AREA */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative p-4">
        
        {/* ✅ MESSAGES */}
        {messages.map((msg, index) => {
          const prev = messages[index - 1];
          const showAvatar = !prev || prev.senderId !== msg.senderId;

          return (
            <ChatBubble
              key={msg.id}
              message={msg}
              showAvatar={showAvatar}
              onReply={(m) => setReplyingTo(m)}
              onActionMenu={setActiveMessage}
            />
          );
        })}

        {/* ✅ SCROLL BUTTON */}
        {showScrollBtn && (
          <button
            onClick={() =>
              scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
              })
            }
            className="absolute bottom-20 right-4 bg-blue-600 text-white p-2 rounded-full"
          >
            ↓
          </button>
        )}
      </div>

      {/* ✅ INPUT */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        className="p-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}
          className="flex-1 border p-2 rounded"
        />

        <button className="bg-blue-600 text-white px-4 rounded">
          Send
        </button>
      </form>
    </main>
  );
}