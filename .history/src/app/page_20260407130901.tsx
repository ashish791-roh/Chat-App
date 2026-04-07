"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Users, Phone, Video, X, Trash2, Reply,
  Settings, Search, UserPlus, Paperclip, File,
  Smile, Gift, MoreVertical, Menu, ArrowLeft,
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
import GiftPickerModal, { GiftItem, GIFTS } from "@/components/GiftPickerModal";

import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { useFriends } from "@/hooks/useFriends";
import { useChats } from "@/hooks/useChats";
import { useMessages } from "@/hooks/useMessages";
import { useCall } from "@/hooks/useCall";

import { socket } from "@/lib/socket";
import { ensureDmChat, cn } from "@/lib/chatHelpers";
import { Chat, Message, UserProfile } from "@/types/chat";

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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const currentUser = authUser
    ? {
        uid: authUser.id,
        displayName: authUser.name,
        profilePic: (authUser as any).avatar ?? (authUser as any).profilePic ?? null,
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
    localVideoRef: localVideoRef as React.RefObject<HTMLVideoElement>,
    remoteVideoRef: remoteVideoRef as React.RefObject<HTMLVideoElement>,
  });

  useEffect(() => {
    if (!activeChat && chats.length > 0) setActiveChat(chats[0]);
  }, [chats, activeChat]);
  
  useEffect(() => {
    if (!loading && !authUser) router.replace("/auth/login");
  }, [authUser, loading, router]);
  
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, showEmoji, showGif, replyingTo, uploadProgress, isOtherUserTyping]);

  useEffect(() => {
    if (!currentUser) return;
    if (!socket.connected) socket.connect();
    socket.emit("user_online", { userId: currentUser.uid });
    return () => { socket.emit("user_offline", { userId: currentUser.uid }); };
  }, [currentUser?.uid]); 

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
  }, [currentUser?.uid, activeChat?.id]); 

  const { user, loading } = useAuth();

   if (loading) return <div>Loading...</div>;

  const savePhoneNumber = useCallback(async (phone: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid), { phoneNumber: phone });
      socket.emit("profile_updated", { userId: currentUser.uid, phoneNumber: phone });
    } catch (err) { console.error("Phone save failed:", err); }
  }, [currentUser?.uid]); 

  const handleStartChatWithUser = useCallback(async (user: UserProfile) => {
    if (!currentUser) return;
    const chatId = await ensureDmChat(currentUser.uid, user.uid, user.displayName);
    setActiveChat({
      id: chatId, name: user.displayName, isGroup: false,
      lastMessage: "", status: user.isOnline ? "Active now" : "Offline",
      isOnline: user.isOnline, members: [currentUser.uid, user.uid],
    });
  }, [currentUser?.uid]);

  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !currentUser || !activeChat) return;
    const text = input.trim();
    setInput(""); setShowEmoji(false);
    const pendingReply = replyingTo; setReplyingTo(null);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit("stop_typing", { from: currentUser.uid, to: activeChat.id });
    try {
      const chatId = activeChat.isGroup
        ? activeChat.id
        : await ensureDmChat(currentUser.uid, activeChat.id, activeChat.name);
      const payload: Record<string, any> = {
        senderId: currentUser.uid, senderName: currentUser.displayName,
        text, timestamp: serverTimestamp(), status: "sent", isDeleted: false,
        ...(activeChat.isGroup ? { groupId: activeChat.id } : { receiverId: activeChat.id }),
        ...(pendingReply ? { replyTo: { id: pendingReply.id, text: pendingReply.text, senderName: pendingReply.senderName } } : {}),
      };
      await addDoc(collection(db, "chats", chatId, "messages"), payload);
      await updateDoc(doc(db, "chats", chatId), { lastMessage: text, lastMessageAt: serverTimestamp() });
      socket.emit("send_message", { ...payload, chatId });
    } catch (err) { console.error("Send failed:", err); }
  }, [input, currentUser?.uid, activeChat?.id, replyingTo]); 

  const handleDeleteMessage = useCallback(async (msg: Message) => {
    if (!activeChat) return;
    try {
      await updateDoc(doc(db, "chats", activeChat.id, "messages", msg.id), { isDeleted: true, text: "" });
    } catch (err) { console.error("Delete failed:", err); }
    setActiveMessage(null);
  }, [activeChat?.id]); 
  
  const handleReaction = useCallback(async (emoji: string) => {
    if (!activeMessage || !currentUser || !activeChat) return;
    const ref = doc(db, "chats", activeChat.id, "messages", activeMessage.id);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const cur: Record<string, string[]> = snap.data().reactions ?? {};
      const users = cur[emoji] ?? [];
      await updateDoc(ref, {
        reactions: { ...cur, [emoji]: users.includes(currentUser.uid) ? users.filter(u => u !== currentUser.uid) : [...users, currentUser.uid] },
      });
    } catch (err) { console.error("Reaction failed:", err); }
    setActiveMessage(null);
  }, [activeMessage?.id, currentUser?.uid, activeChat?.id]); 
  const handleCreateGroup = useCallback(async (data: { name: string; members: string[] }) => {
    if (!currentUser) return;
    try {
      const ref = await addDoc(collection(db, "chats"), {
        isGroup: true, name: data.name, members: data.members,
        lastMessage: "Group created", lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(), createdBy: currentUser.uid,
      });
      socket.emit("create_group", { id: ref.id, name: data.name, members: data.members, isGroup: true });
    } catch (err) { console.error("Create group failed:", err); }
    setIsGroupModalOpen(false);
  }, [currentUser?.uid]); // eslint-disable-line

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !activeChat) return;
    e.target.value = "";
    setUploadProgress(0);
    let progress = 0;
    const interval = setInterval(async () => {
      progress += 20; setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        const isImage = file.type.startsWith("image/");
        const text = isImage ? URL.createObjectURL(file) : `📄 ${file.name}`;
        try {
          const chatId = activeChat.isGroup ? activeChat.id : await ensureDmChat(currentUser.uid, activeChat.id, activeChat.name);
          await addDoc(collection(db, "chats", chatId, "messages"), {
            senderId: currentUser.uid, senderName: currentUser.displayName,
            text, timestamp: serverTimestamp(), status: "sent", isDeleted: false,
            ...(activeChat.isGroup ? { groupId: activeChat.id } : { receiverId: activeChat.id }),
          });
          await updateDoc(doc(db, "chats", chatId), { lastMessage: isImage ? "📷 Photo" : `📄 ${file.name}`, lastMessageAt: serverTimestamp() });
        } catch (err) { console.error("File send failed:", err); }
        setUploadProgress(null);
      }
    }, 150);
  };

  const handleGiftSend = async (gift: GiftItem) => {

    if (!activeChat || !currentUser) return;
    setGiftAnimation({ emoji: gift.emoji, label: gift.label });
    setTimeout(() => setGiftAnimation(null), 2500);
    try {
      const chatId = activeChat?.isGroup ? activeChat.id : await ensureDmChat(currentUser.uid, activeChat.id, activeChat.name);
      const giftText = `🎁 sent a gift: ${gift.emoji} ${gift.label}`;
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.uid, senderName: currentUser.displayName,
        text: giftText, timestamp: serverTimestamp(), status: "sent", isDeleted: false,
        gift: { id: gift.id, emoji: gift.emoji, label: gift.label, cost: gift.cost },
        ...(activeChat.isGroup ? { groupId: activeChat.id } : { receiverId: activeChat.id }),
      });
      await updateDoc(doc(db, "chats", chatId), { lastMessage: giftText, lastMessageAt: serverTimestamp() });
    } catch (err) { console.error("Gift send failed:", err); }
  };

  const handleGifSend = async (url: string) => {
    if (!currentUser || !activeChat) return;
    setShowGif(false);
    try {
      const chatId = activeChat.isGroup ? activeChat.id : await ensureDmChat(currentUser.uid, activeChat.id, activeChat.name);
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.uid, senderName: currentUser.displayName,
        text: url, timestamp: serverTimestamp(), status: "sent", isDeleted: false,
        ...(activeChat.isGroup ? { groupId: activeChat.id } : { receiverId: activeChat.id }),
      });
      await updateDoc(doc(db, "chats", chatId), { lastMessage: "🎞️ GIF", lastMessageAt: serverTimestamp() });
    } catch (err) { console.error("GIF send failed:", err); }
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    if (!currentUser || !activeChat) return;
    if (val.length > 0) {
      socket.emit("typing", { from: currentUser.uid, to: activeChat.id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => socket.emit("stop_typing", { from: currentUser.uid, to: activeChat.id }), 2000);
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit("stop_typing", { from: currentUser.uid, to: activeChat.id });
    }
  };

  const activePeerPhone = activeChat && !activeChat.isGroup
    ? friends.find(f => f.uid === activeChat.id)?.phoneNumber ?? null : null;
  const activeChatIsOnline = !!activeChat && !activeChat.isGroup && !!onlineStatusMap[activeChat.id];
  const activeChatStatus = !activeChat ? "" : activeChat.isGroup ? "Group" : activeChatIsOnline ? "Active now" : "Offline";
  const canCall = !!activeChat && !activeChat.isGroup && callState === "idle";
  const filteredChats = chats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading || !currentUser) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-slate-950 text-blue-600 font-bold">
        Loading BlinkChat…
      </div>
    );
  }

  return (
    <main className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden text-gray-900 dark:text-gray-100 transition-colors">

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

      {isPhoneModalOpen && (
        <PhoneNumberModal currentPhone={myPhone} onSave={savePhoneNumber} onClose={() => setIsPhoneModalOpen(false)} />
      )}
      {isSearchModalOpen && (
        <UserSearchModal myUid={currentUser.uid} onStartChat={handleStartChatWithUser} onClose={() => setIsSearchModalOpen(false)} />
      )}
      {isGroupModalOpen && (
        <CreateGroupModal friends={friends} currentUser={currentUser} onClose={() => setIsGroupModalOpen(false)} onCreate={handleCreateGroup} />
      )}
      <GiftPickerModal
        isOpen={isGiftModalOpen}
        onClose={() => setIsGiftModalOpen(false)}
        onSend={handleGiftSend}
        recipientName={activeChat?.name ?? ""}
      />

      {/* Gift animation overlay */}
      {giftAnimation && (
        <div className="fixed inset-0 z-[130] pointer-events-none flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 animate-bounce">
            <span className="text-8xl drop-shadow-lg">{giftAnimation.emoji}</span>
            <span className="text-white font-bold text-lg bg-black/40 px-4 py-1 rounded-full backdrop-blur-sm">{giftAnimation.label} sent!</span>
          </div>
        </div>
      )}

      {activeMessage && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4" onClick={() => setActiveMessage(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-xs overflow-hidden shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-around items-center p-5 bg-gray-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800">
              {["❤️", "👍", "😂", "😮", "😢", "🔥"].map(emoji => (
                <button key={emoji} onClick={() => handleReaction(emoji)} className="text-2xl hover:scale-125 transition-transform active:scale-90">{emoji}</button>
              ))}
            </div>
            <div className="p-3 space-y-1">
              <button onClick={() => { setReplyingTo(activeMessage); setActiveMessage(null); }} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300">
                <Reply size={18} className="text-blue-600" /><span className="font-semibold">Reply</span>
              </button>
              <button onClick={() => handleDeleteMessage(activeMessage)} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600">
                <Trash2 size={18} /><span className="font-semibold">Delete for everyone</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "w-80 border-r border-gray-200 dark:border-slate-800 flex flex-col bg-gray-50 dark:bg-slate-900/50 transition-transform duration-300 ease-in-out",
        "fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-5 border-b dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xl">
            <Users size={20} className="bg-blue-600 p-1.5 rounded-lg text-white" />BlinkChat
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsSearchModalOpen(true)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full transition-all" title="Find user by UID or phone"><Search size={18} /></button>
            <button onClick={() => setIsGroupModalOpen(true)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full transition-all" title="Create Group"><UserPlus size={20} /></button>
            <ThemeToggle />
            {/* Close button — mobile only */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded-full transition-all"
              title="Close menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900">
          <div className="relative">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search chats"
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-800 rounded-xl text-xs border-none focus:ring-2 ring-blue-500 outline-none transition-all" />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 bg-white dark:bg-slate-900">
          {filteredChats.map(chat => {
            const online = !chat.isGroup && !!onlineStatusMap[chat.id];
            return (
              <div key={chat.id} onClick={() => { setActiveChat(chat); setIsSidebarOpen(false); }}
                className={cn("flex items-center gap-3 p-4 cursor-pointer transition-all border-l-4",
                  activeChat?.id === chat.id ? "bg-blue-50 dark:bg-slate-800 border-blue-600" : "hover:bg-gray-50 dark:hover:bg-slate-800/50 border-transparent")}>
                <div className="relative shrink-0">
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm",
                    chat.isGroup ? "bg-gradient-to-br from-orange-400 to-rose-500" : "bg-blue-600")}>
                    {chat.isGroup ? <Users size={20} /> : chat.name.charAt(0)}
                  </div>
                  {!chat.isGroup && (
                    <span className={cn("absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-900 rounded-full transition-colors duration-300",
                      online ? "bg-green-500" : "bg-gray-400")} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold truncate">{chat.name}</h3>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-1">
                      {chat.lastMessageAt instanceof Timestamp
                        ? chat.lastMessageAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{chat.lastMessage}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current user footer */}
        <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer group" onClick={() => setIsProfileOpen(true)}>
            <div className="relative shrink-0">
              {currentUser.profilePic ? (
                <img src={currentUser.profilePic} className="w-10 h-10 rounded-full object-cover border-2 border-blue-600 shadow-sm" alt="Me"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                  {currentUser.displayName.charAt(0)}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate text-gray-800 dark:text-white">{currentUser.displayName}</div>
              <button onClick={e => { e.stopPropagation(); setIsPhoneModalOpen(true); }}
                className="text-[9px] text-blue-500 hover:text-blue-600 font-bold uppercase tracking-tight transition-colors">
                {myPhone ? myPhone : "+ Add mobile number"}
              </button>
            </div>
            <Settings size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
          </div>
          {/* UID — selectable for sharing */}
          <p className="text-[9px] text-gray-300 dark:text-gray-600 font-mono truncate select-all mt-1 px-2">
            UID: {currentUser.uid}
          </p>
        </div>
      </aside>

      {/* Chat Panel */}
      <section className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 relative">
        <header className="h-[73px] px-4 md:px-6 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-20">
          {activeChat ? (
            <div className="flex items-center gap-2 md:gap-3">
              {/* Hamburger — mobile only */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 -ml-2 text-gray-500 hover:text-blue-600 rounded-full transition-all"
                title="Open chats"
              >
                <Menu size={22} />
              </button>
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsMediaOpen(true)}>
              <div className="relative shrink-0">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md",
                  activeChat.isGroup ? "bg-gradient-to-tr from-orange-400 to-rose-500" : "bg-blue-600")}>
                  {activeChat.isGroup ? <Users size={18} /> : activeChat.name.charAt(0)}
                </div>
                {!activeChat.isGroup && (
                  <span className={cn("absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-800 rounded-full transition-colors duration-300",
                    activeChatIsOnline ? "bg-green-500" : "bg-gray-400")} />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-gray-800 dark:text-white leading-tight truncate">{activeChat.name}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-[11px] font-bold", activeChatIsOnline ? "text-green-500" : "text-gray-400")}>{activeChatStatus}</span>
                  {activePeerPhone && (
                    <><span className="text-gray-300 dark:text-gray-600 text-[10px]">·</span>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1"><Phone size={9} />{activePeerPhone}</span></>
                  )}
                </div>
              </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Hamburger — mobile only, when no chat selected */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 -ml-2 text-gray-500 hover:text-blue-600 rounded-full transition-all"
                title="Open chats"
              >
                <Menu size={22} />
              </button>
              <span className="text-gray-400 text-sm">Select a chat to start</span>
            </div>
          )}

          <div className="flex items-center gap-1 md:gap-2 text-gray-500 dark:text-gray-400">
            <button
              onClick={() => activeChat && !activeChat.isGroup && startCall(activeChat.id, activeChat.name, activePeerPhone ?? undefined, false)}
              disabled={!canCall} title="Voice call"
              className={cn("p-2 rounded-full transition-all", canCall ? "hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 active:scale-95" : "opacity-30 cursor-not-allowed")}>
              <Phone size={20} />
            </button>
            <button
              onClick={() => activeChat && !activeChat.isGroup && startCall(activeChat.id, activeChat.name, activePeerPhone ?? undefined, true)}
              disabled={!canCall} title="Video call"
              className={cn("p-2 rounded-full transition-all", canCall ? "hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 active:scale-95" : "opacity-30 cursor-not-allowed")}>
              <Video size={20} />
            </button>
            <div className="w-[1px] h-6 bg-gray-200 dark:bg-slate-800 mx-1 hidden md:block" />
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"><Search size={20} /></button>
            <button onClick={() => setIsMediaOpen(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"><MoreVertical size={20} /></button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 bg-[#F8F9FB] dark:bg-slate-950 space-y-1">
          {messages.map(msg => (
            <div key={msg.id} className="flex flex-col">
              {activeChat?.isGroup && !msg.isMe && (
                <span className="text-[10px] text-blue-600 font-bold ml-12 mb-1 uppercase tracking-wider">{msg.senderName}</span>
              )}
              <ChatBubble message={msg} onReply={setReplyingTo} onActionMenu={setActiveMessage} />
            </div>
          ))}
          {isOtherUserTyping && activeChat && <TypingIndicator username={activeChat.name} />}
          {uploadProgress !== null && (
            <div className="flex justify-end mb-4">
              <div className="bg-blue-50 dark:bg-slate-800 p-3 rounded-2xl border dark:border-slate-700 w-48">
                <div className="flex items-center gap-3 mb-2">
                  <File size={16} className="text-blue-600 animate-pulse" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Uploading…</span>
                </div>
                <div className="h-1 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative z-20">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          {replyingTo && (
            <div className="max-w-4xl mx-auto mb-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-t-xl border-l-4 border-blue-600 flex justify-between items-center">
              <div className="truncate pr-4">
                <p className="text-[10px] font-bold text-blue-600 uppercase">Replying to {replyingTo.senderName}</p>
                <p className="text-xs text-gray-400 truncate">{replyingTo.text}</p>
              </div>
              <button onClick={() => setReplyingTo(null)}><X size={18} /></button>
            </div>
          )}
          {showEmoji && (
            <div className="absolute bottom-20 left-4 z-[100]">
              <ChatEmojiPicker onEmojiClick={(e: any) => handleInputChange(input + e)} theme="dark" />
            </div>
          )}
          {showGif && (
            <div className="absolute bottom-20 left-24 z-[100]">
              <GifPicker onGifClick={handleGifSend} />
            </div>
          )}
          <form onSubmit={handleSendMessage}
            className={cn("max-w-4xl mx-auto flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-2 border dark:border-slate-700 transition-all",
              replyingTo ? "rounded-b-2xl" : "rounded-2xl")}>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-blue-500"><Paperclip size={22} /></button>
            <button type="button" onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }} className="p-2 text-gray-500 hover:text-blue-500"><Smile size={22} /></button>
            <button type="button" onClick={() => { setShowEmoji(false); setIsGiftModalOpen(true); }} className="p-2 text-gray-500 hover:text-pink-500"><Gift size={22} /></button>
            <input type="text" value={input} onChange={e => handleInputChange(e.target.value)}
              placeholder={activeChat ? "Type a message…" : "Select a chat to start"}
              disabled={!activeChat}
              className="flex-1 bg-transparent border-none px-2 py-2 text-sm outline-none dark:text-white disabled:opacity-40" />
            <button type="submit" disabled={!input.trim() || !activeChat}
              className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 shadow-md transition-all active:scale-95 disabled:opacity-50">
              <Send size={18} fill="currentColor" />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
