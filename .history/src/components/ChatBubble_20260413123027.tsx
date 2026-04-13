
"use client";

import { cn } from "@/lib/chatHelpers";

export default function ChatBubble({
  message,
  onReply,
  onActionMenu,
}: any) {
  const isMe = message.isMe;

  return (
    <div
      className={cn(
        "flex w-full mb-2 group",
        isMe ? "justify-end" : "justify-start"
      )}
      onContextMenu={(e) => {
        e.preventDefault();
        onActionMenu(message);
      }}
    >
      <div
        className={cn(
          "relative px-4 py-2 rounded-2xl max-w-[75%] shadow-sm transition-all duration-200",
          "hover:scale-[1.01]",
          isMe
            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-sm"
            : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 rounded-bl-sm border dark:border-slate-700"
        )}
      >
        {/* Reply Preview */}
        {message.replyTo && (
          <div className="text-xs opacity-70 border-l-2 pl-2 mb-1">
            <span className="font-semibold">
              {message.replyTo.senderName}
            </span>
            <p className="truncate">{message.replyTo.text}</p>
          </div>
        )}

        {/* Message */}
        {message.text?.startsWith("http") ? (
          <img
            src={message.text}
            className="rounded-lg max-h-60"
          />
        ) : (
          <p className="text-sm leading-relaxed">{message.text}</p>
        )}

        {/* Footer */}
        <div className="flex justify-end items-center gap-1 mt-1">
          <span className="text-[10px] opacity-70">
            {message.timestamp?.toDate?.().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          {isMe && (
            <span className="text-[10px]">
              {message.status === "sent" && "✓"}
              {message.status === "delivered" && "✓✓"}
              {message.status === "seen" && "✓✓"}
            </span>
          )}
        </div>

        {/* Reactions */}
        {message.reactions && (
          <div className="flex gap-1 mt-1">
            {Object.entries(message.reactions).map(
              ([emoji, users]: any) => (
                <span
                  key={emoji}
                  className="text-xs bg-black/10 px-2 py-[2px] rounded-full"
                >
                  {emoji} {users.length}
                </span>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
