export default function TypingIndicator({ username }: { username: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-none flex gap-1 items-center shadow-sm">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
      </div>
      <span className="text-xs text-gray-500 font-medium">{username} is typing...</span>
    </div>
  );
}