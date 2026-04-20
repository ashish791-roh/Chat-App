 import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Chat } from "@/types/chat";
 
// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_MSGS_PER_CHAT = 300;
const MAX_RESULTS       = 50;   
 
// ── Types ─────────────────────────────────────────────────────────────────────
export interface SearchResult {
  messageId:   string;
  chatId:      string;
  chatName:    string;
  isGroup:     boolean;
  senderName:  string;
  text:        string;          
  snippet:     string;           
  matchStart:  number;           
  matchLength: number;
  timestamp:   string;           
}
 
interface CachedMessage {
  id:          string;
  senderId:    string;
  senderName:  string;
  text:        string;
  timestamp:   string;
  isDeleted:   boolean;
}
 
// ── Module-level cache ────────────────────────────────────────────────────────
const messageCache = new Map<string, CachedMessage[]>();
 
// ── fetchChatMessages ─────────────────────────────────────────────────────────
async function fetchChatMessages(chatId: string): Promise<CachedMessage[]> {
  if (messageCache.has(chatId)) {
    return messageCache.get(chatId)!;
  }
 
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("timestamp", "desc"),
    limit(MAX_MSGS_PER_CHAT)
  );
 
  const snap = await getDocs(q);
  const msgs: CachedMessage[] = [];
 
  snap.forEach((d) => {
    const data = d.data();
    const text: string = typeof data.text === "string" ? data.text : "";
    if (text.startsWith("data:") || text.startsWith("FILE::")) return;
    if (data.isDeleted) return;
 
    msgs.push({
      id:         d.id,
      senderId:   data.senderId  ?? "",
      senderName: data.senderName ?? "Unknown",
      text,
      timestamp:
        data.timestamp instanceof Timestamp
          ? data.timestamp.toDate().toISOString()
          : data.timestamp ?? new Date().toISOString(),
      isDeleted: data.isDeleted ?? false,
    });
  });
  messageCache.set(chatId, msgs);
  return msgs;
}
 
// ── buildSnippet ──────────────────────────────────────────────────────────────
function buildSnippet(
  text:       string,
  matchIndex: number,
  term:       string
): { snippet: string; matchStart: number; matchLength: number } {
  const WINDOW = 55;
  const start  = Math.max(0, matchIndex - WINDOW);
  const end    = Math.min(text.length, matchIndex + term.length + WINDOW);
  const prefix  = start > 0  ? "…" : "";
  const suffix  = end   < text.length ? "…" : "";
  const snippet = prefix + text.slice(start, end) + suffix;
  const matchStart = matchIndex - start + prefix.length;
  return { snippet, matchStart, matchLength: term.length };
}
 
// ── searchMessages ────────────────────────────────────────────────────────────
export async function searchMessages(
  chats: Chat[],
  term:  string,
): Promise<SearchResult[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return []; 
 
  const lower = trimmed.toLowerCase();
  const results: SearchResult[] = [];
  await Promise.all(
    chats.map(async (chat) => {
      try {
        const msgs = await fetchChatMessages(chat.id);
 
        for (const msg of msgs) {
          const textLower = msg.text.toLowerCase();
          const idx       = textLower.indexOf(lower);
          if (idx === -1) continue;
 
          const { snippet, matchStart, matchLength } = buildSnippet(
            msg.text,
            idx,
            trimmed
          );
 
          results.push({
            messageId:  msg.id,
            chatId:     chat.id,
            chatName:   chat.name,
            isGroup:    chat.isGroup,
            senderName: msg.senderName,
            text:       msg.text,
            snippet,
            matchStart,
            matchLength,
            timestamp:  msg.timestamp,
          });
        }
      } catch (err) {
        console.warn(`[search] Failed to fetch chat ${chat.id}:`, err);
      }
    })
  );
  results.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return results.slice(0, MAX_RESULTS);
}
export function invalidateChatCache(chatId: string): void {
  messageCache.delete(chatId);
}
export function clearSearchCache(): void {
  messageCache.clear();
}
