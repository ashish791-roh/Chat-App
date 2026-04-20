"use client";
import { X, MessageSquare } from "lucide-react";
import { ForegroundNotificationPayload } from "@/lib/fcm";
 
interface Props {
  notification: ForegroundNotificationPayload;
  onDismiss:    () => void;
  onOpen?:      (chatId: string) => void;
}
 
export default function NotificationToast({ notification, onDismiss, onOpen }: Props) {
  const handleClick = () => {
    if (notification.chatId && onOpen) onOpen(notification.chatId);
    onDismiss();
  };
 
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "fixed",
        top: "1.25rem",
        right: "1.25rem",
        zIndex: 9999,
        width: "clamp(280px, 90vw, 360px)",
        animation: "toast-in 0.22s ease-out",
      }}
    >
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
      `}</style>
 
      <div
        onClick={handleClick}
        className="cursor-pointer"
        style={{
          background:   "var(--bg-elevated)",
          border:       "1px solid var(--border-glow)",
          borderRadius: "var(--radius-md)",
          boxShadow:    "var(--shadow-lg)",
          padding:      "14px 16px",
          display:      "flex",
          alignItems:   "flex-start",
          gap:          "12px",
        }}
      >
        <div
          style={{
            width: "38px", height: "38px",
            borderRadius: "50%",
            background: "var(--grad-accent)",
            display:    "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <MessageSquare size={18} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: "13px", fontWeight: 600,
            color: "var(--text-primary)",
            margin: 0, whiteSpace: "nowrap",
            overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {notification.title}
          </p>
          <p style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            margin: "3px 0 0",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}>
            {notification.body}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          style={{
            background: "none", border: "none",
            cursor: "pointer", padding: "2px",
            color: "var(--text-muted)",
            flexShrink: 0,
            display: "flex",
          }}
          aria-label="Dismiss notification"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
