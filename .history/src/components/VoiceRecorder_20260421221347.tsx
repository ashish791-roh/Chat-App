'use client';

import { useState, useRef } from 'react';
import { Mic, Square, Play, Pause, Send } from 'lucide-react';

interface VoiceRecorderProps {
  onSend: (voiceUrl: string, duration: number) => void;
}

export default function VoiceRecorder({ onSend }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const sendVoiceMessage = () => {
    if (audioUrl && duration > 0) {
      onSend(audioUrl, duration);
      setAudioUrl(null);
      setDuration(0);
    }
  };

  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
      {!audioUrl ? (
        <>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-blue-500'} text-white`}
          >
            {isRecording ? <Square size={20} /> : <Mic size={20} />}
          </button>
          {isRecording && <span className="text-sm text-red-500">{duration}s</span>}
        </>
      ) : (
        <>
          <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
          <button
            onClick={isPlaying ? pauseAudio : playAudio}
            className="p-2 rounded-full bg-green-500 text-white"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <span className="text-sm">{duration}s</span>
          <button
            onClick={sendVoiceMessage}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            <Send size={16} />
          </button>
        </>
      )}
    </div>
  );
}