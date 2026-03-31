"use client";
//
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { X, Camera, User, Check, Bell, BellOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { updateUserProfile } from "@/lib/auth";

export default function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user data when modal opens
  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhoto(user.avatar);
      setBio(user.bio || "Exploring BlinkChat 🚀");
    }
  }, [user, isOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
  try {
    await updateUserProfile(user.id, {
      name: name,
      avatar: photo, // This should be your base64 or URL string
      bio: bio
    });
    onClose(); // Close modal on success
    window.location.reload(); // Force a refresh to sync all components if not using a shared state
  } catch (error) {
    console.error("Update failed:", error);
  }};

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