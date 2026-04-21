"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Users, Phone, Video, X, Trash2, Reply,
  Settings, Search, UserPlus, Paperclip, File,
  Smile, Gift, MoreVertical, Menu, ChevronDown,
  Mic, ImageIcon, Zap, Edit2, Pin, Star, Forward, Copy,
  Trophy, Coins as CoinsIcon,
  ImagePlay, MessageSquare, ChevronLeft, Archive, Bell, BellOff,
  Shield, LogOut, Moon, Sun, Camera, User
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useFCM }              from "@/hooks/useFCM";
import NotificationToast       from "@/components/NotificationToast"
import {
  collection, doc, addDoc, updateDoc,arrayUnion, getDoc,
  serverTimestamp, Timestamp, increment
} from "firebase/firestore";
import { db } from "@/lib/firebase";

import ChatBubble from "@/components/ChatBubble";
import ProfileModal from "@/components/ProfileModal";
import MediaSidebar from "@/components/MediaSidebar";
import TypingIndicator from "@/components/TypingIndicator";
import CallScreen from "@/components/CallScreen";
import PhoneNumberModal from "@/components/PhoneNumberModal";
import UserSearchModal from "@/components/UserSearchModal";
import CreateGroupModal from "@/components/CreateGroupModal";
import CallHistoryModal from "@/components/CallHistoryModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import GiftPickerModal, { GiftItem } from "@/components/GiftPickerModal";
import LeaderboardModal from "@/components/LeaderboardModal";
import SendCoinsModal from "@/components/SendCoinsModal";
import { SquarePlay } from 'lucide-react';

import { useAuth } from "@/hooks/useAuth";
import { subscribeToUserStatus } from "@/lib/auth";
import { usePresence } from "@/hooks/usePresence";
import { useFriends } from "@/hooks/useFriends";
import { useChats } from "@/hooks/useChats";
import { useMessages } from "@/hooks/useMessages";
import { useCall } from "@/hooks/useCall";
import { useDeliveryStatus } from "@/hooks/useDeliveryStatus";
import { encryptMessage } from "@/lib/encryption";
import GifPicker from "@/components/GifPicker";
import EmojiPicker from "@/components/EmojiPicker";
import { invalidateChatCache } from "@/lib/messageSearch";

import { socket } from "@/lib/socket";
import { ensureDmChat, cn } from "@/lib/chatHelpers";
import { Message, UserProfile } from "@/types";
import { Chat } from "@/types";

// ── STEP 1: Message search imports ───────────────────────────────────────────
import MessageSearchModal from "@/components/MessageSearchModal";

// ── PATCH STEP 1: uploadFile import ──────────────────────────────────────────
import { uploadFile } from "@/lib/uploadFile";

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

  const [open, setOpen] = useState(false);

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
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'calls' | 'status' | 'archived'>('chats');
  const [archivedChats, setArchivedChats] = useState<Set<string>>(new Set());
  const [mutedChats, setMutedChats] = useState<Set<string>>(new Set());
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── STEP 2: Message search state ─────────────────────────────────────────
  const [isMsgSearchOpen, setIsMsgSearchOpen] = useState(false);

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
      if (details.direction === "outgoing") {
         try {
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

  const { notification, clearNotification } = useFCM(
    currentUser?.uid ?? null,
    (chatId) => {
      const target = chats.find((c) => c.id === chatId);
      if (target) setActiveChat(target);
    }
  );

  useEffect(() => {
    if (!loading && !authUser) router.replace("/auth/login");
  }, [authUser, loading, router]);

  useEffect(() => {
    if (!currentUser) return;
    if (!socket.connected) socket.connect();
    socket.emit("user_online", { userId: currentUser.uid });
    
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

  // ── STEP 6: Ctrl+K keyboard shortcut ─────────────────────────────────────
  useEffect(() => {
    const handleGlobalKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsMsgSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

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

  // ── STEP 3: jumpToMessage handler ────────────────────────────────────────
  const jumpToMessage = useCallback(
    (chatId: string, messageId: string) => {
      const targetChat = chats.find((c) => c.id === chatId);
      if (!targetChat) return;
      setActiveChat(targetChat);
      setIsMsgSearchOpen(false);

      const TIMEOUT_MS  = 3000;
      const INTERVAL_MS = 100;
      const deadline    = Date.now() + TIMEOUT_MS;

      const poll = setInterval(() => {
        const el = document.getElementById(`msg-${messageId}`);
        if (el) {
          clearInterval(poll);
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.style.transition   = "box-shadow 0.2s, border-radius 0.2s";
          el.style.boxShadow    = "0 0 0 3px rgba(108,99,255,0.6)";
          el.style.borderRadius = "12px";
          setTimeout(() => {
            el.style.boxShadow    = "";
            el.style.borderRadius = "";
          }, 1800);
        }
        if (Date.now() > deadline) clearInterval(poll);
      }, INTERVAL_MS);
    },
    [chats]
  );

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
      id: chatId, userId: user.uid, name: user.displayName, isGroup: false,
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
        const encryptedText = encryptMessage(text);
        await addDoc(collection(db, "chats", chatId, "messages"), { ...payload, text: encryptedText });
        // ── STEP 4: Invalidate search cache after send ──────────────────
        invalidateChatCache(chatId);
        await updateDoc(doc(db, "chats", chatId), { lastMessage: encryptedText, lastMessageAt: serverTimestamp() });
        socket.emit("send_message", { ...payload, chatId, text: encryptedText });
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
      if (currentDeletedFor.includes(currentUser.uid)) return;
      await updateDoc(ref, { deletedFor: [...currentDeletedFor, currentUser.uid] });
    } catch (err) { console.error(err); }
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
      await updateDoc(ref, {
        starredBy: isStarred
          ? currentStars.filter((id: string) => id !== currentUser.uid)
          : [...currentStars, currentUser.uid]
      });
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

  // ── PATCH STEP 2: Replaced handleFileChange ───────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !activeChat) return;
    e.target.value = "";

    setUploadProgress(0);

    try {
      // Resolve the Firestore chatId first (creates DM doc if needed)
      const chatId = activeChat.isGroup
        ? activeChat.id
        : await ensureDmChat(currentUser.uid, activeChat.id, activeChat.name);

      // uploadFile handles compression → Storage → Firestore-safe text value.
      // The progress callback drives the existing upload progress bar.
      const { firestoreText, preview } = await uploadFile(
        file,
        chatId,
        (pct) => setUploadProgress(pct)
      );

      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId:   currentUser.uid,
        senderName: currentUser.displayName,
        text:       firestoreText,
        timestamp:  serverTimestamp(),
        status:     "sent",
        isDeleted:  false,
        ...(activeChat.isGroup
          ? { groupId: activeChat.id }
          : { receiverId: activeChat.id }),
      });

      await updateDoc(doc(db, "chats", chatId), {
        lastMessage:   preview,
        lastMessageAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("[handleFileChange] Upload failed:", err);
    } finally {
      setTimeout(() => setUploadProgress(null), 400);
    }
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

        // ── PATCH STEP 3: Updated onstop → reader.onloadend ──────────────
        reader.onloadend = async () => {
          if (!currentUser || !activeChat) return;
          const base64Audio = reader.result as string;

          // Wrap the base64 audio in a File so uploadFile can handle it
          const audioBlob = await fetch(base64Audio).then((r) => r.blob());
          const audioFile = new (File as any)([audioBlob], "audio-note.webm", { type: "audio/webm" });

          try {
            const chatId = activeChat.isGroup
              ? activeChat.id
              : await ensureDmChat(currentUser.uid, activeChat.id, activeChat.name);

            const { firestoreText, preview } = await uploadFile(
              audioFile,
              chatId,
              () => {} // no visible progress bar for voice notes
            );

            await addDoc(collection(db, "chats", chatId, "messages"), {
              senderId:   currentUser.uid,
              senderName: currentUser.displayName,
              text:       firestoreText,
              timestamp:  serverTimestamp(),
              status:     "sent",
              isDeleted:  false,
              ...(activeChat.isGroup
                ? { groupId: activeChat.id }
                : { receiverId: activeChat.id }),
            });
            await updateDoc(doc(db, "chats", chatId), {
              lastMessage:   preview,
              lastMessageAt: serverTimestamp(),
            });
          } catch (err) {
            console.error("[voice note upload] failed:", err);
          }
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
      audioChunksRef.current = [];
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
      await updateDoc(doc(db, "users", currentUser.uid), { coins: increment(-gift.cost) });
      const chatId = activeChat?.id;
      const giftText = `🎁 sent a gift: ${gift.emoji} ${gift.label}`;
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.uid, senderName: currentUser.displayName,
        text: giftText, timestamp: serverTimestamp(), status: "sent", isDeleted: false,
        gift: { id: gift.id, emoji: gift.emoji, label: gift.label, cost: gift.cost },
        ...(activeChat.isGroup ? { groupId: activeChat.id } : { receiverId: activeChat.id }),
      });
      // ── STEP 4: Invalidate search cache after gift send ─────────────
      invalidateChatCache(chatId);
      await updateDoc(doc(db, "chats", chatId), { lastMessage: giftText, lastMessageAt: serverTimestamp() });
    } catch (err) { console.error(err); }
  };

  const handleSendCoins = async (amount: number) => {
    if (!activeChat || !currentUser || activeChat.isGroup) return;
    if (myCoins < amount) {
      alert(`Not enough coins! You have ${myCoins} 🪙.`);
      return;
    }
    try {
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
      // ── STEP 4: Invalidate search cache after coin transfer ──────────
      invalidateChatCache(chatId);
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
      // ── STEP 4: Invalidate search cache after GIF send ───────────────
      invalidateChatCache(chatId);
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
    <main className="flex h-screen overflow-hidden relative z-10 pb-16 md:pb-0 bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900">
      {/* Enhanced background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-cyan-900/20 pointer-events-none" />

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
      {showGif && ( <GifPicker onGifClick={(gifUrl: string) => { handleGifSend(gifUrl); setShowGif(false); }} />)}
      <LeaderboardModal isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />
      <SendCoinsModal isOpen={isSendCoinsModalOpen} onClose={() => setIsSendCoinsModalOpen(false)} onSend={handleSendCoins} recipientName={activeChat?.name ?? ""} myCoins={myCoins} />
      <CallHistoryModal isOpen={isCallHistoryOpen} onClose={() => setIsCallHistoryOpen(false)} myUid={currentUser?.uid} />

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
            <div className="relative h-24 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
              <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white"><X size={20} /></button>
              <h2 className="text-white text-xl font-bold">Settings</h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl">
                    <Moon size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium dark:text-white">Dark Mode</span>
                </div>
                <div className="flex items-center">
                  <ThemeToggle />
                </div>
              </div>

              {/* Account Settings */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Account</h3>
                <button
                  onClick={() => { setShowSettings(false); setIsProfileOpen(true); }}
                  className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-xl">
                    <User size={20} className="text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium dark:text-white">Profile</span>
                </button>
              </div>

              {/* Privacy & Security */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Privacy & Security</h3>
                <button className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-xl">
                    <Shield size={20} className="text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-sm font-medium dark:text-white">Privacy Settings</span>
                </button>
                <button className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-xl">
                    <Bell size={20} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-sm font-medium dark:text-white">Notifications</span>
                </button>
              </div>

              {/* Support */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Support</h3>
                <button className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-xl">
                    <MessageSquare size={20} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-sm font-medium dark:text-white">Help & Support</span>
                </button>
              </div>

              {/* Logout */}
              <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                <button className="w-full flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-xl">
                    <LogOut size={20} className="text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="relative h-24 bg-gradient-to-r from-green-600 to-blue-600 flex items-center justify-center">
              <button onClick={() => setShowStatusModal(false)} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white"><X size={20} /></button>
              <h2 className="text-white text-xl font-bold">Status</h2>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center mx-auto mb-4">
                  <Camera size={32} className="text-white" />
                </div>
                <h3 className="text-lg font-bold dark:text-white mb-2">Add Status</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Share what's on your mind</p>
              </div>

              <div className="space-y-3">
                <button className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl">
                    <Camera size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium dark:text-white">Take Photo</span>
                </button>
                <button className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-xl">
                    <ImageIcon size={20} className="text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium dark:text-white">Choose from Gallery</span>
                </button>
                <button className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-xl">
                    <Smile size={20} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-sm font-medium dark:text-white">Text Status</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 7: Message Search Modal ─────────────────────────────────── */}
      {isMsgSearchOpen && (
        <MessageSearchModal
          chats={chats}
          myUid={currentUser.uid}
          onOpen={jumpToMessage}
          onClose={() => setIsMsgSearchOpen(false)}
        />
      )}

      {/* FCM foreground notification toast */}
      {notification && (
        <NotificationToast
          notification={notification}
          onDismiss={clearNotification}
          onOpen={(chatId) => {
            const target = chats.find((c) => c.id === chatId);
            if (target) setActiveChat(target);
            clearNotification();
          }}
        />
      )}

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
              <button onClick={() => handleDeleteForMe(activeMessage.message)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-white/10 text-sm">
                <Trash2 size={16} /> <span className="font-medium">Delete for Me</span>
              </button>
              {activeMessage.message.isMe && (
                <button onClick={() => handleDeleteMessage(activeMessage.message)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-red-500/10 text-red-400 text-sm">
                  <Trash2 size={16} /> <span className="font-medium">Delete for Everyone</span>
                </button>
              )}
              <button onClick={() => handlePinMessage(activeMessage.message)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-white/10 text-sm">
                <Pin size={16} /> <span className="font-medium">Pin to Chat</span>
              </button>
              <button onClick={() => handleStarMessage(activeMessage.message)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-white/10 text-sm">
                <Star size={16} /> <span className="font-medium">Star Message</span>
              </button>
              <button onClick={() => { 
                if (activeChat) {
                  setArchivedChats(prev => new Set([...prev, activeChat.id]));
                  setActiveChat(null);
                  setActiveMessage(null);
                }
              }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-white/10 text-sm">
                <Archive size={16} /> <span className="font-medium">Archive Chat</span>
              </button>
              <button onClick={() => { setActiveMessage(null); }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-white/10 text-sm">
                <Forward size={16} /> <span className="font-medium">Forward</span>
              </button>
              <div className="h-[1px] w-full bg-white/10 my-1"/>
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
      {/* VERTICAL ACTION BAR (WhatsApp Web Style)               */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col w-14 vertical-action-bar">
        <div className="flex-1 flex flex-col items-center py-4 space-y-2">
          {/* Find User */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-white/10 hover:scale-110 active:scale-95 group"
            style={{ color: "var(--text-secondary)" }}
            title="Find user"
          >
            <UserPlus size={20} className="group-hover:text-violet-400 transition-colors" />
          </button>

          {/* Search Messages */}
          <button
            onClick={() => setIsMsgSearchOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-white/10 hover:scale-110 active:scale-95 group"
            style={{ color: "var(--text-secondary)" }}
            title="Search messages (Ctrl+K)"
          >
            <Search size={20} className="group-hover:text-cyan-400 transition-colors" />
          </button>

          {/* Call History */}
          <button
            onClick={() => setIsCallHistoryOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-white/10 hover:scale-110 active:scale-95 group"
            style={{ color: "var(--text-secondary)" }}
            title="Call History"
          >
            <Phone size={20} className="group-hover:text-emerald-400 transition-colors" />
          </button>

          {/* Leaderboard */}
          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-yellow-500/20 hover:scale-110 active:scale-95 group"
            title="Leaderboard"
          >
            <Trophy size={20} className="text-yellow-500 group-hover:text-yellow-300 transition-colors" />
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-white/10 hover:scale-110 active:scale-95 group"
            style={{ color: "var(--text-secondary)" }}
            title="Settings"
          >
            <Settings size={20} className="group-hover:text-pink-400 transition-colors" />
          </button>
        </div>

        {/* Profile at bottom */}
        <div className="p-2 border-t border-white/10">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-white/10 hover:scale-110 active:scale-95"
            title="Profile"
          >
            <Avatar name={currentUser.displayName} size="sm" isOnline src={currentUser.avatar} />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SIDEBAR                                                    */}
      {/* ══════════════════════════════════════════════════════════ */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-white/10 transition-all duration-300 ease-in-out backdrop-blur-xl",
          "fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "bg-gradient-to-b from-slate-900/95 via-purple-900/20 to-slate-900/95",
          sidebarCollapsed ? "w-16" : "w-80"
        )}
      >
        {/* Enhanced sidebar background */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

        {/* ── Sidebar Header ── */}
        <div className="relative px-6 pt-8 pb-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Zap size={18} className="text-white" />
              </div>
              {!sidebarCollapsed && (
                <span className="text-xl font-bold text-gradient" style={{ fontFamily: "var(--font-display)" }}>
                  BlinkChat
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden md:flex w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:bg-white/10 hover:scale-105 active:scale-95"
                style={{ color: "var(--text-secondary)" }}
                title="Toggle sidebar"
              >
                <Menu size={18} />
              </button>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:bg-white/10 hover:scale-105 active:scale-95"
                style={{ color: "var(--text-secondary)" }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Enhanced Mobile Tabs */}
          <div className="md:hidden flex items-center gap-1 p-1.5 bg-gradient-to-r from-white/5 to-white/10 rounded-2xl mb-6 backdrop-blur-sm border border-white/10">
            {[
              { id: 'chats', label: 'Chats', icon: MessageSquare, color: 'text-blue-400' },
              { id: 'status', label: 'Status', icon: Camera, color: 'text-green-400' },
              { id: 'calls', label: 'Calls', icon: Phone, color: 'text-purple-400' }
            ].map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold transition-all duration-200",
                  activeTab === id
                    ? "bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-white shadow-lg shadow-violet-500/25 border border-violet-400/30"
                    : `text-white/60 hover:text-white/80 hover:bg-white/5 ${color} hover:${color.replace('400', '300')}`
                )}
              >
                <Icon size={16} className={activeTab === id ? 'text-white' : ''} />
                {label}
              </button>
            ))}
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

          {/* Archived Chats Toggle */}
          {archivedChats.size > 0 && (
            <div className="px-4 pb-2">
              <button
                onClick={() => setActiveTab(activeTab === 'archived' ? 'chats' : 'archived')}
                className="w-full flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-white/8 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                <Archive size={16} />
                <span className="font-medium">Archived Chats ({archivedChats.size})</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Content Area ── */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* Chats Tab */}
          {activeTab === 'chats' && (
            <>
              {/* Create Group Button - Above Chat List */}
              <div className="px-4 pb-2">
                <button
                  onClick={() => setIsGroupModalOpen(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/8 border-2 border-dashed"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
                    <Users size={18} className="text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Create New Group</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Start a group conversation</p>
                  </div>
                </button>
              </div>

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
                const isArchived = archivedChats.has(chat.id);
                const isMuted = mutedChats.has(chat.id);

                if (isArchived) return null; // Don't show archived chats in main list

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
                        <div className="flex items-center gap-1">
                          {isMuted && <BellOff size={12} style={{ color: "var(--text-muted)" }} />}
                          <span className="text-[10px] shrink-0 ml-1" style={{ color: "var(--text-muted)" }}>
                            {chat.lastMessageAt instanceof Timestamp
                              ? chat.lastMessageAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : ""}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {chat.lastMessage || "Say hello 👋"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Status Tab */}
          {activeTab === 'status' && (
            <div className="px-4 py-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <Avatar name={currentUser?.displayName || ""} size="lg" src={currentUser?.avatar} />
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900"
                  >
                    <Camera size={12} className="text-white" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>My Status</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Tap to add status update</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Recent Updates</p>
                {friends.slice(0, 5).map((friend) => (
                  <div key={friend.uid} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                    <Avatar name={friend.displayName} size="md" src={friend.avatar} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{friend.displayName}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>2 hours ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Archived Tab */}
          {activeTab === 'archived' && (
            <>
              <div className="px-4 pb-2">
                <button
                  onClick={() => setActiveTab('chats')}
                  className="flex items-center gap-2 text-sm font-medium mb-4"
                  style={{ color: "var(--accent-2)" }}
                >
                  <ChevronLeft size={16} />
                  Back to Chats
                </button>
                <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Archived Chats</h3>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Chats you've archived</p>
              </div>

              {filteredChats.filter(chat => archivedChats.has(chat.id)).length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-400/20 to-gray-500/20 flex items-center justify-center mb-3">
                    <Archive size={22} style={{ color: "var(--text-muted)" }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No archived chats</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Archive chats to keep them organized</p>
                </div>
              )}

              {filteredChats.filter(chat => archivedChats.has(chat.id)).map((chat) => {
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setArchivedChats(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(chat.id);
                          return newSet;
                        });
                      }}
                      className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                      title="Unarchive"
                    >
                      <Archive size={14} style={{ color: "var(--text-muted)" }} />
                    </button>
                  </div>
                );
              })}
            </>
          )}
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

      {notification && (
        <NotificationToast
          notification={notification}
          onDismiss={clearNotification}
          onOpen={(chatId) => {
            const target = chats.find((c) => c.id === chatId);
            if (target) setActiveChat(target);
            clearNotification();
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* VERTICAL ACTION BAR (WhatsApp Web Style)               */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col w-14 vertical-action-bar">
        <div className="flex-1 flex flex-col items-center py-4 space-y-2">
          {/* Find User */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-white/10 hover:scale-110 active:scale-95 group"
            style={{ color: "var(--text-secondary)" }}
            title="Find user"
          >
            <UserPlus size={20} className="group-hover:text-violet-400 transition-colors" />
          </button>

          {/* Search Messages */}
          <button
            onClick={() => setIsMsgSearchOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-white/10 hover:scale-110 active:scale-95 group"
            style={{ color: "var(--text-secondary)" }}
            title="Search messages (Ctrl+K)"
          >
            <Search size={20} className="group-hover:text-cyan-400 transition-colors" />
          </button>

          {/* Call History */}
          <button
            onClick={() => setIsCallHistoryOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-white/10 hover:scale-110 active:scale-95 group"
            style={{ color: "var(--text-secondary)" }}
            title="Call History"
          >
            <Phone size={20} className="group-hover:text-emerald-400 transition-colors" />
          </button>

          {/* Leaderboard */}
          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-yellow-500/20 hover:scale-110 active:scale-95 group"
            title="Leaderboard"
          >
            <Trophy size={20} className="text-yellow-500 group-hover:text-yellow-300 transition-colors" />
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-white/10 hover:scale-110 active:scale-95 group"
            style={{ color: "var(--text-secondary)" }}
            title="Settings"
          >
            <Settings size={20} className="group-hover:text-pink-400 transition-colors" />
          </button>
        </div>

        {/* Profile at bottom */}
        <div className="p-2 border-t border-white/10">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-white/10 hover:scale-110 active:scale-95"
            title="Profile"
          >
            <Avatar name={currentUser.displayName} size="sm" isOnline src={currentUser.avatar} />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* CHAT PANEL                                                 */}
      {/* ══════════════════════════════════════════════════════════ */}
      <section className="flex-1 flex flex-col h-full min-w-0" style={{ background: "var(--bg-deep)" }}>

        {/* ── Enhanced Chat Header ── */}
        <header
          className="shrink-0 px-4 sm:px-6 py-4 flex items-center justify-between backdrop-blur-xl bg-gradient-to-r from-slate-900/90 via-purple-900/20 to-slate-900/90 border-b border-white/10"
          style={{ minHeight: 76 }}
        >
          {activeChat ? (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
                style={{ color: "var(--text-secondary)" }}
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setIsMediaOpen(true)}>
                <Avatar name={activeChat.name} size="md" isGroup={activeChat.isGroup} isOnline={activeChatIsOnline} />
                <div className="min-w-0">
                  <h2 className="font-bold leading-tight text-white group-hover:text-violet-300 transition-colors" style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>
                    {activeChat.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    {activeChatIsOnline && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
                    )}
                    <span className="text-xs font-medium" style={{ color: activeChatIsOnline ? "#34d399" : "var(--text-muted)" }}>
                      {activeChatStatus}
                    </span>
                    {activePeerPhone && (
                      <span className="text-xs text-white/50">
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

          <div className="absolute inset-0 opacity-[0.015] z-0"
            style={{ backgroundImage: "radial-gradient(circle, #6c63ff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="relative h-full overflow-y-auto px-3 sm:px-5 py-4 sm:py-6 space-y-0.5"
          >
            {messages.length === 0 && activeChat && (
              <div className="flex flex-col items-center justify-center h-full py-24 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center shadow-2xl backdrop-blur-xl border border-white/10"
                    style={{ boxShadow: "0 0 60px rgba(108,99,255,0.2)" }}>
                    <span className="text-5xl animate-bounce">💬</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                    <span className="text-lg">✨</span>
                  </div>
                </div>
                <p className="font-bold text-xl mb-2 text-white" style={{ fontFamily: "var(--font-display)" }}>
                  Start the conversation
                </p>
                <p className="text-base text-white/60 max-w-xs leading-relaxed">
                  Send a message to {activeChat.name} and begin your chat journey!
                </p>
                <div className="mt-6 flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: '0s' }} />
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}

            {messages.map((msg, index) => {
              if (msg.deletedFor?.includes(currentUser.uid)) {
                return null;
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
                month: 'short', day: 'numeric', year: 'numeric'
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
                  <div className={cn("flex flex-col w-full mb-0.5", msg.isMe ? "items-end animate-msg-right" : "items-start animate-msg-left")}>
                    {activeChat?.isGroup && !msg.isMe && (
                      <span className="text-[10px] font-bold uppercase tracking-wider mb-0.5 ml-1"
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

          {showScrollBtn && (
            <button onClick={scrollToBottom}
              className="scroll-btn absolute bottom-5 right-5 z-30 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all active:scale-90">
              <ChevronDown size={20} />
            </button>
          )}
        </div>

        {showEmoji && (
          <div className="absolute bottom-24 left-2 sm:left-5 z-50 picker-slide-up max-w-[calc(100vw-16px)]">
            <EmojiPicker
              theme="dark"
              onEmojiClick={(emoji) => {
                setInput((prev) => prev + emoji);
                setShowEmoji(false);
              }}
            />
          </div>
        )}

        {/* ── Enhanced Input Bar ── */}
        <div className="shrink-0 px-4 sm:px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 sm:pt-4 bg-gradient-to-t from-slate-900/95 via-purple-900/10 to-transparent backdrop-blur-sm border-t border-white/10">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

          {replyingTo && (
            <div className="mb-3 px-5 py-3 rounded-2xl flex items-center justify-between gap-4 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-400/20 backdrop-blur-sm">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-violet-300 mb-1">
                  Replying to {replyingTo.senderName}
                </p>
                <p className="text-sm truncate text-white/80">{replyingTo.text}</p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className={cn("flex items-center gap-3 p-3 rounded-3xl border-2 transition-all duration-200",
            replyingTo && "rounded-tl-none rounded-tr-none border-t-0",
            "bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-xl border-white/20 hover:border-violet-400/30 focus-within:border-violet-400/50 focus-within:shadow-lg focus-within:shadow-violet-500/20")}
          >

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
                {/* Always visible: Attach + Emoji */}
                <button type="button" onClick={() => fileInputRef.current?.click()} title="Attach file"
                  className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:bg-white/8 active:scale-90 shrink-0"
                  style={{ color: "var(--text-muted)" }}>
                  <Paperclip size={19} />
                </button>
                <button type="button" onClick={() => setShowEmoji(prev => !prev)} title="Emoji"
                  className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:bg-white/8 active:scale-90 shrink-0"
                  style={{ color: "var(--text-muted)" }}>
                  <Smile size={19} />
                </button>
                {/* Hidden on small screens: GIF, Gift, Coins */}
                <button type="button" onClick={() => setShowGif(prev => !prev)} title="GIF"
                  className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl transition-all hover:bg-white/8 active:scale-90 shrink-0"
                  style={{ color: "var(--text-muted)" }}>
                  <ImagePlay size={19} />
                </button>
                <button type="button" onClick={() => { setIsMediaOpen(false); setIsGiftModalOpen(true); }} title="Gift"
                  className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl transition-all hover:bg-white/8 active:scale-90 shrink-0"
                  style={{ color: "var(--text-muted)" }}>
                  <Gift size={19} />
                </button>
                <button type="button"
                  onClick={() => { !activeChat?.isGroup && setIsSendCoinsModalOpen(true); }}
                  title={activeChat?.isGroup ? "Cannot send coins in group" : "Send Coins"}
                  className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl transition-all hover:bg-white/8 active:scale-90 shrink-0"
                  style={{ color: "var(--text-muted)" }}>
                  <CoinsIcon size={19} className="text-yellow-500" />
                </button>
                {/* Mobile-only: More button that opens media sidebar for extra actions */}
                <button type="button" onClick={() => setIsMediaOpen(true)} title="More actions"
                  className="flex sm:hidden w-9 h-9 items-center justify-center rounded-xl transition-all hover:bg-white/8 active:scale-90 shrink-0"
                  style={{ color: "var(--text-muted)" }}>
                  <MoreVertical size={19} />
                </button>

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