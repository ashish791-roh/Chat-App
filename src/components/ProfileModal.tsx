"use client";
import { useState } from "react";
import { X, Camera, User, FileText, Check } from "lucide-react";

export default function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [name, setName] = useState("Ashish Yadav");
  const [bio, setBio] = useState("Exploring Next.js 🚀");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-r from-blue-600 to-purple-600">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Profile Info */}
        <div className="px-8 pb-8 -mt-12 relative text-center">
          <div className="relative inline-block group">
            <div className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-800 p-1 shadow-xl">
               <div className="w-full h-full rounded-[1.2rem] bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-3xl font-bold text-blue-600">
                 {name[0]}
               </div>
            </div>
            <button className="absolute bottom-1 right-1 p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:scale-110 transition-transform">
              <Camera size={16} />
            </button>
          </div>

          <div className="mt-6 space-y-4 text-left">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 p-3.5 rounded-2xl border dark:border-slate-700">
                <User size={18} className="text-gray-400" />
                <input value={name} onChange={(e) => setName(e.target.value)} className="bg-transparent border-none outline-none text-sm w-full dark:text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Bio</label>
              <div className="flex items-start gap-3 bg-gray-50 dark:bg-slate-800 p-3.5 rounded-2xl border dark:border-slate-700">
                <FileText size={18} className="text-gray-400 mt-0.5" />
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="bg-transparent border-none outline-none text-sm w-full h-20 resize-none dark:text-white" />
              </div>
            </div>
          </div>

          <button onClick={onClose} className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-95">
            <Check size={20} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}