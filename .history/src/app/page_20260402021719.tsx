"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Users, Phone, Video, X, Trash2,
  Reply, Settings, Search, UserPlus, Paperclip, File,
  Smile, Gift, MoreVertical,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ── Firebase ──────────────────────────────────────────────────────────────────
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase"; // ← your existing firebase init file

// ── Components ────────────────────────────────────────────────────────────────
import ChatBubble from "@/components/ChatBubble";
import { ThemeToggle } from "@/components/ThemeToggle";
import ChatEmojiPicker from "@/components/EmojiPicker";
import GifPicker from "@/components/GifPicker";
import ProfileModal from "@/components/ProfileModal";
import MediaSidebar from "@/components/MediaSidebar";
import TypingIndicator from "@/components/TypingIndicator";

// ── Hooks & Types ─────────────────────────────────────────────────────────────
import { Message } from "@/types";
import { socket } from "@/lib/socket";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage: string;
  lastMessageAt?: Timestamp | null;
  status: string;
  isOnline?: boolean;
  members?: string[];
}

interface Friend {
  uid: string;
  displayName: string;
  avatar?: string | null;
  isOnline?: boolean;
}

interface OnlineStatusMap {
  [userId: string]: boolean;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(" ");
}

/**
 * Build a deterministic 1-to-1 conversation ID from two user UIDs.
 * Always sorted so both sides resolve to the same Firestore document.
 */
function getDmId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("_");
}

// ─── CreateGroupModal (stable — defined outside ChatPage to prevent remounting) ─

const CreateGroupModal = ({
  friends,
  currentUser,
  onClose,
  onCreate,
}: {
  friends: Friend[];
  currentUser: { uid: string; displayName: string };
  onClose: () => void;
  onCreate: (data: { name: string; members: string[] }) => void;
}) => {
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleMember = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const handleSubmit = () => {
    if (!groupName.trim() || selectedIds.length === 0) return;
    onCreate({ name: groupName.trim(), members: [...selectedIds, currentUser.uid] });
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border dark:border-slate-800 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          Create Group
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
              Group Name
            </label>
            <input
              type="text"
              placeholder="Enter group name..."
              className="w-full p-4 mt-1 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border dark:border-slate-700 focus:ring-2 ring-blue-500 outline-none"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
              Select Members
            </label>
            <div className="mt-2 max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {friends.map((friend) => (
                <div
                  key={friend.uid}
                  className={cn(
                    "flex items-center p-3 rounded-2xl cursor-pointer transition-all border",
                    selectedIds.includes(friend.uid)
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500"
                      : "bg-gray-50 dark:bg-slate-800 border-transparent hover:border-gray-300"
                  )}
                  onClick={() => toggleMember(friend.uid)}
                >
                  <div className="relative w-8 h-8 mr-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {friend.displayName.charAt(0)}
                    </div>
                    {friend.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-white dark:border-slate-900 rounded-full" />
                    )}
                  </div>
                  <span className="flex-1 text-sm font-medium">{friend.displayName}</span>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                      selectedIds.includes(friend.uid)
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-400"
                    )}
                  >
                    {selectedIds.includes(friend.uid) && (
                      <X size={12} className="text-white rotate-45" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!groupName.trim() || selectedIds.length === 0}
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-all"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ChatPage ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const router = useRouter();
  const { user: authUser, loading } = useAuth();

  // ── UI States ──────────────────────────────────────────────────────────────
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Real-time States ───────────────────────────────────────────────────────
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [onlineStatusMap, setOnlineStatusMap] = useState<OnlineStatusMap>({});

  // ── Firestore-backed Data ──────────────────────────────────────────────────
  const [friends, setFriends] = useState<Friend[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesUnsubRef = useRef<(() => void) | null>(null);

  // ── Derived current user ───────────────────────────────────────────────────
  const currentUser = authUser
    ? {
        uid: authUser.id,
        displayName: authUser.name,
        profilePic:
          (authUser as any).avatar ?? (authUser as any).profilePic ?? null,
      }
    : null;

  // ─────────────────────────────────────────────────────────────────────────
  // FIRESTORE — Presence: write isOnline to users/{uid}
  // ─────────────────────────────────────────────────────────────────────────
  const writePresence = useCallback(
    async (isOnline: boolean) => {
      if (!currentUser) return;
      try {
        await setDoc(
          doc(db, "users", currentUser.uid),
          {
            isOnline,
            lastSeen: serverTimestamp(),
            displayName: currentUser.displayName,
            ...(currentUser.profilePic ? { avatar: currentUser.profilePic } : {}),
          },
          { merge: true }
        );
      } catch (err) {
        console.error("Presence write failed:", err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser?.uid]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // FIRESTORE — Presence: set online on mount, offline on unmount / tab hide
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    writePresence(true);

    const handleVisibilityChange = () =>
      writePresence(document.visibilityState === "visible");

    const handleBeforeUnload = () => writePresence(false);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      writePresence(false);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  // ─────────────────────────────────────────────────────────────────────────
  // FIRESTORE — Real-time listener: all users (friends + their presence)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const loaded: Friend[] = [];
      const statusPatch: OnlineStatusMap = {};

      snap.forEach((d) => {
        if (d.id === currentUser.uid) return; // skip self
        const data = d.data();
        const isOnline = data.isOnline ?? false;

        loaded.push({
          uid: d.id,
          displayName: data.displayName ?? "Unknown",
          avatar: data.avatar ?? null,
          isOnline,
        });
        statusPatch[d.id] = isOnline;
      });

      setFriends(loaded);
      setOnlineStatusMap((prev) => ({ ...prev, ...statusPatch }));

      // Patch chat list status labels
      setChats((prev) =>
        prev.map((c) => {
          if (c.isGroup) return c;
          const f = loaded.find((x) => x.uid === c.id);
          if (!f) return c;
          return { ...c, isOnline: f.isOnline, status: f.isOnline ? "Active now" : "Offline" };
        })
      );

      // Patch activeChat status label
      setActiveChat((prev) => {
        if (!prev || prev.isGroup) return prev;
        const f = loaded.find((x) => x.uid === prev.id);
        if (!f) return prev;
        return { ...prev, isOnline: f.isOnline, status: f.isOnline ? "Active now" : "Offline" };
      });
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  // ─────────────────────────────────────────────────────────────────────────
  // FIRESTORE — Real-time listener: chats this user is a member of
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", currentUser.uid),
      orderBy("lastMessageAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const loaded: Chat[] = [];

      snap.forEach((d) => {
        const data = d.data();
        const isGroup = data.isGroup ?? false;

        // For DMs, the chat name is the OTHER user's displayName.
        // We store it as the chat's name field at creation time.
        const name = data.name ?? "Unknown";

        loaded.push({
          id: d.id,
          name,
          isGroup,
          lastMessage: data.lastMessage ?? "",
          lastMessageAt: data.lastMessageAt ?? null,
          status: "Offline",
          members: data.members ?? [],
        });
      });

      setChats(loaded);

      // Auto-select first chat only once
      setActiveChat((prev) => {
        if (prev) return prev;
        return loaded[0] ?? null;
      });
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  // ─────────────────────────────────────────────────────────────────────────
  // FIRESTORE — Real-time listener: messages for the active chat
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Tear down the previous listener whenever activeChat changes
    if (messagesUnsubRef.current) {
      messagesUnsubRef.current();
      messagesUnsubRef.current = null;
    }

    if (!activeChat || !currentUser) return;

    const q = query(
      collection(db, "chats", activeChat.id, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const loaded: Message[] = [];
      snap.forEach((d) => {
        const data = d.data();
        loaded.push({
          id: d.id,
          senderId: data.senderId,
          senderName: data.senderName ?? "Unknown",
          receiverId: data.receiverId ?? undefined,
          groupId: data.groupId ?? undefined,
          text: data.text ?? "",
          timestamp:
            data.timestamp instanceof Timestamp
              ? data.timestamp.toDate().toISOString()
              : data.timestamp ?? new Date().toISOString(),
          isMe: data.senderId === currentUser.uid,
          status: data.status ?? "sent",
          replyTo: data.replyTo ?? undefined,
          reactions: data.reactions ?? undefined,
          isDeleted: data.isDeleted ?? false,
        });
      });
      setMessages(loaded);
    });

    messagesUnsubRef.current = unsub;
    return () => {
      unsub();
      messagesUnsubRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?.id, currentUser?.uid]);

  // ── Auth Guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !authUser) {
      router.replace("/auth/login");
    }
  }, [authUser, loading, router]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showEmoji, showGif, replyingTo, uploadProgress, isOtherUserTyping]);

  // ── Socket: connect + emit own presence ───────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    if (!socket.connected) socket.connect();
    socket.emit("user_online", { userId: currentUser.uid });
    return () => {
      socket.emit("user_offline", { userId: currentUser.uid });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  // ── Socket: typing indicators ──────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !activeChat) return;

    const handleTyping = (data: { from: string; to: string }) => {
      if (data.to === currentUser.uid || data.to === activeChat.id) {
        setIsOtherUserTyping(true);
      }
    };
    const handleStopTyping = (data: { from: string; to: string }) => {
      if (data.to === currentUser.uid || data.to === activeChat.id) {
        setIsOtherUserTyping(false);
      }
    };

    socket.on("typing", handleTyping);
    socket.on("stop_typing", handleStopTyping);
    return () => {
      socket.off("typing", handleTyping);
      socket.off("stop_typing", handleStopTyping);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, activeChat?.id]);

  // ─────────────────────────────────────────────────────────────────────────
  // FIRESTORE — Ensure a DM chat document exists (idempotent)
  // ─────────────────────────────────────────────────────────────────────────
  const ensureDmChat = useCallback(
    async (otherUid: string, otherName: string): Promise<string> => {
      if (!currentUser) throw new Error("Not authenticated");
      const chatId = getDmId(currentUser.uid, otherUid);
      const chatRef = doc(db, "chats", chatId);
      const snap = await getDoc(chatRef);
      if (!snap.exists()) {
        await setDoc(chatRef, {
          isGroup: false,
          name: otherName,
          members: [currentUser.uid, otherUid],
          lastMessage: "",
          lastMessageAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      }
      return chatId;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser?.uid]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // FIRESTORE — Send a text message
  // ─────────────────────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!input.trim() || !currentUser || !activeChat) return;

      const text = input.trim();
      setInput("");
      setShowEmoji(false);
      const pendingReply = replyingTo;
      setReplyingTo(null);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit("stop_typing", { from: currentUser.uid, to: activeChat.id });

      try {
        // For DMs, resolve (or create) the deterministic chat document
        const chatId = activeChat.isGroup
          ? activeChat.id
          : await ensureDmChat(activeChat.id, activeChat.name);

        const msgPayload: Record<string, any> = {
          senderId: currentUser.uid,
          senderName: currentUser.displayName,
          text,
          timestamp: serverTimestamp(),
          status: "sent",
          isDeleted: false,
          ...(activeChat.isGroup
            ? { groupId: activeChat.id }
            : { receiverId: activeChat.id }),
          ...(pendingReply
            ? {
                replyTo: {
                  id: pendingReply.id,
                  text: pendingReply.text,
                  senderName: pendingReply.senderName,
                },
              }
            : {}),
        };

        // Write message to Firestore subcollection
        await addDoc(collection(db, "chats", chatId, "messages"), msgPayload);

        // Update parent chat document for sidebar preview
        await updateDoc(doc(db, "chats", chatId), {
          lastMessage: text,
          lastMessageAt: serverTimestamp(),
        });

        // Notify via socket for latency-sensitive signals (typing, etc.)
        socket.emit("send_message", { ...msgPayload, chatId });
      } catch (err) {
        console.error("Send message failed:", err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input, currentUser?.uid, activeChat?.id, replyingTo, ensureDmChat]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // FIRESTORE — Soft-delete a message
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeleteMessage = useCallback(
    async (msg: Message) => {
      if (!activeChat) return;
      try {
        await updateDoc(
          doc(db, "chats", activeChat.id, "messages", msg.id),
          { isDeleted: true, text: "" }
        );
      } catch (err) {
        console.error("Delete message failed:", err);
      }
      setActiveMessage(null);
    },
    [activeChat?.id] // eslint-disable-line
  );

  // ─────────────────────────────────────────────────────────────────────────
  // FIRESTORE — Toggle emoji reaction on a message
  // ─────────────────────────────────────────────────────────────────────────
  const handleReaction = useCallback(
    async (emoji: string) => {
      if (!activeMessage || !currentUser || !activeChat) return;

      const msgRef = doc(
        db,
        "chats",
        activeChat.id,
        "messages",
        activeMessage.id
      );

      try {
        const snap = await getDoc(msgRef);
        if (!snap.exists()) return;

        const current: Record<string, string[]> = snap.data().reactions ?? {};
        const users = current[emoji] ?? [];
        const updated = {
          ...current,
          [emoji]: users.includes(currentUser.uid)
            ? users.filter((u) => u !== currentUser.uid)
            : [...users, currentUser.uid],
        };
        await updateDoc(msgRef, { reactions: updated });
      } catch (err) {
        console.error("Reaction failed:", err);
      }

      setActiveMessage(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeMessage?.id, currentUser?.uid, activeChat?.id]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // FIRESTORE — Create a group chat
  // ─────────────────────────────────────────────────────────────────────────
  const handleCreateGroup = useCallback(
    async (groupData: { name: string; members: string[] }) => {
      if (!currentUser) return;
      try {
        const docRef = await addDoc(collection(db, "chats"), {
          isGroup: true,
          name: groupData.name,
          members: groupData.members,
          lastMessage: "Group created",
          lastMessageAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
        });

        // Notify other members via socket
        socket.emit("create_group", {
          id: docRef.id,
          name: groupData.name,
          members: groupData.members,
          isGroup: true,
        });
      } catch (err) {
        console.error("Create group failed:", err);
      }
      setIsModalOpen(false);
    },
    [currentUser?.uid] // eslint-disable-line
  );

  // ─────────────────────────────────────────────────────────────────────────
  // FIRESTORE — Safe profile update (displayName + avatar only, never uid/auth)
  // ─────────────────────────────────────────────────────────────────────────
  const handleProfileUpdate = useCallback(
    async (updates: { displayName?: string; avatar?: string }) => {
      if (!currentUser) return;
      try {
        // Whitelist safe fields only
        const safe: Record<string, any> = {};
        if (updates.displayName?.trim()) safe.displayName = updates.displayName.trim();
        if (updates.avatar?.trim()) safe.avatar = updates.avatar.trim();
        if (Object.keys(safe).length === 0) return;

        await updateDoc(doc(db, "users", currentUser.uid), safe);

        // Broadcast so all clients update friend names/avatars live
        socket.emit("profile_updated", { userId: currentUser.uid, ...safe });
      } catch (err) {
        console.error("Profile update failed:", err);
      }
    },
    [currentUser?.uid] // eslint-disable-line
  );

  // ── File send ──────────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !activeChat) return;
    e.target.value = ""; // allow re-selecting same file

    setUploadProgress(0);
    let progress = 0;

    const interval = setInterval(async () => {
      progress += 20;
      setUploadProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);

        const isImage = file.type.startsWith("image/");
        // In production: upload to Firebase Storage, use the download URL here.
        const fileUrl = URL.createObjectURL(file);
        const text = isImage ? fileUrl : `📄 ${file.name}`;

        try {
          const chatId = activeChat.isGroup
            ? activeChat.id
            : await ensureDmChat(activeChat.id, activeChat.name);

          await addDoc(collection(db, "chats", chatId, "messages"), {
            senderId: currentUser.uid,
            senderName: currentUser.displayName,
            text,
            timestamp: serverTimestamp(),
            status: "sent",
            isDeleted: false,
            ...(activeChat.isGroup
              ? { groupId: activeChat.id }
              : { receiverId: activeChat.id }),
          });

          await updateDoc(doc(db, "chats", chatId), {
            lastMessage: isImage ? "📷 Photo" : `📄 ${file.name}`,
            lastMessageAt: serverTimestamp(),
          });
        } catch (err) {
          console.error("File message failed:", err);
        }

        setUploadProgress(null);
      }
    }, 150);
  };

  // ── GIF send ───────────────────────────────────────────────────────────────
  const handleGifSend = async (url: string) => {
    if (!currentUser || !activeChat) return;
    setShowGif(false);

    try {
      const chatId = activeChat.isGroup
        ? activeChat.id
        : await ensureDmChat(activeChat.id, activeChat.name);

      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        text: url,
        timestamp: serverTimestamp(),
        status: "sent",
        isDeleted: false,
        ...(activeChat.isGroup
          ? { groupId: activeChat.id }
          : { receiverId: activeChat.id }),
      });

      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: "🎞️ GIF",
        lastMessageAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("GIF send failed:", err);
    }
  };

  // ── Typing indicator emit ──────────────────────────────────────────────────
  const handleInputChange = (val: string) => {
    setInput(val);
    if (!currentUser || !activeChat) return;

    if (val.length > 0) {
      socket.emit("typing", { from: currentUser.uid, to: activeChat.id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing", { from: currentUser.uid, to: activeChat.id });
      }, 2000);
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit("stop_typing", { from: currentUser.uid, to: activeChat.id });
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const activeChatIsOnline =
    !!activeChat && !activeChat.isGroup && !!onlineStatusMap[activeChat.id];

  const activeChatStatus = !activeChat
    ? ""
    : activeChat.isGroup
    ? activeChat.status
    : activeChatIsOnline
    ? "Active now"
    : "Offline";

  const filteredChats = chats.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Loading guard ──────────────────────────────────────────────────────────
  if (loading || !currentUser) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-slate-950 text-blue-600 font-bold">
        Loading BlinkChat...
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden text-gray-900 dark:text-gray-100 transition-colors relative">
      <MediaSidebar
        isOpen={isMediaOpen}
        onClose={() => setIsMediaOpen(false)}
        messages={messages}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        // Uncomment if your ProfileModal accepts an onSave prop:
        // onSave={handleProfileUpdate}
      />

      {isModalOpen && (
        <CreateGroupModal
          friends={friends}
          currentUser={currentUser}
          onClose={() => setIsModalOpen(false)}
          onCreate={handleCreateGroup}
        />
      )}

      {/* ── Message Action Sheet ── */}
      {activeMessage && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          onClick={() => setActiveMessage(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-xs overflow-hidden shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-around items-center p-5 bg-gray-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800">
              {["❤️", "👍", "😂", "😮", "😢", "🔥"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="text-2xl hover:scale-125 transition-transform active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="p-3 space-y-1">
              <button
                onClick={() => {
                  setReplyingTo(activeMessage);
                  setActiveMessage(null);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300"
              >
                <Reply size={18} className="text-blue-600" />
                <span className="font-semibold">Reply</span>
              </button>
              <button
                onClick={() => handleDeleteMessage(activeMessage)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
              >
                <Trash2 size={18} />
                <span className="font-semibold">Delete for everyone</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside className="w-80 border-r border-gray-200 dark:border-slate-800 hidden md:flex flex-col bg-gray-50 dark:bg-slate-900/50">
        {/* Header */}
        <div className="p-5 border-b dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xl">
            <Users size={20} className="bg-blue-600 p-1.5 rounded-lg text-white" />
            BlinkChat
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 text-gray-500 hover:text-blue-600 rounded-full transition-all"
              title="Create Group"
            >
              <UserPlus size={20} />
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Search */}
        <div className="p-4 bg-white dark:bg-slate-900">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats"
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-800 rounded-xl text-xs border-none focus:ring-2 ring-blue-500 outline-none transition-all"
            />
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto space-y-1 bg-white dark:bg-slate-900">
          {filteredChats.map((chat) => {
            const online = !chat.isGroup && !!onlineStatusMap[chat.id];
            return (
              <div
                key={chat.id}
                onClick={() => {
                  setActiveChat(chat);
                  setMessages([]); // clear while Firestore listener loads new messages
                }}
                className={cn(
                  "flex items-center gap-3 p-4 cursor-pointer transition-all border-l-4",
                  activeChat?.id === chat.id
                    ? "bg-blue-50 dark:bg-slate-800 border-blue-600"
                    : "hover:bg-gray-50 dark:hover:bg-slate-800/50 border-transparent"
                )}
              >
                <div className="relative">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm",
                      chat.isGroup
                        ? "bg-gradient-to-br from-orange-400 to-rose-500"
                        : "bg-blue-600"
                    )}
                  >
                    {chat.isGroup ? <Users size={20} /> : chat.name.charAt(0)}
                  </div>
                  {/* Live presence dot */}
                  {!chat.isGroup && (
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-900 rounded-full transition-colors duration-300",
                        online ? "bg-green-500" : "bg-gray-400"
                      )}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold truncate">{chat.name}</h3>
                    <span className="text-[10px] text-gray-400">
                      {chat.lastMessageAt instanceof Timestamp
                        ? chat.lastMessageAt
                            .toDate()
                            .toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                        : ""}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{chat.lastMessage}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current User Footer */}
        <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900">
          <div
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer group"
          >
            <div className="relative">
              {currentUser.profilePic ? (
                <img
                  src={currentUser.profilePic}
                  className="w-10 h-10 rounded-full object-cover border-2 border-blue-600 shadow-sm"
                  alt="Me"
                  onError={(e) => {
                    // Safe fallback: hide broken image
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                  {currentUser.displayName.charAt(0)}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate text-gray-800 dark:text-white">
                {currentUser.displayName}
              </div>
              <p className="text-[9px] text-gray-400 uppercase font-bold tracking-tight">
                Online
              </p>
            </div>
            <Settings
              size={14}
              className="text-gray-400 group-hover:text-blue-500 transition-colors"
            />
          </div>
        </div>
      </aside>

      {/* ── Chat Panel ── */}
      <section className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 relative">
        {/* Header */}
        <header className="h-[73px] px-4 md:px-6 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-20">
          {activeChat ? (
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setIsMediaOpen(true)}
            >
              <div className="relative">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md",
                    activeChat.isGroup
                      ? "bg-gradient-to-tr from-orange-400 to-rose-500"
                      : "bg-blue-600"
                  )}
                >
                  {activeChat.isGroup ? (
                    <Users size={18} />
                  ) : (
                    activeChat.name.charAt(0)
                  )}
                </div>
                {!activeChat.isGroup && (
                  <span
                    className={cn(
                      "absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-800 rounded-full transition-colors duration-300",
                      activeChatIsOnline ? "bg-green-500" : "bg-gray-400"
                    )}
                  />
                )}
              </div>
              <div>
                <h2 className="font-bold text-gray-800 dark:text-white leading-tight">
                  {activeChat.name}
                </h2>
                <span
                  className={cn(
                    "text-[11px] font-bold",
                    activeChatIsOnline ? "text-green-500" : "text-gray-400"
                  )}
                >
                  {activeChatStatus}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-sm">Select a chat to start</div>
          )}

          <div className="flex items-center gap-2 md:gap-4 text-gray-500 dark:text-gray-400">
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <Video size={20} />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <Phone size={20} />
            </button>
            <div className="w-[1px] h-6 bg-gray-200 dark:bg-slate-800 mx-1 hidden md:block" />
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <Search size={20} />
            </button>
            <button
              onClick={() => setIsMediaOpen(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <MoreVertical size={20} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 bg-[#F8F9FB] dark:bg-slate-950 space-y-1"
        >
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col">
              {activeChat?.isGroup && !msg.isMe && (
                <span className="text-[10px] text-blue-600 font-bold ml-12 mb-1 uppercase tracking-wider">
                  {msg.senderName}
                </span>
              )}
              <ChatBubble
                message={msg}
                onReply={setReplyingTo}
                onActionMenu={setActiveMessage}
              />
            </div>
          ))}

          {isOtherUserTyping && activeChat && (
            <TypingIndicator username={activeChat.name} />
          )}

          {uploadProgress !== null && (
            <div className="flex justify-end mb-4">
              <div className="bg-blue-50 dark:bg-slate-800 p-3 rounded-2xl border dark:border-slate-700 w-48">
                <div className="flex items-center gap-3 mb-2">
                  <File size={16} className="text-blue-600 animate-pulse" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase">
                    Uploading...
                  </span>
                </div>
                <div className="h-1 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative z-20">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {replyingTo && (
            <div className="max-w-4xl mx-auto mb-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-t-xl border-l-4 border-blue-600 flex justify-between items-center">
              <div className="truncate pr-4">
                <p className="text-[10px] font-bold text-blue-600 uppercase">
                  Replying to {replyingTo.senderName}
                </p>
                <p className="text-xs text-gray-400 truncate">{replyingTo.text}</p>
              </div>
              <button onClick={() => setReplyingTo(null)}>
                <X size={18} />
              </button>
            </div>
          )}

          {showEmoji && (
            <div className="absolute bottom-20 left-4 z-[100]">
              <ChatEmojiPicker
                onEmojiClick={(e: any) => handleInputChange(input + e)}
                theme="dark"
              />
            </div>
          )}

          {showGif && (
            <div className="absolute bottom-20 left-24 z-[100]">
              <GifPicker onGifClick={handleGifSend} />
            </div>
          )}

          <form
            onSubmit={handleSendMessage}
            className={cn(
              "max-w-4xl mx-auto flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-2 border dark:border-slate-700 transition-all",
              replyingTo ? "rounded-b-2xl" : "rounded-2xl"
            )}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-blue-500"
            >
              <Paperclip size={22} />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowEmoji(!showEmoji);
                setShowGif(false);
              }}
              className="p-2 text-gray-500 hover:text-blue-500"
            >
              <Smile size={22} />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowGif(!showGif);
                setShowEmoji(false);
              }}
              className="p-2 text-gray-500 hover:text-pink-500"
            >
              <Gift size={22} />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={
                activeChat ? "Type a message..." : "Select a chat to start"
              }
              disabled={!activeChat}
              className="flex-1 bg-transparent border-none px-2 py-2 text-sm outline-none dark:text-white disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!input.trim() || !activeChat}
              className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Send size={18} fill="currentColor" />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}