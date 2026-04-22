"use client";

import { useState } from "react";
import { LogOut, Zap } from "lucide-react";

interface Props {
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  userName?: string;
}

export default function LogoutConfirmModal({ isOpen, onConfirm, onCancel, userName }: Props) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200"
        style={{ background: "var(--bg-panel)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-rose-500 to-orange-500" />

        {/* Icon + title */}
        <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-5">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <LogOut size={28} className="text-red-400" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              Sign out?
            </h2>
            <p className="text-sm mt-1.5" style={{ color: "var(--text-secondary)" }}>
              {userName
                ? <>You're signed in as <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{userName}</span>.</>
                : "Are you sure you want to sign out?"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Your messages and chats will still be here when you return.
            </p>
          </div>
        </div>
        <div className="mx-6 h-px" style={{ background: "var(--border)" }} />

  
        <div className="flex gap-3 p-5">
          {/* Cancel */}
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl font-semibold text-sm transition-all hover:bg-white/10 active:scale-95 disabled:opacity-50 border border-white/10"
            style={{ color: "var(--text-secondary)" }}
          >
            Stay
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              color: "#fff",
              boxShadow: "0 4px 16px rgba(239,68,68,0.35)",
            }}
          >
            {loading ? (
              <>
                <span
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                />
                Signing out…
              </>
            ) : (
              <>
                <LogOut size={15} />
                Sign out
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 pb-4">
          <Zap size={11} className="text-violet-400" />
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>BlinkChat</span>
        </div>
      </div>
    </div>
  );
}

  );
}
