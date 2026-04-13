export default function TypingIndicator({ username }: { username: string }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="flex gap-1.5 px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
        {username} is typing…
      </span>
    </div>
  );
}