import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { Search, X, MessageSquare, Users, Clock, Loader2 } from "lucide-react";
import { searchMessages, SearchResult } from "@/lib/messageSearch";
import { Chat } from "@/types/chat";
import { cn } from "@/lib/chatHelpers";
 
// ── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  chats:   Chat[];
  myUid:   string;
  onOpen:  (chatId: string, messageId: string) => void;
  onClose: () => void;
}
 
// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
 
  if (mins  < 1)   return "just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
 
// ── HighlightedSnippet ────────────────────────────────────────────────────────
function HighlightedSnippet({
  snippet,
  matchStart,
  matchLength,
}: {
  snippet:     string;
  matchStart:  number;
  matchLength: number;
}) {
  const before = snippet.slice(0, matchStart);
  const match  = snippet.slice(matchStart, matchStart + matchLength);
  const after  = snippet.slice(matchStart + matchLength);
 
  return (
    <span style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
      {before}
      <mark style={{
        background:   "rgba(108,99,255,0.25)",
        color:        "var(--accent-1)",
        borderRadius: "3px",
        padding:      "0 2px",
        fontWeight:   600,
      }}>
        {match}
      </mark>
      {after}
    </span>
  );
}
 
// ── ChatAvatar ────────────────────────────────────────────────────────────────
function ChatAvatar({ name, isGroup }: { name: string; isGroup: boolean }) {
  const gradients = [
    "from-violet-500 to-cyan-500",
    "from-pink-500 to-orange-400",
    "from-emerald-400 to-teal-600",
    "from-blue-500 to-indigo-600",
  ];
  const grad = gradients[name.charCodeAt(0) % gradients.length];
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
 
  return (
    <div
      className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0",
        isGroup
          ? "bg-gradient-to-br from-orange-400 to-rose-500"
          : `bg-gradient-to-br ${grad}`
      )}
    >
      {isGroup ? <Users size={14} /> : initials}
    </div>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function MessageSearchModal({ chats, myUid, onOpen, onClose }: Props) {
  const [term,         setTerm        ] = useState("");
  const [results,      setResults     ] = useState<SearchResult[]>([]);
  const [isSearching,  setIsSearching ] = useState(false);
  const [hasSearched,  setHasSearched ] = useState(false);
  const [activeIndex,  setActiveIndex ] = useState(-1);
 
  const inputRef    = useRef<HTMLInputElement>(null);
  const listRef     = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 
  // Auto-focus input when modal opens
  useEffect(() => { inputRef.current?.focus(); }, []);
 
  // ── Debounced search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
 
    if (term.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      setActiveIndex(-1);
      return;
    }
 
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setActiveIndex(-1);
      try {
        const found = await searchMessages(chats, term);
        setResults(found);
        setHasSearched(true);
      } finally {
        setIsSearching(false);
      }
    }, 300);
 
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [term, chats]);
 
  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") { onClose(); return; }
 
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        const r = results[activeIndex];
        if (r) onOpen(r.chatId, r.messageId);
      }
    },
    [results, activeIndex, onOpen, onClose]
  );
 
  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLElement>("[data-result-item]");
    items[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);
 
  // ── Group results by chat ──────────────────────────────────────────────────
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.chatId] ??= []).push(r);
    return acc;
  }, {});
 
  // Flat index map so keyboard nav works across groups
  const flatResults = results;
 
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
 
      {/* Modal */}
      <div
        role="dialog"
        aria-label="Search messages"
        aria-modal="true"
        className="fixed z-[70] left-1/2 -translate-x-1/2"
        style={{
          top:          "10vh",
          width:        "clamp(320px, 92vw, 660px)",
          maxHeight:    "78vh",
          display:      "flex",
          flexDirection:"column",
          background:   "var(--bg-panel)",
          border:       "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow:    "var(--shadow-lg)",
          overflow:     "hidden",
        }}
      >
        {/* ── Search input row ─────────────────────────────────────────── */}
        <div
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "12px",
            padding:      "14px 16px",
            borderBottom: "1px solid var(--border)",
            flexShrink:   0,
          }}
        >
          {isSearching ? (
            <Loader2 size={18} className="animate-spin shrink-0" style={{ color: "var(--accent-1)" }} />
          ) : (
            <Search size={18} className="shrink-0" style={{ color: "var(--text-muted)" }} />
          )}
 
          <input
            ref={inputRef}
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search messages across all chats…"
            aria-label="Search messages"
            style={{
              flex:       1,
              background: "none",
              border:     "none",
              outline:    "none",
              fontSize:   "15px",
              color:      "var(--text-primary)",
              fontFamily: "var(--font-body)",
            }}
          />
 
          {term && (
            <button
              onClick={() => { setTerm(""); setResults([]); setHasSearched(false); inputRef.current?.focus(); }}
              aria-label="Clear search"
              style={{
                background: "none", border: "none",
                cursor: "pointer", padding: "2px",
                color: "var(--text-muted)", display: "flex",
              }}
            >
              <X size={16} />
            </button>
          )}
 
          <button
            onClick={onClose}
            aria-label="Close search"
            style={{
              background:   "none",
              border:       "1px solid var(--border)",
              borderRadius: "6px",
              cursor:       "pointer",
              padding:      "3px 7px",
              color:        "var(--text-secondary)",
              fontSize:     "11px",
            }}
          >
            Esc
          </button>
        </div>
 
        {/* ── Results area ─────────────────────────────────────────────── */}
        <div
          ref={listRef}
          style={{ overflowY: "auto", flex: 1 }}
          role="listbox"
          aria-label="Search results"
        >
          {/* Loading skeleton */}
          {isSearching && (
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {[1, 2, 3].map((n) => (
                <div key={n} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--bg-elevated)", flexShrink: 0 }} className="animate-pulse" />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ height: 12, width: "40%", borderRadius: 4, background: "var(--bg-elevated)" }} className="animate-pulse" />
                    <div style={{ height: 12, width: "80%", borderRadius: 4, background: "var(--bg-elevated)" }} className="animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}
 
          {/* Empty state — typed enough but nothing found */}
          {!isSearching && hasSearched && results.length === 0 && (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <MessageSquare size={36} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
              <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 6px" }}>
                No messages found
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                Try a different word, or search only covers the 300 most recent messages per chat.
              </p>
            </div>
          )}
 
          {/* Prompt — less than 2 chars */}
          {!isSearching && !hasSearched && term.trim().length < 2 && (
            <div style={{ padding: "32px 24px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                Type at least 2 characters to search across all your chats.
              </p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
                Use <kbd style={{ background: "var(--bg-elevated)", borderRadius: "4px", padding: "1px 5px" }}>↑</kbd>{" "}
                <kbd style={{ background: "var(--bg-elevated)", borderRadius: "4px", padding: "1px 5px" }}>↓</kbd> to navigate,{" "}
                <kbd style={{ background: "var(--bg-elevated)", borderRadius: "4px", padding: "1px 5px" }}>Enter</kbd> to jump.
              </p>
            </div>
          )}
 
          {/* Results grouped by chat */}
          {!isSearching && results.length > 0 && (
            <>
              <div style={{
                padding:    "8px 16px 4px",
                fontSize:   "11px",
                fontWeight: 600,
                color:      "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}>
                {results.length} result{results.length !== 1 ? "s" : ""} across {Object.keys(grouped).length} chat{Object.keys(grouped).length !== 1 ? "s" : ""}
              </div>
 
              {Object.entries(grouped).map(([chatId, chatResults]) => {
                const first = chatResults[0];
                return (
                  <div key={chatId}>
                    {/* Chat group header */}
                    <div style={{
                      display:     "flex",
                      alignItems:  "center",
                      gap:         "8px",
                      padding:     "10px 16px 4px",
                      position:    "sticky",
                      top:         0,
                      background:  "var(--bg-panel)",
                      zIndex:      2,
                      borderTop:   "1px solid var(--border)",
                    }}>
                      <ChatAvatar name={first.chatName} isGroup={first.isGroup} />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {first.chatName}
                      </span>
                      <span style={{
                        marginLeft:   "auto",
                        fontSize:     "11px",
                        color:        "var(--text-muted)",
                        background:   "var(--bg-elevated)",
                        borderRadius: "20px",
                        padding:      "1px 8px",
                      }}>
                        {chatResults.length} match{chatResults.length !== 1 ? "es" : ""}
                      </span>
                    </div>
 
                    {/* Individual results */}
                    {chatResults.map((result) => {
                      const flatIdx = flatResults.indexOf(result);
                      const isActive = flatIdx === activeIndex;
 
                      return (
                        <button
                          key={result.messageId}
                          data-result-item
                          role="option"
                          aria-selected={isActive}
                          onClick={() => onOpen(result.chatId, result.messageId)}
                          onMouseEnter={() => setActiveIndex(flatIdx)}
                          style={{
                            display:     "flex",
                            alignItems:  "flex-start",
                            gap:         "12px",
                            width:       "100%",
                            padding:     "10px 16px",
                            background:  isActive ? "var(--bg-elevated)" : "transparent",
                            border:      "none",
                            cursor:      "pointer",
                            textAlign:   "left",
                            transition:  "background 0.1s",
                          }}
                        >
                          {/* Sender avatar initials */}
                          <div style={{
                            width:          32,
                            height:         32,
                            borderRadius:   "50%",
                            background:     "var(--bg-elevated)",
                            border:         "1px solid var(--border)",
                            display:        "flex",
                            alignItems:     "center",
                            justifyContent: "center",
                            fontSize:       "11px",
                            fontWeight:     700,
                            color:          "var(--accent-1)",
                            flexShrink:     0,
                            marginTop:      "2px",
                          }}>
                            {result.senderName.charAt(0).toUpperCase()}
                          </div>
 
                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                                {result.senderName}
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "var(--text-muted)", marginLeft: "auto", flexShrink: 0 }}>
                                <Clock size={10} />
                                {formatRelativeTime(result.timestamp)}
                              </span>
                            </div>
                            <HighlightedSnippet
                              snippet={result.snippet}
                              matchStart={result.matchStart}
                              matchLength={result.matchLength}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
 
              {/* Footer note */}
              <div style={{ padding: "12px 16px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center", borderTop: "1px solid var(--border)" }}>
                Searching the  most recent messages per chat. Click a result to jump to it.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
