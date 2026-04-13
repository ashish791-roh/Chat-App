"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { socket } from "@/lib/socket";
import {
  createPeerConnection,
  getLocalStream,
  addStreamToPeer,
  stopStream,
} from "@/lib/webrtc";
import { CallState, ActiveCall } from "@/types";

interface UseCallOptions {
  myUid: string;
  myName: string;
  myPhone?: string;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
}

export function useCall({
  myUid,
  myName,
  myPhone,
  localVideoRef,
  remoteVideoRef,
}: UseCallOptions) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  // ── Internal cleanup ──────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setIsMuted(false);
    setIsCameraOff(false);
  }, [localVideoRef, remoteVideoRef]);

  // ── Start outgoing call ───────────────────────────────────────────────────

  const startCall = useCallback(
    async (peerId: string, peerName: string, peerPhone: string | undefined, isVideo: boolean) => {
      if (callState !== "idle") return;

      const callId = `${myUid}_${peerId}_${Date.now()}`;

      setActiveCall({ callId, peerId, peerName, peerPhone, isVideo, direction: "outgoing" });
      setCallState("calling");

      const stream = await getLocalStream(isVideo);
      if (!stream) {
        setCallState("idle");
        setActiveCall(null);
        return;
      }

      localStreamRef.current = stream;
      if (localVideoRef.current && isVideo) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection(peerId, (remoteStream) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      });

      addStreamToPeer(pc, stream);
      pcRef.current = pc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call:offer", {
        callId,
        to: peerId,
        from: myUid,
        fromName: myName,
        fromPhone: myPhone,
        offer,
        isVideo,
      });
    },
    [callState, myUid, myName, myPhone, localVideoRef, remoteVideoRef]
  );

  // ── Accept incoming call ──────────────────────────────────────────────────

  const acceptCall = useCallback(async () => {
    if (!activeCall) return;

    const stream = await getLocalStream(activeCall.isVideo);
    if (!stream) return;

    localStreamRef.current = stream;
    if (localVideoRef.current && activeCall.isVideo) {
      localVideoRef.current.srcObject = stream;
    }

    const pc = createPeerConnection(activeCall.peerId, (remoteStream) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    });

    addStreamToPeer(pc, stream);
    pcRef.current = pc;

    const offer = activeCall._offer!;
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("call:answer", {
      callId: activeCall.callId,
      to: activeCall.peerId,
      answer,
    });

    setCallState("active");
  }, [activeCall, localVideoRef, remoteVideoRef]);

  // ── End / decline call ────────────────────────────────────────────────────

  const endCall = useCallback(
    (reason: "end" | "decline" = "end") => {
      if (activeCall) {
        socket.emit("call:end", {
          callId: activeCall.callId,
          to: activeCall.peerId,
          reason,
        });
      }
      cleanup();
      setCallState("ended");
      setTimeout(() => {
        setCallState("idle");
        setActiveCall(null);
      }, 1500);
    },
    [activeCall, cleanup]
  );

  // ── Toggle mute ───────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = isMuted)); // flip
    setIsMuted((m) => !m);
  }, [isMuted]);

  // ── Toggle camera ─────────────────────────────────────────────────────────

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = isCameraOff)); // flip
    setIsCameraOff((c) => !c);
  }, [isCameraOff]);

  // ── Socket listeners ──────────────────────────────────────────────────────

  useEffect(() => {
    // Incoming offer
    const onOffer = (data: {
      callId: string;
      from: string;
      fromName: string;
      fromPhone?: string;
      offer: RTCSessionDescriptionInit;
      isVideo: boolean;
    }) => {
      if (callState !== "idle") {
        // Busy — auto decline
        socket.emit("call:end", { callId: data.callId, to: data.from, reason: "busy" });
        return;
      }
      setActiveCall({
        callId: data.callId,
        peerId: data.from,
        peerName: data.fromName,
        peerPhone: data.fromPhone,
        isVideo: data.isVideo,
        direction: "incoming",
        _offer: data.offer,
      });
      setCallState("incoming");
    };

    // Peer accepted — set remote description
    const onAnswer = async (data: { answer: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        setCallState("active");
      } catch (err) {
        console.error("setRemoteDescription failed:", err);
      }
    };

    // ICE candidate from peer
    const onIceCandidate = async (data: { candidate: RTCIceCandidateInit }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {}
    };

    // Remote ended/declined
    const onEnd = () => {
      cleanup();
      setCallState("ended");
      setTimeout(() => {
        setCallState("idle");
        setActiveCall(null);
      }, 1500);
    };

    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice-candidate", onIceCandidate);
    socket.on("call:end", onEnd);

    return () => {
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice-candidate", onIceCandidate);
      socket.off("call:end", onEnd);
    };
  }, [callState, cleanup]);

  return {
    callState,
    activeCall,
    isMuted,
    isCameraOff,
    startCall,
    acceptCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}