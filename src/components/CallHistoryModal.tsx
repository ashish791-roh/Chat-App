"use client";
import { useState, useEffect } from "react";
import { X, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Phone, PhoneOff } from "lucide-react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CallHistoryModal({ isOpen, onClose, myUid }: { isOpen: boolean; onClose: () => void; myUid: string }) {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !myUid) return;
    const fetchCalls = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "calls"),
          where("members", "array-contains", myUid),
          orderBy("timestamp", "desc"),
          limit(50)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCalls(data);
      } catch(err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCalls();
  }, [isOpen, myUid]);

  if (!isOpen) return null;

  const formatDuration = (s: number) => {
    if (s === 0) return "0s";
    const m = Math.floor(s / 60);
    const secs = s % 60;
    return m > 0 ? `${m}m ${secs}s` : `${secs}s`;
  };

  const getTime = (ts: any) => {
    if (!ts) return "";
    return ts.toDate ? ts.toDate().toLocaleString([], { weekday: 'short', hour: "2-digit", minute: "2-digit" }) : "";
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md h-[80vh] sm:h-auto sm:max-h-[85vh] rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center shadow-inner">
              <Phone size={20} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold dark:text-white">Recent Calls</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition"><X size={20} className="text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-4">
          {loading ? (
            <div className="flex justify-center p-10"><div className="typing-dot bg-emerald-500 animate-bounce" /></div>
          ) : calls.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center gap-4">
              <PhoneOff size={48} className="opacity-20" />
              <p>No recent calls</p>
            </div>
          ) : (
            calls.map((call) => {
              const isOutgoing = call.callerId === myUid;
              const isMissed = call.status === "missed" || call.status === "declined";
              const peerName = isOutgoing ? call.receiverName : call.callerName;
              return (
                <div key={call.id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl border border-transparent shadow-sm hover:border-emerald-200 dark:hover:border-emerald-900 transition">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${isMissed ? "bg-red-100 text-red-500 dark:bg-red-900/30" : isOutgoing ? "bg-blue-100 text-blue-500 dark:bg-blue-900/30" : "bg-emerald-100 text-emerald-500 dark:bg-emerald-900/30"}`}>
                       {isMissed ? <PhoneMissed size={18} /> : isOutgoing ? <PhoneOutgoing size={18} /> : <PhoneIncoming size={18} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[15px] dark:text-white">{peerName}</span>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {call.isVideo ? <Video size={10} className="mr-1" /> : <Phone size={10} className="mr-1" />}
                        <span className="capitalize">{call.status}</span>
                        {call.status === "completed" && <><span className="w-1 h-1 bg-gray-300 rounded-full ml-1 mr-1" /><span>{formatDuration(call.duration)}</span></>}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{getTime(call.timestamp)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
