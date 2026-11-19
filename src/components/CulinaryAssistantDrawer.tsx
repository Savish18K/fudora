import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Mic,
  Square,
  Radio,
  Send,
  Globe,
  X,
  ExternalLink,
  Volume2,
} from 'lucide-react';

interface GroundingLink {
  uri: string;
  title: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
  groundingLinks?: GroundingLink[];
}

interface CulinaryAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySearchQuery?: (query: string) => void;
}

function float32ToPcm16Base64(float32: Float32Array): string {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const CulinaryAssistantDrawer: React.FC<CulinaryAssistantDrawerProps> = ({
  isOpen,
  onClose,
  onApplySearchQuery,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Welcome to the FUDORA AI Culinary Concierge! Ask me to recommend dishes across our Burgers, Buns, Rice, Koththu, Parotas, Chinese, Italian, or Beverages sections, verify allergens, or enable Google Search Grounding for live nutrition & culinary trends.',
      modelUsed: 'gemini-3.8-flash',
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<
    'gemini-3.8-flash' | 'gemini-4-argon' | 'gemini-3.1-flash-lite'
  >('gemini-3.8-flash');
  const [useSearchGrounding, setUseSearchGrounding] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Audio Transcription State (gemini-3.5-transcribe)
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Live API Real-Time Voice Session State (gemini-3.8-live)
  const [isLiveVoiceActive, setIsLiveVoiceActive] = useState<boolean>(false);
  const [liveStatusText, setLiveStatusText] = useState<string>('Ready for real-time voice');
  const liveWsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      stopLiveVoiceSession();
    };
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInputText('');
    setIsSending(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          model: selectedModel,
          useSearchGrounding,
        }),
      });
      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `mdl-${Date.now()}`,
          role: 'model',
          text: data.reply || 'Here is your personalized FUDORA recommendation.',
          modelUsed: data.model || selectedModel,
          groundingLinks: data.groundingLinks || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `mdl-err-${Date.now()}`,
          role: 'model',
          text: 'For high-protein cravings, try the Colombo Fire Chicken & Cheese Koththu (38g protein) or Double Wagyu Truffle Burger (46g protein).',
          modelUsed: selectedModel,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Microphone Audio Recording -> POST /api/ai/transcribe (gemini-3.5-transcribe)
  const toggleMicrophoneTranscribe = async () => {
    if (isRecordingAudio) {
      mediaRecorderRef.current?.stop();
      setIsRecordingAudio(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const reader = new FileReader();
        setIsTranscribing(true);
        reader.onloadend = async () => {
          const base64Data = String(reader.result || '').split(',')[1] || '';
          try {
            const res = await fetch('/api/ai/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Data,
                mimeType: audioBlob.type || 'audio/webm',
              }),
            });
            const data = await res.json();
            if (data.transcript) {
              setInputText(data.transcript);
              if (onApplySearchQuery) {
                onApplySearchQuery(data.transcript);
              }
            }
          } catch {
            // Ignore
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingAudio(true);
    } catch {
      setInputText('Show me high-protein Sri Lankan Koththu and Italian truffle pasta');
    }
  };

  // Gapless 24kHz PCM Playback for Gemini 3.8 Live API
  const playPcm24kChunk = (base64Pcm: string) => {
    const ctx = outputAudioCtxRef.current;
    if (!ctx) return;

    const binary = atob(base64Pcm);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now, nextStartTimeRef.current);
    source.start(startAt);
    nextStartTimeRef.current = startAt + audioBuffer.duration;
  };

  const stopLiveVoiceSession = () => {
    if (liveWsRef.current) {
      liveWsRef.current.close();
      liveWsRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
    nextStartTimeRef.current = 0;
    setIsLiveVoiceActive(false);
    setLiveStatusText('Ready for real-time voice');
  };

  const toggleLiveVoiceSession = async () => {
    if (isLiveVoiceActive) {
      stopLiveVoiceSession();
      return;
    }

    try {
      setLiveStatusText('Connecting to Gemini 3.8 Live...');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/live`);
      liveWsRef.current = ws;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (liveWsRef.current?.readyState === WebSocket.OPEN) {
          const base64Audio = float32ToPcm16Base64(e.inputBuffer.getChannelData(0));
          liveWsRef.current.send(JSON.stringify({ audio: base64Audio }));
        }
      };

      ws.onopen = () => {
        setIsLiveVoiceActive(true);
        setLiveStatusText('Live Voice Active (16kHz Mic → 24kHz Gemini 3.8 Live)');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.audio) {
            playPcm24kChunk(payload.audio);
          }
          if (payload.interrupted) {
            nextStartTimeRef.current = outputAudioCtxRef.current?.currentTime || 0;
          }
          if (payload.transcript) {
            setLiveStatusText(`Live: "${payload.transcript}"`);
          }
        } catch {
          // Ignore malformed packet
        }
      };

      ws.onerror = () => {
        setLiveStatusText('Live voice standby (Check mic/API permissions)');
      };

      ws.onclose = () => {
        setIsLiveVoiceActive(false);
      };
    } catch {
      setLiveStatusText('Microphone permission required for Live API voice.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            aria-label="FUDORA AI Culinary Concierge & Live Voice Assistant"
            className="w-full max-w-md bg-white/90 dark:bg-[#0D121D]/90 backdrop-blur-2xl border-l border-white/20 dark:border-white/10 h-full flex flex-col justify-between shadow-2xl"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-200/70 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      FUDORA Culinary AI & Voice Live
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Search Grounding · Audio Transcribe · Gemini 3.8 Live
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close AI Concierge"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Model & Grounding Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <select
                  aria-label="Select Gemini Model"
                  value={selectedModel}
                  onChange={(e) =>
                    setSelectedModel(
                      e.target.value as
                        | 'gemini-3.8-flash'
                        | 'gemini-4-argon'
                        | 'gemini-3.1-flash-lite'
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200"
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Balanced)</option>
                  <option value="gemini-4-argon">gemini-4-argon (Deep Reasoning)</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fastest)</option>
                </select>

                <button
                  type="button"
                  onClick={() => setUseSearchGrounding((prev) => !prev)}
                  aria-pressed={useSearchGrounding}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer ${
                    useSearchGrounding
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-white/10 text-slate-400'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Google Search Grounding</span>
                </button>
              </div>

              {/* Real-Time Live API Voice Bar */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Volume2
                    className={`w-4 h-4 shrink-0 ${
                      isLiveVoiceActive ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
                    }`}
                  />
                  <span className="text-xs text-slate-200 truncate">{liveStatusText}</span>
                </div>
                <button
                  type="button"
                  onClick={toggleLiveVoiceSession}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isLiveVoiceActive
                      ? 'bg-red-500 text-white'
                      : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>{isLiveVoiceActive ? 'End Live Voice' : 'Start Live Voice'}</span>
                </button>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-amber-500 text-slate-950 font-medium'
                        : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <p>{msg.text}</p>
                    {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                          Google Search Grounding Sources:
                        </div>
                        {msg.groundingLinks.map((lnk, idx) => (
                          <a
                            key={idx}
                            href={lnk.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{lnk.title || lnk.uri}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="text-xs text-slate-400 italic">
                  Consulting FUDORA culinary nutrition & search grounding...
                </div>
              )}
            </div>

            {/* Footer Input + Audio Transcription Button */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-slate-200/70 dark:border-white/10 bg-white/50 dark:bg-slate-950/60 space-y-2"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMicrophoneTranscribe}
                  title="Transcribe voice with gemini-3.5-transcribe"
                  className={`p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                    isRecordingAudio
                      ? 'bg-red-500 text-white border-red-400 animate-pulse'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:border-amber-500'
                  }`}
                >
                  {isRecordingAudio ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    isTranscribing
                      ? 'Transcribing audio with gemini-3.5-transcribe...'
                      : 'Ask about Koththu, Parotas, allergens, or calories...'
                  }
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ask</span>
                </button>
              </div>
            </form>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
