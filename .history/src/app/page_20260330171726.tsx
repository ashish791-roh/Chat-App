"use client";

import { useState, useEffect, useRef } from "react";
// Added Paperclip for the icon and File for the indicator
import { 
  Send, Users, LogOut, MoreVertical, Smile, Gift, 
  ChevronLeft, Phone, Video, X, Trash, Trash2, 
  Reply, Settings, Search, UserPlus, Paperclip, File 
} from "lucide-react";
import ChatBubble from "@/components/ChatBubble";
import { ThemeToggle } from "@/components/ThemeToggle";
import ChatEmojiPicker from "@/components/EmojiPicker";
import GifPicker from "@/components/GifPicker";
import ProfileModal from "@/components/ProfileModal";
import MediaSidebar from "@/components/MediaSidebar";
import { Message } from "@/types";

// Helper for tailwind classes
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  
  // NEW STATES FOR FILE UPLOAD
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", senderId: "other", senderName: "Shiwani", text: "Try sending a PDF or Image!", timestamp: new Date().toISOString(), isMe: false, status: 'read' }
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showEmoji, showGif, replyingTo, uploadProgress]);

  // HANDLE FILE SELECTION
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // SIMULATED UPLOAD PROGRESS (Replace with Firebase Storage upload logic)
    setUploadProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        
        // Finalize the "Message" with the file URL/Name
        const fileMessage: Message = {
          id: Date.now().toString(),
          senderId: "me",
          senderName: "Ashish",
          text: file.type.startsWith('image/') ? URL.createObjectURL(file) : `📄 ${file.name}`,
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
    setInput("");
    setShowEmoji(false);
    setReplyingTo(null);
  };

  const handleGifSend = (url: string) => {
    const gifMessage: Message = { id: Date.now().toString(), senderId: "me", senderName: "Ashish", text: url, timestamp: new Date().toISOString(), isMe: true, status: 'sent' };
    setMessages((prev) => [...prev, gifMessage]);
    setShowGif(false);
  };

  return (
    <main className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden text-gray-900 dark:text-gray-100 transition-colors relative">
      <MediaSidebar isOpen={isMediaOpen} onClose={() => setIsMediaOpen(false)} messages={messages} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* CHAT AREA */}
      <section className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 relative">
        <header className="h-[73px] px-4 md:px-6 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => setIsMediaOpen(true)}>
            <div className="relative"><div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">S</div><span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></span></div>
            <div><h2 className="font-bold text-gray-800 dark:text-white">Shiwani</h2><span className="text-[11px] text-green-500 font-medium">Active now</span></div>
          </div>
          <button onClick={() => setIsMediaOpen(true)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"><MoreVertical size={20} /></button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-1">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} onReply={setReplyingTo} onActionMenu={setActiveMessage} />
          ))}
          
          {/* UPLOAD PROGRESS PREVIEW */}
          {uploadProgress !== null && (
            <div className="flex justify-end mb-4 animate-in fade-in slide-in-from-right-2">
              <div className="bg-blue-50 dark:bg-slate-800 p-3 rounded-2xl border dark:border-slate-700 w-48 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                    <File size={16} className="animate-pulse" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Uploading...</span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* INPUT AREA */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative z-20">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          
          {showEmoji && <div className="absolute bottom-20 left-4 z-[100]"><ChatEmojiPicker onEmojiClick={(e) => setInput(prev => prev + e)} theme="dark" /></div>}
          {showGif && <div className="absolute bottom-20 left-24 z-[100]"><GifPicker onGifClick={handleGifSend} /></div>}

          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-2 border dark:border-slate-700 rounded-2xl">
            {/* PAPERCLIP ICON FOR FILE UPLOAD */}
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-all">
              <Paperclip size={22} />
            </button>
            
            <button type="button" onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-all"><Smile size={22} /></button>
            <button type="button" onClick={() => { setShowGif(!showGif); setShowEmoji(false); }} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-all"><Gift size={22} /></button>
            
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent border-none px-2 py-2 text-sm outline-none dark:text-white" />
            <button type="submit" disabled={!input.trim()} className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 active:scale-95 transition-all"><Send size={18} fill="currentColor" /></button>
          </form>
        </div>
      </section>
    </main>
  );
}