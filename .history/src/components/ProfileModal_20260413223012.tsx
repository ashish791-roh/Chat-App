"use client";
//
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { X, Camera, User, Check, Bell, BellOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToUserStatus } from "@/lib/auth";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateUserProfile } from "@/lib/auth";

export default function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coins, setCoins] = useState<number>(500);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user data when modal opens
  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhoto(user.avatar);
      setBio(user.bio || "Exploring BlinkChat 🚀");

      const unsub = subscribeToUserStatus(user.id, (data) => {
        if (data.coins !== undefined) {
          setCoins(data.coins);
        } else {
          // Initialize coins for users missing the field
          updateDoc(doc(db, "users", user.id), { coins: 500 }).catch(console.error);
          setCoins(500);
        }
      });
      return () => unsub();
    }
  }, [user, isOpen]);

  const handleAddCoins = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.id), {
        coins: increment(100),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
  try {
    await updateUserProfile(user.id, {
      name: name,
      avatar: photo ?? un // This should be your base64 or URL string
      bio: bio
    });
    onClose(); // Close modal on success
    window.location.reload(); // Force a refresh to sync all components if not using a shared state
   } catch (error) {
    console.error("Update failed:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="relative h-32 bg-gradient-to-r from-blue-600 to-purple-600">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white"><X size={20} /></button>
        </div>

        <div className="px-8 pb-8 -mt-12 relative text-center">
          <div className="relative inline-block group">
            <div className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-800 p-1 shadow-xl overflow-hidden">
               {photo ? (
                 <img src={photo} alt="Profile" className="w-full h-full object-cover rounded-[1.2rem]" />
               ) : (
                 <div className="w-full h-full rounded-[1.2rem] bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-3xl font-bold text-blue-600">
                    {name[0]}
                 </div>
               )}
            </div>
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-1 right-1 p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:scale-110 transition-transform"><Camera size={16} /></button>
          </div>

          <div className="mt-6 space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 p-3.5 rounded-2xl border dark:border-slate-700">
                <User size={18} className="text-gray-400" />
                <input value={name} onChange={(e) => setName(e.target.value)} className="bg-transparent outline-none text-sm w-full dark:text-white" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Bio</label>
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 p-3.5 rounded-2xl border dark:border-slate-700">
                <input value={bio} onChange={(e) => setBio(e.target.value)} className="bg-transparent outline-none text-sm w-full dark:text-white" />
              </div>
            </div>

            <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl border dark:border-slate-700">
              <div className="flex items-center gap-3">
                {notifications ? <Bell size={18} className="text-blue-500" /> : <BellOff size={18} className="text-gray-400" />}
                <span className="text-sm font-medium dark:text-white">Push Notifications</span>
              </div>
              <button onClick={() => setNotifications(!notifications)} className={`w-10 h-5 rounded-full transition-colors ${notifications ? 'bg-blue-600' : 'bg-gray-400'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${notifications ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Wallet Integration */}
            <div className="bg-gradient-to-br from-pink-500 to-orange-400 p-4 rounded-2xl shadow-lg border border-pink-400 relative overflow-hidden mt-4">
              <div className="absolute -right-6 -top-6 text-white/20">
                <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-1.16 2.4-1.92 0-1.06-.55-1.57-2.3-2.19-2-.72-3.41-1.66-3.41-3.66 0-1.8 1.4-2.88 3.19-3.23V4.5h2.67v1.89c1.65.25 2.76 1.42 2.91 3.01h-1.92c-.11-1.01-.84-1.63-2.31-1.63-1.64 0-2.27.91-2.27 1.7 0 1.02.6 1.45 2.5 2.11 2.22.78 3.22 1.89 3.22 3.86 0 2.05-1.46 3.07-3.3 3.44z" />
                </svg>
              </div>
              <div className="relative z-10">
                <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1">My Wallet</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">🪙</span>
                    <span className="text-3xl font-extrabold text-white drop-shadow-md">{coins}</span>
                  </div>
                  <button onClick={handleAddCoins} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl font-bold text-xs backdrop-blur-md transition-all active:scale-95 shadow-sm">
                    +100 Coins
                  </button>
                </div>
              </div>
            </div>

          </div>

          <button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Check size={20} />} 
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}