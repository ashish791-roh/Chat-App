import { socket } from "@/lib/socket";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// ─── Create a configured RTCPeerConnection ─────────────────────────────────

export function createPeerConnection(
  peerId: string,
  onRemoteStream: (stream: MediaStream) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection(ICE_SERVERS);

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("call:ice-candidate", {
        to: peerId,
        candidate: e.candidate,
      });
    }
  };

  pc.ontrack = (e) => {
    if (e.streams[0]) onRemoteStream(e.streams[0]);
  };

  return pc;
}

// ─── Get local audio/video stream ────────────────────────────────────────

export async function getLocalStream(
  isVideo: boolean
): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: isVideo ? { width: 1280, height: 720 } : false,
    });
  } catch (err) {
    console.error("Media access denied:", err);
    return null;
  }
}

// ─── Add local tracks to peer connection ─────────────────────────────────

export function addStreamToPeer(
  pc: RTCPeerConnection,
  stream: MediaStream
): void {
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));
}

// ─── Stop all local tracks ────────────────────────────────────────────────

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}