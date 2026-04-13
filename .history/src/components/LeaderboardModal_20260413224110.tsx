"use client";
import { useState, useEffect } from "react";
import { X, Trophy, Medal } from "lucide-react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function LeaderboardModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "users"), orderBy("coins", "desc"), limit(50));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(data);
      } catch(err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl border dark:border-slate-800 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl flex items-center justify-center shadow-inner">
              <Trophy size={20} className="text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold dark:text-white">Leaderboard</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition"><X size={20} className="text-gray-500" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center p-10"><div className="typing-dot bg-yellow-500 animate-bounce" /></div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {users.map((u, i) => (
              <div key={u.id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl border border-transparent hover:border-yellow-200 dark:hover:border-yellow-900 transition flex-shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-gray-300 text-gray-800" : i === 2 ? "bg-amber-600 text-white" : "bg-gray-200 dark:bg-slate-700 dark:text-gray-300"}`}>
                    {i < 3 ? <Medal size={16} /> : `#${i + 1}`}
                  </div>
                  <div className="flex items-center gap-3">
                    {u.avatar ? (
                       <img src={u.avatar} className="w-9 h-9 rounded-full object-cover shadow-sm border border-white/10" />
                    ) : (
                       <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center font-bold text-xs">{u.name?.charAt(0) || "U"}</div>
                    )}
                    <span className="font-semibold text-sm dark:text-white truncate max-w-[120px]">{u.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-yellow-100/50 dark:bg-yellow-900/20 px-3 py-1 rounded-full">
                  <span className="font-bold text-yellow-600 dark:text-yellow-500">{u.coins ?? 0}</span>
                  <span className="text-sm">🪙</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
