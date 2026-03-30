"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Send, Users, LogOut, MoreVertical, Smile, Gift, 
  ChevronLeft, Phone, Video, X, Trash, Trash2, 
  Reply, Settings, Search, UserPlus, Paperclip, File 
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

// Types & Libs
import { Message } from "@/types";
import { socket } from "@/lib/socket";

// Helper for Tailwind classes
function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(" ");
}

export default function ChatPage() {
  const router = useRouter();
  
  // UI States
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  
  // Real-time Interaction States
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Message State
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: "1", 
      senderId: "other", 
      senderName: "Shiwani",
      text: "Welcome back! Try sending a file or long-pressing a message.", 
      timestamp: new Date().toISOString(), 
      isMe: false,
      status: 'read'
    }
  ]);

  // FEATURE: Session Protection
  useEffect(() => {
    const user = localStorage.getItem("blinkchat_user");
    if (!user) {
      router.push("/auth/login");
    }
  }, [router]);

  // FEATURE: Notification Permissions
  useEffect(() => {
    if (typeof window !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showEmoji, showGif, replyingTo, uploadProgress, isOtherUserTyping]);

  // FEATURE: Typing Indicators Logic
  const handleInputChange = (val: string) => {
    setInput(val);
    if (val.length > 0) {
      socket.emit("typing", { user: "Ashish" });
    } else {
      socket.emit("stop_typing", { user: "Ashish" });
    }
  };

  // FEATURE: File Upload Logic
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 15;
      if (progress > 100) progress = 100;
      setUploadProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        const fileMessage: Message = {
          id: Date.now().toString(),
          senderId: "me",
          senderName: "Ashish",
          text: file.type.startsWith('image/') ? URL.createObjectURL(file) : `📄 ${URL.createObjectURL(file)}`,
          timestamp: new Date().toISOString(),
          isMe: true,
          status: 'sent'
        };
        setMessages(prev => [...prev, fileMessage]);
        setUploadProgress(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }, 200);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "me",
      senderName: "Ashish",
      text: input,
      timestamp: new Date().toISOString(),
      isMe: true,
      status: 'sent',
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, senderName: replyingTo.senderName } : undefined
    };

    setMessages((prev) => [...prev, newMessage]);
    socket.emit("stop_typing", { user: "Ashish" });
    setInput("");
    setShowEmoji(false);
    setReplyingTo(null);
  };

  const handleGifSend = (url: string) => {
    const gifMessage: Message = { id: Date.now().toString(), senderId: "me", senderName: "Ashish", text: url, timestamp: new Date().toISOString(), isMe: true, status: 'sent' };
    setMessages((prev) => [...prev, gifMessage]);
    setShowGif(false);
  };

  const handleReaction = (emoji: string) => {
    if (!activeMessage) return;
    setMessages(prev => prev.map(m => {
      if (m.id !== activeMessage.id) return m;
      const current = m.reactions || {};
      const users = current[emoji] || [];
      const updated = { ...current, [emoji]: users.includes("me") ? users.filter(u => u !== "me") : [...users, "me"] };
      return { ...m, reactions: updated };
    }));
    setActiveMessage(null);
  };

  return (
    <main className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden text-gray-900 dark:text-gray-100 transition-colors relative">
      
      {/* OVERLAYS & SIDEBARS */}
      <MediaSidebar isOpen={isMediaOpen} onClose={() => setIsMediaOpen(false)} messages={messages} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* LONG-PRESS MENU */}
      {activeMessage && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4" onClick={() => setActiveMessage(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-xs overflow-hidden shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-around items-center p-5 bg-gray-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800">
              {["❤️", "👍", "😂", "😮", "😢", "🔥"].map(emoji => (
                <button key={emoji} onClick={() => handleReaction(emoji)} className="text-2xl hover:scale-125 transition-transform active:scale-90">{emoji}</button>
              ))}
            </div>
            <div className="p-3 space-y-1">
              <button onClick={() => { setReplyingTo(activeMessage); setActiveMessage(null); }} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300">
                <Reply size={18} className="text-blue-600" /> <span className="font-semibold">Reply</span>
              </button>
              <button onClick={() => { setMessages(prev => prev.map(m => m.id === activeMessage.id ? {...m, isDeleted: true} : m)); setActiveMessage(null); }} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600">
                <Trash2 size={18} /> <span className="font-semibold">Delete for everyone</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTACTS SIDEBAR */}
      <aside className="w-80 border-r border-gray-200 dark:border-slate-800 hidden md:flex flex-col bg-gray-50 dark:bg-slate-900/50">
        <div className="p-5 border-b dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xl">
              <Users size={20} className="bg-blue-600 p-1.5 rounded-lg text-white" /> BlinkChat
          </div>
          <ThemeToggle />
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div className="px-2">
            <div className="relative">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Username or Phone..." className="w-full pl-10 pr-12 py-2.5 bg-white dark:bg-slate-800 rounded-xl text-xs border dark:border-slate-700 focus:ring-2 ring-blue-500 outline-none transition-all" />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <button title="Add user" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg"><UserPlus size={14} /></button>
            </div>
          </div>
          <div onClick={() => setIsProfileOpen(true)} className="group flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-transparent hover:border-blue-500 cursor-pointer">
            <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">A</div>
            <div className="flex-1 text-sm font-bold">Ashish Rohilla<p className="text-[10px] text-gray-400 font-normal">Online</p></div>
            <Settings size={16} className="text-gray-300 group-hover:text-blue-500" />
          </div>
        </div>
        <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900">
          <button onClick={() => { localStorage.removeItem("blinkchat_user"); router.push("/auth/login"); }} className="flex items-center justify-center gap-2 text-gray-500 hover:text-red-500 w-full py-2 rounded-xl transition-all"><LogOut size={18} /> Logout</button>
        </div>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white">BlinkChat</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all"
            title="Create Group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
            <Settings size={20} />
          </button>

        </div>
      </aside>
      

      {/* CHAT MAIN */}
      <section className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 relative">
        <header className="h-[73px] px-4 md:px-6 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => setIsMediaOpen(true)}>
            <div className="relative"><div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">S</div><span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span></div>
            <div><h2 className="font-bold text-gray-800 dark:text-white">Shiwani</h2><span className="text-[11px] text-green-500 font-bold">Active now</span></div>
          </div>
          <button onClick={() => setIsMediaOpen(true)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full" title="View media"><MoreVertical size={20} /></button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 bg-[#F8F9FB] dark:bg-slate-950 space-y-1">
          {messages.map((msg) => (
            <ChatBubble 
              key={msg.id} 
              message={msg} 
              onReply={setReplyingTo} 
              onActionMenu={setActiveMessage} 
            />
          ))}
          {isOtherUserTyping && <TypingIndicator username="Shiwani" />}
          
          {/* UPLOAD PROGRESS CARD */}
          {uploadProgress !== null && (
            <div className="flex justify-end mb-4 animate-in slide-in-from-right-2">
              <div className="bg-blue-50 dark:bg-slate-800 p-3 rounded-2xl border dark:border-slate-700 w-48">
                <div className="flex items-center gap-3 mb-2">
                  <File size={16} className="text-blue-600 animate-pulse" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Uploading...</span>
                </div>
                <div className="h-1 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* INPUT SECTION */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative z-20">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" title="Upload a file" />
          
          {replyingTo && (
            <div className="max-w-4xl mx-auto mb-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-t-xl border-l-4 border-blue-600 flex justify-between items-center">
              <div className="truncate pr-4"><p className="text-[10px] font-bold text-blue-600 uppercase">Replying to {replyingTo.senderName}</p><p className="text-xs text-gray-400 truncate">{replyingTo.text}</p></div>
              <button onClick={() => setReplyingTo(null)} title="Clear reply"><X size={18} /></button>
            </div>
          )}

          {showEmoji && <div className="absolute bottom-20 left-4 z-[100]"><ChatEmojiPicker onEmojiClick={(e) => handleInputChange(input + e)} theme="dark" /></div>}
          {showGif && <div className="absolute bottom-20 left-24 z-[100]"><GifPicker onGifClick={handleGifSend} /></div>}

          <form onSubmit={handleSendMessage} className={cn("max-w-4xl mx-auto flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-2 border dark:border-slate-700 transition-all", replyingTo ? "rounded-b-2xl" : "rounded-2xl")}>
            <button type="button" onClick={() => fileInputRef.current?.click()} title="Upload file" className="p-2 text-gray-500 hover:text-blue-500"><Paperclip size={22} /></button>
            <button type="button" onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }} title="Emoji picker" className="p-2 text-gray-500 hover:text-blue-500"><Smile size={22} /></button>
            <button type="button" onClick={() => { setShowGif(!showGif); setShowEmoji(false); }} className="p-2 text-gray-500 hover:text-pink-500" title="Send GIF"><Gift size={22} /></button>
            <input type="text" value={input} onChange={(e) => handleInputChange(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent border-none px-2 py-2 text-sm outline-none dark:text-white" />
            <button type="submit" disabled={!input.trim()} className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20" title="Send message"><Send size={18} fill="currentColor" /></button>
          </form>
        </div>
      </section>
    </main>
  );
}