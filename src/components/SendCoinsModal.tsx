"use client";
import { useState } from "react";
import { X, ArrowRight, Coins } from "lucide-react";

export default function SendCoinsModal({ isOpen, onClose, onSend, recipientName, myCoins }: { isOpen: boolean, onClose: () => void, onSend: (amount: number) => void, recipientName: string, myCoins: number }) {
  const [amount, setAmount] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl border dark:border-slate-800 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
         <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl flex items-center justify-center shadow-inner">
                 <Coins size={20} className="text-yellow-600" />
              </div>
              <h2 className="text-lg font-bold dark:text-white">Send Coins</h2>
            </div>
            <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition"><X size={18} className="text-gray-500" /></button>
         </div>
         <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Send coins to <strong>{recipientName}</strong>. You currently have <span className="text-yellow-600 font-bold">{myCoins} 🪙</span>.</p>
         
         <div className="relative mb-6">
           <input type="number" placeholder="Enter amount..." value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-800 p-4 pl-12 rounded-2xl border dark:border-slate-700 outline-none dark:text-white font-bold text-lg text-center focus:border-yellow-400 transition" />
           <Coins size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
         </div>

         <button 
           onClick={() => { const amt = parseInt(amount); if(amt > 0 && amt <= myCoins) { onSend(amt); onClose(); setAmount(""); } }}
           disabled={!amount || parseInt(amount) <= 0 || parseInt(amount) > myCoins}
           className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white font-bold p-4 rounded-2xl flex justify-center items-center gap-2 disabled:opacity-50 transition active:scale-95 shadow-lg shadow-yellow-500/20"
         >
           Send Coins <ArrowRight size={18} />
         </button>
      </div>
    </div>
  )
}
