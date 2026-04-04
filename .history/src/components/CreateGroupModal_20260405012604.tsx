"use client";

import { useState } from "react";
import { X, Phone } from "lucide-react";
import { UserProfile } from "@/types/chat";
import { cn } from "@/lib/chatHelpers";

interface CreateGroupModalProps {
  friends: UserProfile[];
  currentUser: { uid: string; displayName: string };
  onClose: () => void;
  onCreate: (data: { name: string; members: string[] }) => void;
}

export default function CreateGroupModal({
  friends,
  currentUser,
  onClose,
  onCreate,
}: CreateGroupModalProps) {
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
              placeholder="Enter group name…"
              className="w-full p-4 mt-1 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border dark:border-slate-700 focus:ring-2 ring-blue-500 outline-none"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
              Select Members
            </label>
            <div className="mt-2 max-h-52 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {friends.map((friend) => (
                <div
                  key={friend.uid}
                  className={cn(
                    "flex items-center p-3 rounded-2xl cursor-pointer transition-all border",
                    selectedIds.includes(friend.uid)
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500"
                      : "bg-gray-50 dark:bg-slate-800 border-transparent hover:border-gray-300 dark:hover:border-slate-600"
                  )}
                  onClick={() => toggleMember(friend.uid)}
                >
                  <div className="relative w-9 h-9 mr-3 shrink-0">
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                      {friend.displayName.charAt(0)}
                    </div>
                    {friend.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-white dark:border-slate-900 rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{friend.displayName}</p>
                    {friend.phoneNumber && (
                      <p className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Phone size={8} />
                        {friend.phoneNumber}
                      </p>
                    )}
                  </div>

                  <div
                    className={cn(
                      "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center shrink-0",
                      selectedIds.includes(friend.uid)
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-400"
                    )}
                  >
                    {selectedIds.includes(friend.uid) && (
                      <X size={11} className="text-white rotate-45" />
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
}