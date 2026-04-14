"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Users, Phone, Video, X, Trash2, Reply,
  Settings, Search, UserPlus, Paperclip, File,
  Smile, Gift, MoreVertical, Menu, ChevronDown,
  Mic, ImageIcon, Zap, Edit2, Pin, Star, Forward, Copy,
  Trophy, Coins as CoinsIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  collection, doc, addDoc, updateDoc,arrayUnion, getDoc,
  serverTimestamp, Timestamp, increment
} from "firebase/firestore";
import { db } from "@/lib/firebase";

import ChatBubble from "@/components/ChatBubble";
import ChatEmojiPicker from "@/components/EmojiPicker";
import GifPicker from "@/components/GifPicker";
import ProfileModal from "@/components/ProfileModal";
import MediaSidebar from "@/components/MediaSidebar";
import TypingIndicator from "@/components/TypingIndicator";
import CallScreen from "@/components/CallScreen";
import PhoneNumberModal from "@/components/PhoneNumberModal";
import UserSearchModal from "@/components/UserSearchModal";
import CreateGroupModal from "@/components/CreateGroupModal";
import CallHistoryModal from "@/components/CallHistoryModal";
import GiftPickerModal, { GiftItem } from "@/components/GiftPickerModal";
import LeaderboardModal from "@/components/LeaderboardModal";
import SendCoinsModal from "@/components/SendCoinsModal";

import { useAuth } from "@/hooks/useAuth";
import { subscribeToUserStatus } from "@/lib/auth";
import { usePresence } from "@/hooks/usePresence";
import { useFriends } from "@/hooks/useFriends";
import { useChats } from "@/hooks/useChats";
import { useMessages } from "@/hooks/useMessages";
import { useCall } from "@/hooks/useCall";
import { useDeliveryStatus } from "@/hooks/useDeliveryStatus";

import { socket } from "@/lib/socket";
import { ensureDmChat, cn } from "@/lib/chatHelpers";
import { Message, UserProfile } from "@/types";
import { Chat } from "@/types";

// ── Avatar component ──────────────────────────────────────────────────────
function Avatar({
  name,
  size = "md",
  isGroup = false,
  isOnline = false,
  src,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  isGroup?: boolean;
  isOnline?: boolean;
  src?: string | null;
}) {
  const sz = { sm: "w-9 h-9 text-xs", md: "w-11 h-11 text-sm", lg: "w-14 h-14 text-base" }[size];
  const dotSz = { sm: "w-2.5 h-2.5", md: "w-3 h-3", lg: "w-3.5 h-3.5" }[size];

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const gradients = [
    "from-violet-500 to-cyan-500",
    "from-pink-500 to-orange-400",
    "from-emerald-400 to-teal-600",
    "from-blue-500 to-indigo-600",
    "from-rose-400 to-pink-600",
  ];
  const grad = gradients[name.charCodeAt(0) % gradients.length];

  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          sz,
          "rounded-full flex items-center justify-center font-bold text-white shadow-lg overflow-hidden",
          isGroup ? "bg-gradient-to-br from-orange-400 to-rose-500" : `bg-gradient-to-br ${grad}`
        )}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : isGroup ? (
          <Users size={size === "sm" ? 14 : size === "lg" ? 22 : 18} />
        ) : (
          initials
        )}
      </div>
      {isOnline && (
        <span
          className={cn(
            dotSz,
            "absolute bottom-0 right-0 bg-emerald-400 rounded-full border-2 border-[#07080f] pulse-online"
          )}
        />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function ChatPage() {
  const router = useRouter();
  const { user: authUser, loading } = useAuth();

  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [activeMessage, setActiveMessage] = useState<{ message: Message; x: number; y: number } | null>(null);
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
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isSendCoinsModalOpen, setIsSendCoinsModalOpen] = useState(false);
  const [isCallHistoryOpen, setIsCallHistoryOpen] = useState(false);
  const [giftAnimation, setGiftAnimation] = useState<{ emoji: string; label: string } | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [myCoins, setMyCoins] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const userScrolledUpRef = useRef(false);
  const prevMsgCountRef = useRef(0);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  const currentActiveChat = activeChat ? chats.find(c => c.id === activeChat.id) || activeChat : null;
  const messages = useMessages(activeChat?.id ?? null, currentUser?.uid ?? null);
  useDeliveryStatus(activeChat?.id ?? null, currentUser?.uid ?? null);

  const {
    callState, activeCall, isMuted, isCameraOff,
    startCall, acceptCall, endCall, toggleMute, toggleCamera,
  } = useCall({
    myUid: currentUser?.uid ?? "",
    myName: currentUser?.displayName ?? "",
    myPhone,
    localVideoRef: localVideoRef as React.RefObject<HTMLVideoElement>,
    remoteVideoRef: remoteVideoRef as React.RefObject<HTMLVideoElement>,
    onCallEnded: async (details) => {
      if (!currentUser) return;
      // Only the caller logs it to prevent duplicate entries
      if (details.direction === "outgoing") {
         try {
           // 1. Log to generic "calls" collection for Call History
           await addDoc(collection(db, "calls"), {
             members: [currentUser.uid, details.peerId],
             callerId: currentUser.uid,
             callerName: currentUser.displayName,
             receiverId: details.peerId,
             receiverName: details.peerName,
             duration: details.duration,
             isVideo: details.isVideo,
             status: details.status,
             timestamp: serverTimestamp()
           });

           // 2. Insert into the actual Chat Thread
           const chatId = activeChat?.id;
           if (!chatId) return;
           const typeStr = details.isVideo ? "Video" : "Voice";
           const callText = `📞 ${typeStr} Call ${details.status === "completed" ? "Ended" : details.status}`;
           
           await addDoc(collection(db, "chats", chatId, "messages"), {
             senderId: currentUser.uid,
             senderName: currentUser.displayName,
             text: callText,
             timestamp: serverTimestamp(),
             status: "sent",
             isDeleted: false,
             callLog: {
               duration: details.duration,
               isVideo: details.isVideo,
               status: details.status
             },
             receiverId: details.peerId,
           });
           await updateDoc(doc(db, "chats", chatId), { lastMessage: callText, lastMessageAt: serverTimestamp() });

         } catch (err) {
           console.error("Failed to log call history:", err);
         }
      }
    }
  });

  useEffect(() => {
    if (!activeChat && chats.length > 0) setActiveChat(chats[0]);
  }, [chats, activeChat]);

  useEffect(() => {
    if (!loading && !authUser) router.replace("/auth/login");
  }, [authUser, loading, router]);

  useEffect(() => {
    if (!currentUser) return;
    if (!socket.connected) socket.connect();
    socket.emit("user_online", { userId: currentUser.uid });
    
    // Subscribe to coins
    const unsub = subscribeToUserStatus(currentUser.uid, (data) => {
      setMyCoins(data?.coins ?? 0);
    });

    return () => { 
      socket.emit("user_offline", { userId: currentUser.uid }); 
      unsub();
    };
  }, [currentUser?.uid]); // eslint-disable-line

  useEffect(() => {
    if (!currentUser || !activeChat) return;
    const onTyping = (d: { from: string; to: string }) => {
      if (d.to === currentUser.uid || d.to === activeChat.id) setIsOtherUserTyping(true);
    };
    const onStop = (d: { from: string; to: string }) => {
      if (d.to === currentUser.uid || d.to === activeChat.id) setIsOtherUserTyping(false);
    };
    socket.on("typing", onTyping);
    socket.on("stop_typing", onStop);
    return () => { socket.off("typing", onTyping); socket.off("stop_typing", onStop); };
  }, [currentUser?.uid, activeChat?.id]); // eslint-disable-line

  useEffect(() => {
    userScrolledUpRef.current = false;
    prevMsgCountRef.current = 0;
    setShowScrollBtn(false);
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeChat?.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNew = messages.length > prevMsgCountRef.current;
    prevMsgCountRef.current = messages.length;
    if (!isNew) return;
    const lastMsg = messages[messages.length - 1];
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (lastMsg?.isMe || isNearBottom || !userScrolledUpRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      userScrolledUpRef.current = false;
      setShowScrollBtn(false);
    } else {
      setShowScrollBtn(true);
    }
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || userScrolledUpRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [showEmoji, showGif, replyingTo, uploadProgress, isOtherUserTyping]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (dist > 150) { userScrolledUpRef.current = true; setShowScrollBtn(true); }
    else { userScrolledUpRef.current = false; setShowScrollBtn(false); }
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    userScrolledUpRef.current = false;
    setShowScrollBtn(false);
  }, []);

  const savePhoneNumber = useCallback(async (phone: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid), { phoneNumber: phone });
      socket.emit("profile_updated", { userId: currentUser.uid, phoneNumber: phone });
    } catch (err) { console.error(err); }
  }, [currentUser?.uid]); // eslint-disable-line

  const handleStartChatWithUser = useCallback(async (user: UserProfile) => {
    if (!currentUser) return;
    const chatId = await ensureDmChat(currentUser.uid, user.uid, user.displayName);
    setActiveChat({
      id: chatId,userId: user.uid, name: user.displayName, isGroup: false,
      lastMessage: "", status: user.isOnline ? "Active now" : "Offline",
      isOnline: user.isOnline, members: [currentUser.uid, user.uid],
    });
  }, [currentUser?.uid]); // eslint-disable-line

  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !currentUser || !activeChat) return;
    const text = input.trim();
    setInput(""); setShowEmoji(false);
    const pendingReply = replyingTo; setReplyingTo(null);
    const pendingEdit = editingMessage; setEditingMessage(null);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit("stop_typing", { from: currentUser.uid, to: activeChat.id });
    userScrolledUpRef.current = false; setShowScrollBtn(false);
    
    try {
      const chatId = activeChat.id;

      if (pendingEdit) {
        await updateDoc(doc(db, "chats", chatId, "messages", pendingEdit.id), {
          text, isEdited: true
        });
        if (activeChat.lastMessage === pendingEdit.text) {
           await updateDoc(doc(db, "chats", chatId), { lastMessage: text });
        }
      } else {
        const payload: Record<string, any> = {
          senderId: currentUser.uid, senderName: currentUser.displayName,
          text, timestamp: serverTimestamp(), status: "sent", isDeleted: false,
          ...(activeChat.isGroup ? { groupId: activeChat.id } : { receiverId: activeChat.id }),
          ...(pendingReply ? { replyTo: { id: pendingReply.id, text: pendingReply.text, senderName: pendingReply.senderName } } : {}),
        };
        await addDoc(collection(db, "chats", chatId, "messages"), payload);
        await updateDoc(doc(db, "chats", chatId), { lastMessage: text, lastMessageAt: serverTimestamp() });
        socket.emit("send_message", { ...payload, chatId });
      }
    } catch (err) { console.error(err); }
  }, [input, currentUser?.uid, activeChat?.id, replyingTo, editingMessage]); // eslint-disable-line

  const handleDeleteMessage = useCallback(async (msg: Message) => {
    if (!activeChat) return;
    try { await updateDoc(doc(db, "chats", activeChat.id, "messages", msg.id), { isDeleted: true, text: "" }); }
    catch (err) { console.error(err); }
    setActiveMessage(null);
  }, [activeChat?.id]); // eslint-disable-line

  const handleDeleteForMe = useCallback(async (msg: Message) => {
  if (!activeChat || !currentUser) return;

  try {
    const ref = doc(db, "chats", activeChat.id, "messages", msg.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const currentDeletedFor = snap.data().deletedFor || [];

    // prevent duplicate entry
    if (currentDeletedFor.includes(currentUser.uid)) return;

    await updateDoc(ref, {
      deletedFor: [...currentDeletedFor, currentUser.uid],
    });

  } catch (err) {
    console.error(err);
  }

  setActiveMessage(null);
}, [activeChat?.id, currentUser?.uid]);

  const handlePinMessage = async (msg: Message) => {
    if (!activeChat) return;
    try {
      await updateDoc(doc(db, "chats", activeChat.id), {
        pinnedMessage: { id: msg.id, text: msg.text, senderName: msg.senderName }
      });
    } catch(err) { console.error(err); }
    setActiveMessage(null);
  };

  const handleUnpinMessage = async () => {
    if (!activeChat) return;
    try { await updateDoc(doc(db, "chats", activeChat.id), { pinnedMessage: null }); } 
    catch(err) { console.error(err); }
  };

  const handleStarMessage = async (msg: Message) => {
    if (!activeChat || !currentUser) return;
    try {
      const ref = doc(db, "chats", activeChat.id, "messages", msg.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const currentStars = snap.data().starredBy ?? [];
      const isStarred = currentStars.includes(currentUser.uid);
      const newStars = isStarred 
        ? currentStars.filter((id: string) => id !== currentUser.uid)
        : [...currentStars, currentUser.uid];
      await updateDoc(ref, { starredBy: newStars });
    } catch(err) { console.error(err); }
    setActiveMessage(null);
  };

  const handleReaction = useCallback(async (emoji: string) => {
    if (!activeMessage || !currentUser || !activeChat) return;
    const ref = doc(db, "chats", activeChat.id, "messages", activeMessage.message.id);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const cur: Record<string, string[]> = snap.data().reactions ?? {};
      const users = cur[emoji] ?? [];
      await updateDoc(ref, {
        reactions: { ...cur, [emoji]: users.includes(currentUser.uid) ? users.filter(u => u !== currentUser.uid) : [...users, currentUser.uid] },
      });
    } catch (err) { console.error(err); }
    setActiveMessage(null);
  }, [activeMessage?.message?.id, currentUser?.uid, activeChat?.id]); // eslint-disable-line

  const handleQuickReact = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser || !activeChat) return;
    const ref = doc(db, "chats", activeChat.id, "messages", messageId);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const cur: Record<string, string[]> = snap.data().reactions ?? {};
      const users = cur[emoji] ?? [];
      await updateDoc(ref, {
        reactions: { ...cur, [emoji]: users.includes(currentUser.uid) ? users.filter(u => u !== currentUser.uid) : [...users, currentUser.uid] },
      });
    } catch (err) { console.error(err); }
  }, [currentUser?.uid, activeChat?.id]);

  const handleCreateGroup = useCallback(async (data: { name: string; members: string[] }) => {
    if (!currentUser) return;
    try {
      const ref = await addDoc(collection(db, "chats"), {
        isGroup: true, name: data.name, members: data.members,
        lastMessage: "Group created", lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(), createdBy: currentUser.uid,
      });
      socket.emit("create_group", { id: ref.id, name: data.name, members: data.members, isGroup: true });
    } catch (err) { console.error(err); }
    setIsGroupModalOpen(false);
  }, [currentUser?.uid]); // eslint-disable-line

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !activeChat) return;
    e.target.value = "";

    setUploadProgress(0);
    // Simulate upload delay
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setUploadProgress(progress);
    }, 150);

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      clearInterval(interval);
      setUploadProgress(100);
      const base64Str = reader.result as string;
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      const fileType = isImage ? "image" : isPdf ? "pdf" : "file";

      try {
        const chatId = activeChat.id;
        await addDoc(collection(db, "chats", chatId, "messages"), {
          senderId: currentUser.uid, senderName: currentUser.displayName,
          text: `FILE::${file.name}::${base64Str}`,
          timestamp: serverTimestamp(), status: "sent", isDeleted: false,
          ...(activeChat.isGroup ? { groupId: activeChat.id } : { receiverId: activeChat.id }),
        });
        const msgPreview = isImage ? "📷 Photo" : isPdf ? "📄 PDF" : `📄 ${file.name}`;
        await updateDoc(doc(db, "chats", chatId), { lastMessage: msgPreview, lastMessageAt: serverTimestamp() });
      } catch (err) { console.error(err); }

      setTimeout(() => setUploadProgress(null), 300);
    };

    reader.onerror = () => {
      console.error("Failed to read file");
      clearInterval(interval);
      setUploadProgress(null);
    };
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) return;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (!currentUser || !activeChat) return;
          try {
            const chatId = activeChat.id;
            await addDoc(collection(db, "chats", chatId, "messages"), {
              senderId: currentUser.uid, senderName: currentUser.displayName,
              text: `FILE::Audio Note::${base64Audio}`,
              timestamp: serverTimestamp(), status: "sent", isDeleted: false,
              ...(activeChat.isGroup ? { groupId: activeChat.id } : { receiverId: activeChat.id }),
            });
            await updateDoc(doc(db, "chats", chatId), { lastMessage: "🎤 Audio Note", lastMessageAt: serverTimestamp() });
          } catch (err) { console.error(err); }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone permission denied or err:", err);
      alert("Microphone permission is required to send voice notes.");
    }
  };

  const stopRecordingAndSend = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      setRecordingTime(0);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      audioChunksRef.current = []; // Dump data
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      setRecordingTime(0);
    }
  };

  const handleGiftSend = async (gift: GiftItem) => {
    if (!activeChat || !currentUser) return;
    if (myCoins < gift.cost) {
      alert(`Not enough coins! You need ${gift.cost} 🪙 but only have ${myCoins} 🪙.`);
      return;
    }
    setGiftAnimation({ emoji: gift.emoji, label: gift.label });
    setTimeout(() => setGiftAnimation(null), 2500);
    try {
      // Burn coins from sender
      await updateDoc(doc(db, "users", currentUser.uid), {
        coins: increment(-gift.cost)
      });

      const chatId = activeChat?.id;
      const giftText = `🎁 sent a gift: ${gift.emoji} ${gift.label}`;
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.uid, senderName: currentUser.displayName,
        text: giftText, timestamp: serverTimestamp(), status: "sent", isDeleted: false,
        gift: { id: gift.id, emoji: gift.emoji, label: gift.label, cost: gift.cost },
        ...(activeChat.isGroup ? { groupId: activeChat.id } : { receiverId: activeChat.id }),
      });
      await updateDoc(doc(db, "chats", chatId), { lastMessage: giftText, lastMessageAt: serverTimestamp() });
    } catch (err) { console.error(err); }
  };

  const handleSendCoins = async (amount: number) => {
    if (!activeChat || !currentUser || activeChat.isGroup) return; // Only DMs for direct coins transfer
    if (myCoins < amount) {
      alert(`Not enough coins! You have ${myCoins} 🪙.`);
      return;
    }
    try {
      // Deduct from sender, give to receiver
      await updateDoc(doc(db, "users", currentUser.uid), { coins: increment(-amount) });
      await updateDoc(doc(db, "users", activeChat.id), { coins: increment(amount) });

      const chatId = activeChat.id;
      const coinText = `🪙 Transferred ${amount} coins`;
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.uid, senderName: currentUser.displayName,
        text: coinText, timestamp: serverTimestamp(), status: "sent", isDeleted: false,
        coinTransfer: { amount },
        receiverId: activeChat.id,
      });
      await updateDoc(doc(db, "chats", chatId), { lastMessage: coinText, lastMessageAt: serverTimestamp() });
    } catch (err) { console.error(err); }
  };

  const handleGifSend = async (url: string) => {
    if (!currentUser || !activeChat) return;
    setShowGif(false);
    try {
      const chatId = activeChat.id;
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.uid, senderName: currentUser.displayName,
        text: url, timestamp: serverTimestamp(), status: "sent", isDeleted: false,
        ...(activeChat.isGroup ? { groupId: activeChat.id } : { receiverId: activeChat.id }),
      });
      await updateDoc(doc(db, "chats", chatId), { lastMessage: "🎞️ GIF", lastMessageAt: serverTimestamp() });
    } catch (err) { console.error(err); }
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    if (!currentUser || !activeChat) return;
    if (val.length > 0) {
      socket.emit("typing", { from: currentUser.uid, to: activeChat.id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(
        () => socket.emit("stop_typing", { from: currentUser.uid, to: activeChat.id }), 2000
      );
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit("stop_typing", { from: currentUser.uid, to: activeChat.id });
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  }, [handleSendMessage]);

  const activePeerPhone = activeChat && !activeChat.isGroup
    ? friends.find(f => f.uid === activeChat.id)?.phoneNumber ?? null : null;
  const activeChatIsOnline = !!activeChat && !activeChat.isGroup && !!onlineStatusMap[activeChat.id];
  const activeChatStatus = !activeChat ? "" : activeChat.isGroup ? "Group chat" : activeChatIsOnline ? "Active now" : "Offline";
  const canCall = !!activeChat && !activeChat.isGroup && callState === "idle";
  const filteredChats = chats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading || !currentUser) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-gradient" style={{ fontFamily: "var(--font-display)" }}>
            BlinkChat
          </span>
        </div>
        <div className="flex gap-2">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    );
  }

  return (
    <main className="flex h-screen overflow-hidden relative z-10">

      {/* ── Call Screen ── */}
      {callState !== "idle" && (
        <CallScreen
          callState={callState} activeCall={activeCall}
          localVideoRef={localVideoRef as React.RefObject<HTMLVideoElement>}
          remoteVideoRef={remoteVideoRef as React.RefObject<HTMLVideoElement>}
          isMuted={isMuted} isCameraOff={isCameraOff}
          onAccept={acceptCall} onDecline={() => endCall("decline")}
          onEnd={() => endCall("end")} onToggleMute={toggleMute} onToggleCamera={toggleCamera}
        />
      )}

      <MediaSidebar isOpen={isMediaOpen} onClose={() => setIsMediaOpen(false)} messages={messages} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      {isPhoneModalOpen && <PhoneNumberModal currentPhone={myPhone} onSave={savePhoneNumber} onClose={() => setIsPhoneModalOpen(false)} />}
      {isSearchModalOpen && <UserSearchModal myUid={currentUser.uid} onStartChat={handleStartChatWithUser} onClose={() => setIsSearchModalOpen(false)} />}
      {isGroupModalOpen && <CreateGroupModal friends={friends} currentUser={currentUser} onClose={() => setIsGroupModalOpen(false)} onCreate={handleCreateGroup} />}
      <GiftPickerModal isOpen={isGiftModalOpen} onClose={() => setIsGiftModalOpen(false)} onSend={handleGiftSend} recipientName={activeChat?.name ?? ""} />
      <LeaderboardModal isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />
      <SendCoinsModal isOpen={isSendCoinsModalOpen} onClose={() => setIsSendCoinsModalOpen(false)} onSend={handleSendCoins} recipientName={activeChat?.name ?? ""} myCoins={myCoins} />
      <CallHistoryModal isOpen={isCallHistoryOpen} onClose={() => setIsCallHistoryOpen(false)} myUid={currentUser?.uid} />

      {/* Gift animation */}
      {giftAnimation && (
        <div className="fixed inset-0 z-[130] pointer-events-none flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 animate-bounce">
            <span className="text-9xl drop-shadow-2xl">{giftAnimation.emoji}</span>
            <span className="text-white font-bold text-xl glass px-6 py-2 rounded-full">
              {giftAnimation.label} sent! 🎉
            </span>
          </div>
        </div>
      )}

      {/* Dynamic Context Menu */}
      {activeMessage && (
        <div className="fixed inset-0 z-[110]" 
          onClick={() => setActiveMessage(null)} 
          onContextMenu={e => { e.preventDefault(); setActiveMessage(null) }}>
          <div className="absolute glass-card rounded-2xl w-56 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-100"
            style={{ 
              top: Math.min(activeMessage.y, window.innerHeight - 300), 
              left: Math.min(activeMessage.x, window.innerWidth - 250),
              boxShadow: "0 4px 30px rgba(0,0,0,0.5)" 
            }}
            onClick={e => e.stopPropagation()}>
            <div className="p-1.5 space-y-0.5">
              <button onClick={() => { setReplyingTo(activeMessage.message); setActiveMessage(null); }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-white/10 text-sm">
                <Reply size={16} /> <span className="font-medium">Reply</span>
              </button>

              {/* Delete for Me */}
              <button onClick={() => handleDeleteForMe(activeMessage.message)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-white/10 text-sm">
                <Trash2 size={16} /> <span className="font-medium">Delete for Me</span>
              </button>

              {/* Delete for Everyone */}
              {activeMessage.message.isMe && (
                <button onClick={() => handleDeleteMessage(activeMessage.message)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-red-500/10 text-red-400 text-sm">
                  <Trash2 size={16} /> <span className="font-medium">Delete for Everyone</span>
                </button>
              )}
              
              {/* Pin Message */}
              <button onClick={() => handlePinMessage(activeMessage.message)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-white/10 text-sm">
                <Pin size={16} /> <span className="font-medium">Pin to Chat</span>
              </button>

              {/* Star Message */}
              <button onClick={() => handleStarMessage(activeMessage.message)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-white/10 text-sm">
                <Star size={16} /> <span className="font-medium">Star Message</span>
              </button>

              {/* Forward Message */}
              <button onClick={() => { setActiveMessage(null); }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-white/10 text-sm">
                <Forward size={16} /> <span className="font-medium">Forward</span>
              </button>

              <div className="h-[1px] w-full bg-white/10 my-1"/>

              {/* Delete */}
              {activeMessage.message.isMe && (
                <button onClick={() => handleDeleteMessage(activeMessage.message)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-red-500/10 text-red-400 text-sm">
                  <Trash2 size={16} /> <span className="font-medium">Delete for Everyone</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SIDEBAR                                                    */}
      {/* ══════════════════════════════════════════════════════════ */}
      <aside
        className={cn(
          "w-[300px] flex flex-col border-r transition-transform duration-300 ease-in-out",
          "fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{ background: "var(--bg-panel)", borderColor: "var(--border)" }}
      >
        {/* ── Sidebar Header ── */}
        <div className="px-5 pt-6 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <Zap size={16} className="text-white" />
              </div>
              <span className="text-lg font-bold text-gradient" style={{ fontFamily: "var(--font-display)" }}>
                BlinkChat
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsSearchModalOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors hover:bg-white/8"
                style={{ color: "var(--text-secondary)" }} title="Find user">
                <Search size={16} />
              </button>
              <button onClick={() => setIsCallHistoryOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors hover:bg-white/8"
                style={{ color: "var(--text-secondary)" }} title="Call History">
                <Phone size={16} />
              </button>
              <button onClick={() => setIsLeaderboardOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors hover:bg-white/8"
                style={{ color: "var(--accent-2)" }} title="Leaderboard">
                <Trophy size={16} className="text-yellow-500" />
              </button>
              <button onClick={() => setIsGroupModalOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors hover:bg-white/8"
                style={{ color: "var(--text-secondary)" }} title="Create group">
                <UserPlus size={16} />
              </button>
              <button onClick={() => setIsSidebarOpen(false)}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl transition-colors hover:bg-white/8"
                style={{ color: "var(--text-secondary)" }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative input-glow rounded-xl border transition-all" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations…"
              className="w-full bg-transparent pl-9 pr-4 py-2.5 text-sm outline-none"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
            />
          </div>
        </div>

        {/* ── Chat List ── */}
        <div className="flex-1 overflow-y-auto py-2">
          {filteredChats.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mb-3">
                <Users size={22} style={{ color: "var(--accent-1)" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No chats yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Search for users to start chatting</p>
            </div>
          )}
          {filteredChats.map((chat) => {
            const online = !chat.isGroup && !!onlineStatusMap[chat.id];
            const isActive = activeChat?.id === chat.id;
            return (
              <div
                key={chat.id}
                onClick={() => { setActiveChat(chat); setIsSidebarOpen(false); }}
                className={cn("chat-row flex items-center gap-3 px-4 py-3 cursor-pointer mx-2 rounded-xl", isActive && "chat-row-active")}
              >
                <Avatar name={chat.name} size="md" isGroup={chat.isGroup} isOnline={online} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                      {chat.name}
                    </h3>
                    <span className="text-[10px] shrink-0 ml-1" style={{ color: "var(--text-muted)" }}>
                      {chat.lastMessageAt instanceof Timestamp
                        ? chat.lastMessageAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : ""}
                    </span>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {chat.lastMessage || "Say hello 👋"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Me footer ── */}
        <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div
            className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors hover:bg-white/5"
            onClick={() => setIsProfileOpen(true)}
          >
            <Avatar name={currentUser.displayName} size="sm" isOnline src={currentUser.avatar} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                {currentUser.displayName}
              </p>
              <button
                onClick={e => { e.stopPropagation(); setIsPhoneModalOpen(true); }}
                className="text-[10px] font-medium transition-colors hover:opacity-80"
                style={{ color: "var(--accent-2)" }}
              >
                {myPhone || "+ Add phone number"}
              </button>
            </div>
            <Settings size={14} style={{ color: "var(--text-muted)" }} />
          </div>
          <p className="text-[9px] font-mono px-2.5 mt-1 truncate select-all" style={{ color: "var(--text-muted)" }}>
            {currentUser.uid}
          </p>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* CHAT PANEL                                                 */}
      {/* ══════════════════════════════════════════════════════════ */}
      <section className="flex-1 flex flex-col h-full min-w-0" style={{ background: "var(--bg-deep)" }}>

        {/* ── Chat Header ── */}
        <header
          className="shrink-0 px-5 py-3.5 flex items-center justify-between glass"
          style={{ borderBottom: "1px solid var(--border)", minHeight: 68 }}
        >
          {activeChat ? (
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/8 transition-colors"
                style={{ color: "var(--text-secondary)" }}>
                <Menu size={18} />
              </button>
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsMediaOpen(true)}>
                <Avatar
                  name={activeChat.name}
                  size="md"
                  isGroup={activeChat.isGroup}
                  isOnline={activeChatIsOnline}
                />
                <div>
                  <h2 className="font-bold leading-tight" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)", fontSize: 15 }}>
                    {activeChat.name}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    {activeChatIsOnline && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    )}
                    <span className="text-[11px]" style={{ color: activeChatIsOnline ? "#34d399" : "var(--text-muted)" }}>
                      {activeChatStatus}
                    </span>
                    {activePeerPhone && (
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        · {activePeerPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/8 transition-colors"
                style={{ color: "var(--text-secondary)" }}>
                <Menu size={18} />
              </button>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Select a conversation</p>
            </div>
          )}

          <div className="flex items-center gap-1">
            {[
              { icon: Phone, action: () => activeChat && !activeChat.isGroup && startCall(activeChat.id, activeChat.name, activePeerPhone ?? undefined, false), disabled: !canCall, color: "hover:text-emerald-400" },
              { icon: ImageIcon, action: () => { setShowGif(!showGif); setShowEmoji(false); },  title: "GIF" 
  },
              { icon: Video, action: () => activeChat && !activeChat.isGroup && startCall(activeChat.id, activeChat.name, activePeerPhone ?? undefined, true), disabled: !canCall, color: "hover:text-blue-400" },
              { icon: Search, action: () => { }, disabled: false, color: "hover:text-violet-400" },
              { icon: MoreVertical, action: () => setIsMediaOpen(true), disabled: false, color: "hover:text-violet-400" },
            ].map(({ icon: Icon, action, disabled, color }, i) => (
              <button key={i} onClick={action} disabled={disabled}
                className={cn("w-9 h-9 flex items-center justify-center rounded-xl transition-all", color, disabled ? "opacity-25 cursor-not-allowed" : "hover:bg-white/8 active:scale-95")}
                style={{ color: "var(--text-secondary)" }}>
                <Icon size={18} />
              </button>
            ))}
          </div>
        </header>

        {/* ── Messages ── */}
        <div className="flex-1 relative overflow-hidden">
          {/* Pinned Message Banner */}
          {currentActiveChat?.pinnedMessage && (
            <div className="absolute top-0 left-0 right-0 z-20 bg-black/40 backdrop-blur-xl px-5 py-2.5 flex items-center justify-between shadow-sm cursor-pointer hover:bg-white/5 transition-colors border-b border-white/10"
                 onClick={() => {
                   const el = document.getElementById(`msg-${currentActiveChat.pinnedMessage?.id}`);
                   if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                 }}>
              <div className="flex items-center gap-3 overflow-hidden">
                <Pin size={16} className="text-violet-400 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">{currentActiveChat.pinnedMessage.senderName}</span>
                  <span className="text-xs text-white/80 truncate font-medium">{currentActiveChat.pinnedMessage.text}</span>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleUnpinMessage(); }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0 text-white/50 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Subtle chat background pattern */}
          <div className="absolute inset-0 opacity-[0.015] z-0"
            style={{ backgroundImage: "radial-gradient(circle, #6c63ff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="relative h-full overflow-y-auto px-5 py-6 space-y-1"
          >
            {/* Empty state */}
            {messages.length === 0 && activeChat && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mb-4 shadow-lg"
                  style={{ boxShadow: "0 0 40px rgba(108,99,255,0.15)" }}>
                  <span className="text-3xl">💬</span>
                </div>
                <p className="font-semibold mb-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-display)" }}>
                  Start the conversation
                </p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Say hi to {activeChat.name}!
                </p>
              </div>
            )}

           {messages.map((msg, index) => {

  // ✅ NEW LOGIC (persistent delete for me)
              if (msg.deletedFor?.includes(currentUser.uid)) {
                return null; // completely hide
              }

              const prevMsg = messages[index - 1];
              const getValidDate = (m: any) => m?.timestamp?.toDate ? m.timestamp.toDate() : new Date();
              const curDate = getValidDate(msg);
              const prevDate = prevMsg ? getValidDate(prevMsg) : new Date(0);

              const isSameDay = (d1: Date, d2: Date) =>
                d1.getFullYear() === d2.getFullYear() &&
                d1.getMonth() === d2.getMonth() &&
                d1.getDate() === d2.getDate();

              const showDivider = !prevMsg || !isSameDay(curDate, prevDate);

              let dateText = curDate.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              const today = new Date();
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);

              if (isSameDay(curDate, today)) dateText = "Today";
              else if (isSameDay(curDate, yesterday)) dateText = "Yesterday";

              return (
                <div key={msg.id} id={`msg-${msg.id}`}>
                  {showDivider && (
                    <div className="flex justify-center my-4 sticky top-2 z-[5] pointer-events-none">
                      <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/5 drop-shadow-md text-white/80">
                        {dateText}
                      </span>
                    </div>
                  )}

                  <div className={cn("flex flex-col mb-1", msg.isMe ? "animate-msg-right" : "animate-msg-left")}>
                    {activeChat?.isGroup && !msg.isMe && (
                      <span className="text-[10px] font-bold uppercase tracking-wider mb-1 ml-1"
                        style={{ color: "var(--accent-2)" }}>
                        {msg.senderName}
                      </span>
                    )}

                    <ChatBubble
                      message={msg}
                      onReply={(m: Message) => setReplyingTo(m)}
                      onActionMenu={setActiveMessage}
                      onReact={handleQuickReact}
                    />
                  </div>
                </div>
              );
            })}            

            {isOtherUserTyping && activeChat && (
              <div className="flex items-center gap-3 mb-2">
                <Avatar name={activeChat.name} size="sm" isGroup={activeChat.isGroup} />
                <div className="glass-card rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}

            {uploadProgress !== null && (
              <div className="flex justify-end mb-2">
                <div className="glass-card p-3 rounded-2xl w-52">
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon size={14} style={{ color: "var(--accent-1)" }} className="animate-pulse" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      Uploading…
                    </span>
                    <span className="text-[11px] ml-auto" style={{ color: "var(--accent-2)" }}>{uploadProgress}%</span>
                  </div>
                  <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%`, background: "var(--grad-accent)" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <button onClick={scrollToBottom}
              className="scroll-btn absolute bottom-5 right-5 z-30 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all active:scale-90">
              <ChevronDown size={20} />
            </button>
          )}
        </div>

        {/* ── Input Bar ── */}
        <div className="shrink-0 px-5 pb-5 pt-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-panel)" }}>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

          {/* Reply preview */}
          {replyingTo && (
            <div className="mb-2 px-4 py-2.5 rounded-xl flex items-center justify-between gap-3"
              style={{ background: "var(--bg-elevated)", borderLeft: "3px solid var(--accent-1)" }}>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--accent-2)" }}>
                  Replying to {replyingTo.senderName}
                </p>
                <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{replyingTo.text}</p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="shrink-0 transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* Emoji / GIF pickers */}
          {showEmoji && (
            <div className="absolute bottom-24 left-5 z-[100]">
              <ChatEmojiPicker onEmojiClick={(e: any) => handleInputChange(input + e)} theme="dark" />
            </div>
          )}
          {showGif && (
            <div className="absolute bottom-24 left-32 z-[100]">
              <GifPicker onGifClick={handleGifSend} />
            </div>
          )}

          {/* Input row */}
          <div className={cn("flex items-center gap-2 p-2 rounded-2xl border input-glow transition-all",
            replyingTo && "rounded-tl-none rounded-tr-none border-t-0")}
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>

            {isRecording ? (
              <div className="flex items-center flex-1 py-1 px-3 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-3 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <span className="text-red-400 font-mono tracking-widest font-medium">
                  {Math.floor(recordingTime / 60).toString().padStart(2, "0")}:
                  {(recordingTime % 60).toString().padStart(2, "0")}
                </span>
                <span className="ml-3 text-xs opacity-60 typing-dot">Recording</span>
                <div className="flex-1" />
                <button onClick={cancelRecording} className="text-gray-400 hover:text-red-400 mr-4 transition-colors p-2" title="Cancel">
                  <Trash2 size={20} />
                </button>
                <button onClick={stopRecordingAndSend} className="w-10 h-10 flex items-center justify-center rounded-xl text-white bg-red-500 hover:bg-red-600 transition-all active:scale-90 shadow-lg shadow-red-500/30">
                  <Send size={18} />
                </button>
              </div>
            ) : (
              <>
                {/* Tool buttons */}
                {[
                  { icon: Paperclip, action: () => fileInputRef.current?.click(), title: "Attach file" },
                  { icon: Smile, action: () => { setShowEmoji(!showEmoji); setShowGif(false); }, title: "Emoji" },
                  { icon: Gift, action: () => { setShowEmoji(false); setIsGiftModalOpen(true); }, title: "Gift" },
                  { icon: CoinsIcon, action: () => { !activeChat?.isGroup && setIsSendCoinsModalOpen(true); }, title: activeChat?.isGroup ? "Cannot send coins in group" : "Send Coins" },
                ].map(({ icon: Icon, action, title }) => (
                  <button key={title} type="button" onClick={action} title={title}
                    className={cn(
                      "w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:bg-white/8 active:scale-90",
                      title === "Cannot send coins in group" && "opacity-30 cursor-not-allowed"
                     )}
                    style={{ color: "var(--text-muted)" }}>
                    <Icon size={20} className={title === "Send Coins" ? "text-yellow-500" : ""} />
                  </button>
                ))}

                <input
                  type="text"
                  value={input}
                  onChange={e => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={activeChat ? "Write a message…" : "Select a chat to start"}
                  disabled={!activeChat}
                  className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                />

                {/* Send / Mic Button */}
                {input.trim() ? (
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!activeChat}
                    className="btn-send w-10 h-10 flex items-center justify-center rounded-xl text-white transition-all active:scale-90"
                    style={{ background: "var(--grad-accent)" }}
                  >
                    <Send size={17} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    disabled={!activeChat}
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-white transition-all hover:bg-white/10 active:scale-90"
                    style={{ background: "var(--bg-surface)" }}
                  >
                    <Mic size={18} style={{ color: "var(--text-secondary)" }} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}