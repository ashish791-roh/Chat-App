"use client";

/* ================== IMPORTS ================== */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Users, Phone, Video, X, Trash2, Reply,
  Settings, Search, UserPlus, Paperclip, Smile,
  Gift, MoreVertical, Menu, ChevronDown,
  ImageIcon, Zap
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  collection, doc, addDoc, updateDoc, getDoc,
  serverTimestamp, Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/* COMPONENTS */
import ChatBubble from "@/components/ChatBubble";
import ChatEmojiPicker from "@/components/EmojiPicker";
import GifPicker from "@/components/GifPicker";
import ProfileModal from "@/components/ProfileModal";
import MediaSidebar from "@/components/MediaSidebar";
import CallScreen from "@/components/CallScreen";
import PhoneNumberModal from "@/components/PhoneNumberModal";
import UserSearchModal from "@/components/UserSearchModal";
import CreateGroupModal from "@/components/CreateGroupModal";
import GiftPickerModal, { GiftItem } from "@/components/GiftPickerModal";

/* HOOKS */
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { useFriends } from "@/hooks/useFriends";
import { useChats } from "@/hooks/useChats";
import { useMessages } from "@/hooks/useMessages";
import { useCall } from "@/hooks/useCall";
import { useDeliveryStatus } from "@/hooks/useDeliveryStatus";

/* UTILS */
import { socket } from "@/lib/socket";
import { ensureDmChat, cn } from "@/lib/chatHelpers";
import { Message, UserProfile } from "@/types";
import { Chat } from "@/types/chat";

/* ================== AVATAR ================== */
function Avatar({ name, isOnline, src }: any) {
  const initials = name?.slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg">
        {src ? (
          <img src={src} className="w-full h-full rounded-full object-cover" />
        ) : (
          initials
        )}
      </div>

      {isOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-black animate-pulse" />
      )}
    </div>
  );
}

