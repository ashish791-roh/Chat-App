"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Users, Phone, Video, X, Trash2, Reply, Settings,
  Search, UserPlus, Paperclip, File, Smile, Gift, MoreVertical,
  MessageSquare, LogOut, ChevronLeft, Bell,
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
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { useFriends } from "@/hooks/useFriends";
import { useChats } from "@/hooks/useChats";
import { useMessages } from "@/hooks/useMessages";
import { useCall } from "@/hooks/useCall";
import { socket } from "@/lib/socket";
import { ensureDmChat, getDmId, cn } from "@/lib/chatHelpers";
import { Chat, Message, UserProfile } from "@/types/chat";

// Get the other user's UID from a DM chat's members array (FIXED)
function peerUid(chat: Chat, myUid: string): string {
  return chat.members?.find((m) => m !== myUid) ?? "";
}

export default function ChatPage() {
  const router = useRouter();
  const { user: authUser, loading, logout } = useAuth();

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
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUser = authUser
    ? { uid: authUser.id, displayName: authUser.name, profilePic: (authUser as any).avatar ?? null }
    : null;

  usePresence(currentUser);
  const { friends, onlineStatusMap, myPhone } = useFriends(currentUser?.uid ?? null);
  const chats = useChats(currentUser?.uid ?? null, onlineStatusMap);
  const messages = useMessages(activeChat?.id ?? null, currentUser?.uid ?? null);
  const { callState, activeCall, isMuted, isCameraOff, startCall, acceptCall, endCall, toggleMute, toggleCamera } =
    useCall({ myUid: currentUser?.uid ?? "", myName: currentUser?.displayName ?? "", myPhone,
      localVideoRef: localVideoRef as React.RefObject<HTMLVideoElement>,
      remoteVideoRef: remoteVideoRef as React.RefObject<HTMLVideoElement> });

  useEffect(() => { if (!activeChat && chats.length > 0) setActiveChat(chats[0]); }, [chats, activeChat]);
  useEffect(() => { if (!loading && !authUser) router.replace("/auth/login"); }, [authUser, loading, router]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, showEmoji, showGif, replyingTo, uploadProgress, isOtherUserTyping]);

  useEffect(() => {
    if (!currentUser) return;
    socket.connect(); socket.emit("user_online", { userId: currentUser.uid });
    return () => { socket.emit("user_offline", { userId: currentUser.uid }); };
  }, [currentUser?.uid]); // eslint-disable-line

  useEffect(() => {
    if (!currentUser || !activeChat) return;
    const onTyping = (d: any) => { if (d.to === currentUser.uid || d.to === activeChat.id) setIsOtherUserTyping(true); };
    const onStop  = (d: any) => { if (d.to === currentUser.uid || d.to === activeChat.id) setIsOtherUserTyping(false); };
    socket.on("typing", onTyping); socket.on("stop_typing", onStop);
    return () => { socket.off("typing", onTyping); socket.off("stop_typing", onStop); };
  }, [currentUser?.uid, activeChat?.id]); // eslint-disable-line

  const savePhoneNumber = useCallback(async (phone: string) => {
    if (!currentUser) return;
    try { await updateDoc(doc(db, "users", currentUser.uid), { phoneNumber: phone }); } catch {}
  }, [currentUser?.uid]); // eslint-disable-line

  const handleStartChatWithUser = useCallback(async (user: UserProfile) => {
    if (!currentUser) return;
    const chatId = await ensureDmChat(currentUser.uid, user.uid, user.displayName);
    setActiveChat({ id: chatId, name: user.displayName, isGroup: false, lastMessage: "",
      status: user.isOnline ? "Active now" : "Offline", isOnline: user.isOnline,
      members: [currentUser.uid, user.uid] });
    setIsSearchModalOpen(false); setMobileShowChat(true);
  }, [currentUser?.uid]); // eslint-disable-line

  // ─── FIXED: send uses members array for otherId, not activeChat.id ────────
  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !currentUser || !activeChat) return;
    const text = input.trim();
    setInput(""); setShowEmoji(false);
    const pendingReply = replyingTo; setReplyingTo(null);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit("stop_typing", { from: currentUser.uid, to: activeChat.id });
    try {
      const chatId = activeChat.id;
      const otherId = !activeChat.isGroup ? peerUid(activeChat, currentUser.uid) : "";
      if (!activeChat.isGroup && otherId) await ensureDmChat(currentUser.uid, otherId, activeChat.name);
      const payload: Record<string, any> = {
        senderId: currentUser.uid, senderName: currentUser.displayName,
        text, timestamp: serverTimestamp(), status: "sent", isDeleted: false,
        ...(activeChat.isGroup ? { groupId: activeChat.id } : { receiverId: otherId }),
        ...(pendingReply ? { replyTo: { id: pendingReply.id, text: pendingReply.text, senderName: pendingReply.senderName } } : {}),
      };
      await addDoc(collection(db, "chats", chatId, "messages"), payload);
      await updateDoc(doc(db, "chats", chatId), { lastMessage: text, lastMessageAt: serverTimestamp() });
      socket.emit("send_message", { ...payload, chatId });
    } catch (err) { console.error("Send failed:", err); }
  }, [input, currentUser?.uid, activeChat?.id, replyingTo]); // eslint-disable-line

  const handleDeleteMessage = useCallback(async (msg: Message) => {
    if (!activeChat) return;
    try { await updateDoc(doc(db, "chats", activeChat.id, "messages", msg.id), { isDeleted: true, text: "" }); } catch {}
    setActiveMessage(null);
  }, [activeChat?.id]); // eslint-disable-line

  const handleReaction = useCallback(async (emoji: string) => {
    if (!activeMessage || !currentUser || !activeChat) return;
    const ref = doc(db, "chats", activeChat.id, "messages", activeMessage.id);
    try {
      const snap = await getDoc(ref); if (!snap.exists()) return;
      const cur: Record<string, string[]> = snap.data().reactions ?? {};
      const users = cur[emoji] ?? [];
      await updateDoc(ref, { reactions: { ...cur, [emoji]: users.includes(currentUser.uid) ? users.filter(u => u !== currentUser.uid) : [...users, currentUser.uid] } });
    } catch {}
    setActiveMessage(null);
  }, [activeMessage?.id, currentUser?.uid, activeChat?.id]); // eslint-disable-line

  const handleCreateGroup = useCallback(async (data: { name: string; members: string[] }) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, "chats"), { isGroup: true, name: data.name, members: data.members,
        lastMessage: "Group created", lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(), createdBy: currentUser.uid });
    } catch {}
    setIsGroupModalOpen(false);
  }, [currentUser?.uid]); // eslint-disable-line

  // ─── FIXED: file/gif send also use peerUid ────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !activeChat) return;
    e.target.value = ""; setUploadProgress(0);
    let p = 0;
    const iv = setInterval(async () => {
      p += 20; setUploadProgress(p);
      if (p >= 100) {
        clearInterval(iv);
        const isImg = file.type.startsWith("image/");
        const text = isImg ? URL.createObjectURL(file) : `📄 ${file.name}`;
        try {
          const chatId = activeChat.id;
          const otherId = !activeChat.isGroup ? peerUid(activeChat, currentUser.uid) : "";
          if (!activeChat.isGroup && otherId) await ensureDmChat(currentUser.uid, otherId, activeChat.name);
          await addDoc(collection(db, "chats", chatId, "messages"), {
            senderId: currentUser.uid, senderName: currentUser.displayName,
            text, timestamp: serverTimestamp(), status: "sent", isDeleted: false,
            ...(activeChat.isGroup ? { groupId: activeChat.id } : { receiverId: otherId }),
          });
          await updateDoc(doc(db, "chats", chatId), { lastMessage: isImg ? "📷 Photo" : `📄 ${file.name}`, lastMessageAt: serverTimestamp() });
        } catch {}
        setUploadProgress(null);
      }
    }, 150);
  };

  const handleGifSend = async (url: string) => {
    if (!currentUser || !activeChat) return; setShowGif(false);
    try {
      const chatId = activeChat.id;
      const otherId = !activeChat.isGroup ? peerUid(activeChat, currentUser.uid) : "";
      if (!activeChat.isGroup && otherId) await ensureDmChat(currentUser.uid, otherId, activeChat.name);
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.uid, senderName: currentUser.displayName, text: url,
        timestamp: serverTimestamp(), status: "sent", isDeleted: false,
        ...(activeChat.isGroup ? { groupId: activeChat.id } : { receiverId: otherId }),
      });
      await updateDoc(doc(db, "chats", chatId), { lastMessage: "🎞️ GIF", lastMessageAt: serverTimestamp() });
    } catch {}
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

  // ─── FIXED: peer data from members array ─────────────────────────────────
  const activePeerId = activeChat && !activeChat.isGroup ? peerUid(activeChat, currentUser?.uid ?? "") : null;
  const activePeerPhone = activePeerId ? friends.find(f => f.uid === activePeerId)?.phoneNumber ?? null : null;
  const activeChatIsOnline = !!activePeerId && !!onlineStatusMap[activePeerId];
  const activeChatStatus = !activeChat ? "" : activeChat.isGroup
    ? `${activeChat.members?.length ?? 0} members` : activeChatIsOnline ? "online" : "last seen recently";
  const canCall = !!activeChat && !activeChat.isGroup && callState === "idle" && !!activePeerId;
  const filteredChats = chats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const onSelectChat = (chat: Chat) => { setActiveChat(chat); setMobileShowChat(true); setTimeout(() => inputRef.current?.focus(), 100); };

  if (loading || !currentUser) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center" style={{ background: "#17212b" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "#5b9bd6" }}>
          <MessageSquare size={32} className="text-white" />
        </div>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
        </div>
      </div>
    );
  }

  return (
    <main className="flex h-screen overflow-hidden" style={{ background: "#17212b" }}>
      {callState !== "idle" && (
        <CallScreen callState={callState} activeCall={activeCall}
          localVideoRef={localVideoRef as React.RefObject<HTMLVideoElement>}
          remoteVideoRef={remoteVideoRef as React.RefObject<HTMLVideoElement>}
          isMuted={isMuted} isCameraOff={isCameraOff}
          onAccept={acceptCall} onDecline={() => endCall("decline")}
          onEnd={() => endCall("end")} onToggleMute={toggleMute} onToggleCamera={toggleCamera} />
      )}
      <MediaSidebar isOpen={isMediaOpen} onClose={() => setIsMediaOpen(false)} messages={messages} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      {isPhoneModalOpen && <PhoneNumberModal currentPhone={myPhone} onSave={savePhoneNumber} onClose={() => setIsPhoneModalOpen(false)} />}
      {isSearchModalOpen && <UserSearchModal myUid={currentUser.uid} onStartChat={handleStartChatWithUser} onClose={() => setIsSearchModalOpen(false)} />}
      {isGroupModalOpen && <CreateGroupModal friends={friends} currentUser={currentUser} onClose={() => setIsGroupModalOpen(false)} onCreate={handleCreateGroup} />}

      {/* Reaction / action sheet */}
      {activeMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-end md:items-center justify-center p-4" onClick={() => setActiveMessage(null)}>
          <div className="rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl animate-in" style={{ background: "#17212b", border: "1px solid rgba(255,255,255,0.08)" }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-around items-center px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {["❤️","👍","😂","😮","😢","🔥"].map(emoji => (
                <button key={emoji} onClick={() => handleReaction(emoji)} className="text-2xl hover:scale-130 transition-transform active:scale-90 p-1">{emoji}</button>
              ))}
            </div>
            <div className="p-2">
              <button onClick={() => { setReplyingTo(activeMessage); setActiveMessage(null); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors" style={{ color: "#a8c7e8" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
                <Reply size={17} style={{ color: "#5b9bd6" }} /> Reply
              </button>
              <button onClick={() => handleDeleteMessage(activeMessage)} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-red-400 transition-colors" onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
                <Trash2 size={17} /> Delete for everyone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ SIDEBAR ═══════════════════════════════════════════════════════════ */}
      <aside className={cn("flex flex-col w-full md:w-[340px] md:min-w-[340px] h-full", mobileShowChat ? "hidden md:flex" : "flex")}
        style={{ background: "#17212b", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <button className="flex items-center gap-2.5 group" onClick={() => setIsProfileOpen(true)}>
            <div className="relative">
              {currentUser.profilePic
                ? <img src={currentUser.profilePic} className="w-9 h-9 rounded-full object-cover" style={{ border: "2px solid #5b9bd6" }} alt="me" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                : <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: "#5b9bd6" }}>{currentUser.displayName.charAt(0).toUpperCase()}</div>
              }
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 bg-emerald-400" style={{ borderColor: "#17212b" }} />
            </div>
            <span className="text-white font-semibold text-sm hidden md:block group-hover:opacity-80 transition-opacity">{currentUser.displayName}</span>
          </button>

          <div className="flex items-center gap-0.5">
            <span className="text-white font-bold text-base tracking-tight hidden md:block mr-2" style={{ color: "#a8c7e8" }}>BlinkChat</span>
            <button onClick={() => setIsSearchModalOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-full transition-colors text-slate-400 hover:text-white" style={{ "--hover-bg": "rgba(255,255,255,0.08)" } as any} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
              <Search size={18} />
            </button>
            <button onClick={() => setIsGroupModalOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-full transition-colors text-slate-400 hover:text-white" onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
              <UserPlus size={17} />
            </button>
            <button onClick={() => logout()} className="w-8 h-8 flex items-center justify-center rounded-full transition-colors text-slate-400 hover:text-red-400" title="Logout" onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.12)")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search" className="w-full pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 rounded-xl outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.04)" }}
              onFocus={e => (e.currentTarget.style.borderColor = "rgba(91,155,214,0.4)")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)")} />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
              <MessageSquare size={40} className="mb-3 opacity-40" />
              <p className="text-sm font-medium">No chats yet</p>
              <button onClick={() => setIsSearchModalOpen(true)} className="mt-2 text-xs font-semibold transition-opacity hover:opacity-80" style={{ color: "#5b9bd6" }}>Search for people →</button>
            </div>
          )}
          {filteredChats.map(chat => {
            const isActive = activeChat?.id === chat.id;
            const online = !chat.isGroup && !!onlineStatusMap[peerUid(chat, currentUser.uid)];
            return (
              <div key={chat.id} onClick={() => onSelectChat(chat)}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all"
                style={{ background: isActive ? "#2b5278" : "transparent", borderLeft: isActive ? "3px solid #5b9bd6" : "3px solid transparent" }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base shadow-md"
                    style={{ background: chat.isGroup ? "linear-gradient(135deg,#f97316,#ef4444)" : "#5b9bd6" }}>
                    {chat.isGroup ? <Users size={20} /> : chat.name.charAt(0).toUpperCase()}
                  </div>
                  {!chat.isGroup && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ background: online ? "#22c55e" : "#4b5563", borderColor: "#17212b" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-semibold truncate" style={{ color: isActive ? "#fff" : "#d4e6f5" }}>{chat.name}</span>
                    <span className="text-[10px] shrink-0 ml-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {chat.lastMessageAt instanceof Timestamp ? chat.lastMessageAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{chat.lastMessage || "No messages yet"}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* My phone */}
        <div className="px-4 py-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => setIsPhoneModalOpen(true)} className="text-[11px] transition-opacity hover:opacity-80" style={{ color: "#5b9bd6" }}>
            {myPhone || "+ Add phone number"}
          </button>
        </div>
      </aside>

      {/* ══ CHAT PANEL ════════════════════════════════════════════════════════ */}
      <section className={cn("flex-1 flex flex-col h-full relative", !mobileShowChat ? "hidden md:flex" : "flex")}
        style={{ background: "#0e1621" }}>

        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ color: "rgba(255,255,255,0.25)" }}>
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center" style={{ background: "rgba(91,155,214,0.12)" }}>
              <MessageSquare size={44} style={{ color: "rgba(91,155,214,0.5)" }} />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Select a chat</p>
              <p className="text-sm mt-1">Choose a conversation from the sidebar</p>
            </div>
          </div>
        ) : (<>
          {/* Chat header */}
          <header className="h-[60px] px-4 flex items-center justify-between shrink-0" style={{ background: "#17212b", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3">
              <button className="md:hidden w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white transition-colors" onClick={() => setMobileShowChat(false)}>
                <ChevronLeft size={22} />
              </button>
              <button className="flex items-center gap-3 hover:opacity-80 transition-opacity" onClick={() => setIsMediaOpen(true)}>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md"
                    style={{ background: activeChat.isGroup ? "linear-gradient(135deg,#f97316,#ef4444)" : "#5b9bd6" }}>
                    {activeChat.isGroup ? <Users size={18} /> : activeChat.name.charAt(0).toUpperCase()}
                  </div>
                  {!activeChat.isGroup && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ background: activeChatIsOnline ? "#22c55e" : "#4b5563", borderColor: "#17212b" }} />}
                </div>
                <div>
                  <h2 className="font-semibold text-sm leading-tight" style={{ color: "#d4e6f5" }}>{activeChat.name}</h2>
                  <p className="text-xs" style={{ color: activeChatIsOnline ? "#22c55e" : "rgba(255,255,255,0.4)" }}>{activeChatStatus}</p>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-1">
              {[
                { icon: <Phone size={18} />, action: () => activePeerId && canCall && startCall(activePeerId, activeChat.name, activePeerPhone ?? undefined, false), enabled: canCall },
                { icon: <Video size={18} />, action: () => activePeerId && canCall && startCall(activePeerId, activeChat.name, activePeerPhone ?? undefined, true), enabled: canCall },
                { icon: <Search size={18} />, action: () => {}, enabled: true },
                { icon: <MoreVertical size={18} />, action: () => setIsMediaOpen(true), enabled: true },
              ].map((btn, i) => (
                <button key={i} onClick={btn.action} disabled={!btn.enabled}
                  className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                  style={{ color: btn.enabled ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)", cursor: btn.enabled ? "pointer" : "not-allowed" }}
                  onMouseEnter={e => { if (btn.enabled) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}>
                  {btn.icon}
                </button>
              ))}
            </div>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ background: "#0e1621" }}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20" style={{ color: "rgba(255,255,255,0.25)" }}>
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs mt-1">Say hello! 👋</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className="flex flex-col">
                {activeChat?.isGroup && !msg.isMe && (
                  <span className="text-[10px] font-bold mb-1 ml-11 uppercase tracking-wide" style={{ color: "#5b9bd6" }}>{msg.senderName}</span>
                )}
                <ChatBubble message={msg} onReply={setReplyingTo} onActionMenu={setActiveMessage} />
              </div>
            ))}
            {isOtherUserTyping && <TypingIndicator username={activeChat.name} />}
            {uploadProgress !== null && (
              <div className="flex justify-end mb-2">
                <div className="rounded-2xl p-3 w-44" style={{ background: "#17212b", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <File size={14} style={{ color: "#5b9bd6" }} className="animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>Uploading…</span>
                  </div>
                  <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <div className="h-full rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%`, background: "#5b9bd6" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="px-4 py-3 shrink-0 relative z-20" style={{ background: "#17212b", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            {replyingTo && (
              <div className="mb-2 px-3 py-2 rounded-xl flex justify-between items-start" style={{ background: "rgba(91,155,214,0.12)", borderLeft: "3px solid #5b9bd6" }}>
                <div className="min-w-0 pr-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#5b9bd6" }}>{replyingTo.senderName}</p>
                  <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{replyingTo.text}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} style={{ color: "rgba(255,255,255,0.4)" }}><X size={14} /></button>
              </div>
            )}
            {showEmoji && <div className="absolute bottom-full left-4 mb-2 z-[100]"><ChatEmojiPicker onEmojiClick={(e: any) => handleInputChange(input + e)} theme="dark" /></div>}
            {showGif  && <div className="absolute bottom-full left-4 mb-2 z-[100]"><GifPicker onGifClick={handleGifSend} /></div>}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <div className="flex items-center gap-1 flex-1 rounded-2xl px-3 py-2 transition-all" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)" }}
                onFocus={() => {}} >
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-full transition-colors" style={{ color: "rgba(255,255,255,0.4)" }} onMouseEnter={e => (e.currentTarget.style.color = "#5b9bd6")} onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}><Paperclip size={18} /></button>
                <button type="button" onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }} className="p-1.5 rounded-full transition-colors" style={{ color: showEmoji ? "#5b9bd6" : "rgba(255,255,255,0.4)" }} onMouseEnter={e => (e.currentTarget.style.color = "#5b9bd6")} onMouseLeave={e => { if (!showEmoji) e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}><Smile size={18} /></button>
                <button type="button" onClick={() => { setShowGif(!showGif); setShowEmoji(false); }} className="p-1.5 rounded-full transition-colors" style={{ color: showGif ? "#f472b6" : "rgba(255,255,255,0.4)" }} onMouseEnter={e => (e.currentTarget.style.color = "#f472b6")} onMouseLeave={e => { if (!showGif) e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}><Gift size={18} /></button>
                <input ref={inputRef} type="text" value={input} onChange={e => handleInputChange(e.target.value)}
                  placeholder="Write a message…" disabled={!activeChat}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  className="flex-1 bg-transparent text-sm outline-none disabled:opacity-40 py-1"
                  style={{ color: "#d4e6f5" }}
                />
              </div>
              <button type="submit" disabled={!input.trim() || !activeChat}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95"
                style={{ background: input.trim() && activeChat ? "#5b9bd6" : "rgba(255,255,255,0.08)", color: "white" }}>
                <Send size={17} fill={input.trim() ? "currentColor" : "none"} />
              </button>
            </form>
          </div>
        </>)}
      </section>
    </main>
  );
}
