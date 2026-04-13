"use client";

import { useState, useEffect } from "react";
import { Phone, PhoneOff, Mic, MicOff, VideoOff, Camera, Video } from "lucide-react";
import { CallState, ActiveCall } from "@/types";
import { cn } from "@/lib/chatHelpers";

interface CallScreenProps {
  callState: CallState;
  activeCall: ActiveCall | null;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  isMuted: boolean;
  isCameraOff: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

export default function CallScreen({
  callState,
  activeCall,
  localVideoRef,
  remoteVideoRef,
  isMuted,
  isCameraOff,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleCamera,
}: CallScreenProps) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (callState !== "active") { setDuration(0); return; }
    const t = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, [callState]);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (!activeCall) return null;

  const isVideo = activeCall.isVideo;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      {/* Background */}
      {isVideo ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
      )}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      <div className="relative z-10 flex flex-col items-center justify-between h-full py-16 w-full max-w-sm mx-auto px-6">

        {/* Caller info */}
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-4xl font-bold shadow-2xl ring-4 ring-white/20">
              {activeCall.peerName.charAt(0)}
            </div>
            {/* Pulsing rings while ringing */}
            {(callState === "calling" || callState === "incoming") && (
              <>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-ping pointer-events-none"
                    style={{ animationDelay: `${i * 0.35}s`, animationDuration: "1.6s" }}
                  />
                ))}
              </>
            )}
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">{activeCall.peerName}</h2>
            {activeCall.peerPhone && (
              <p className="text-white/60 text-sm mt-0.5">{activeCall.peerPhone}</p>
            )}
            <p className="text-white/70 text-sm mt-2 font-medium tracking-wide">
              {callState === "calling" && "Calling…"}
              {callState === "incoming" && (isVideo ? "Incoming video call" : "Incoming voice call")}
              {callState === "active" && formatDuration(duration)}
              {callState === "ended" && "Call ended"}
            </p>
          </div>
        </div>

        {/* Local pip for video call */}
        {isVideo && callState === "active" && (
          <div className="absolute top-20 right-6 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Controls */}
        <div className="w-full">
          {callState === "incoming" ? (
            <div className="flex justify-around items-end">
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={onDecline}
                  className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-xl hover:bg-red-600 active:scale-95 transition-all"
                >
                  <PhoneOff size={26} className="text-white" />
                </button>
                <span className="text-white/70 text-xs font-medium">Decline</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={onAccept}
                  className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-xl hover:bg-green-600 active:scale-95 transition-all animate-bounce"
                >
                  {isVideo ? <Video size={26} className="text-white" /> : <Phone size={26} className="text-white" />}
                </button>
                <span className="text-white/70 text-xs font-medium">Accept</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-around items-end">
              {/* Mute */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={onToggleMute}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all",
                    isMuted ? "bg-white text-slate-900" : "bg-white/20 text-white"
                  )}
                >
                  {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>
                <span className="text-white/70 text-xs">{isMuted ? "Unmute" : "Mute"}</span>
              </div>

              {/* Camera (video only) */}
              {isVideo && (
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={onToggleCamera}
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all",
                      isCameraOff ? "bg-white text-slate-900" : "bg-white/20 text-white"
                    )}
                  >
                    {isCameraOff ? <VideoOff size={22} /> : <Camera size={22} />}
                  </button>
                  <span className="text-white/70 text-xs">{isCameraOff ? "Show cam" : "Hide cam"}</span>
                </div>
              )}

              {/* End */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={onEnd}
                  className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-xl hover:bg-red-600 active:scale-95 transition-all"
                >
                  <PhoneOff size={26} className="text-white" />
                </button>
                <span className="text-white/70 text-xs">End</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}