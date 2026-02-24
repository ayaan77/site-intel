"use client";

import { useRef, useCallback, KeyboardEvent, useState } from "react";
import { Mic, Square, Loader2, ArrowUp } from "lucide-react";

interface ChatInputProps {
    value: string;
    onChange: (v: string) => void;
    onSend: () => void;
    onVoiceSend?: (audioBlob: Blob) => void;
    onReadPage?: () => void;
    loading: boolean;
    pageLoading?: boolean;
    placeholder?: string;
    mode: string;
    deepResearch?: boolean;
    onDeepResearchToggle?: () => void;
    // New WebSocket-based voice stream callbacks
    onVoiceStreamStart?: () => void;
    onVoiceStreamEnd?: () => void;
    onVoiceStreamInterrupt?: () => void;
    onVoiceTranscription?: (text: string) => void;
    onVoiceCompletion?: (text: string) => void;
    onVoiceError?: (err: any) => void;
    wsUrl?: string; // e.g., "ws://localhost:4000"
}

export function ChatInput({
    value, onChange, onSend, onVoiceSend, onReadPage,
    loading, pageLoading, placeholder, mode, deepResearch, onDeepResearchToggle,
    onVoiceStreamStart, onVoiceStreamEnd, onVoiceStreamInterrupt,
    onVoiceTranscription, onVoiceCompletion, onVoiceError,
    wsUrl = "ws://localhost:4000"
}: ChatInputProps) {
    const ref = useRef<HTMLTextAreaElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const [isRecording, setIsRecording] = useState(false);

    const adjust = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = "44px";
        el.style.height = Math.min(el.scrollHeight, 140) + "px";
    }, []);

    const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    const toggleRecording = async () => {
        if (isRecording) {
            stopRecording();
        } else {
            await startRecording();
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop());
            mediaStreamRef.current = null;
        }
        if (onVoiceStreamEnd) onVoiceStreamEnd();
    };

    const startRecording = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Voice recording is not supported in this browser.");
            }

            // 1. Establish WebSocket dynamically to support local network devices (e.g. phones)
            const actualWsUrl = wsUrl === "ws://localhost:4000" && typeof window !== 'undefined'
                ? `ws://${window.location.hostname}:4000`
                : wsUrl;

            const ws = new WebSocket(actualWsUrl);
            wsRef.current = ws;

            ws.onopen = async () => {
                console.log("[ChatInput] WebSocket connected.");
                if (onVoiceStreamStart) onVoiceStreamStart();

                // 2. Start Audio Capture (must be requested after user interaction, which toggleRecording is)
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        channelCount: 1,
                        sampleRate: 16000 // typical STT preferred rate
                    }
                });
                mediaStreamRef.current = stream;

                // Use a standard AudioContext (cross-browser safe)
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const audioContext = new AudioContextClass({ sampleRate: 16000 });
                audioContextRef.current = audioContext;

                const source = audioContext.createMediaStreamSource(stream);

                // Use ScriptProcessorNode (deprecated but widely supported for raw PCM capture without extra files)
                // Buffer size 4096 is a good balance between latency and performance (~256ms chunks at 16kHz)
                const processor = audioContext.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;

                processor.onaudioprocess = (e) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        const inputData = e.inputBuffer.getChannelData(0); // Float32Array[-1.0, 1.0]
                        // Convert Float32 to Int16 (common for STT/VAD)
                        const int16Buffer = new Int16Array(inputData.length);
                        for (let i = 0; i < inputData.length; i++) {
                            const s = Math.max(-1, Math.min(1, inputData[i]));
                            int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        }
                        ws.send(int16Buffer.buffer);
                    }
                };

                source.connect(processor);
                processor.connect(audioContext.destination); // Needed for the processor to fire events in some browsers

                setIsRecording(true);
            };

            ws.onmessage = (event) => {
                // If the backend detects VAD end or interruption, it might send a JSON message
                if (typeof event.data === 'string') {
                    try {
                        const msg = JSON.parse(event.data);
                        if (msg.type === 'vad_interruption') {
                            if (onVoiceStreamInterrupt) onVoiceStreamInterrupt();
                        } else if (msg.type === 'vad_stop') {
                            stopRecording();
                        } else if (msg.type === 'transcription') {
                            if (onVoiceTranscription) onVoiceTranscription(msg.text);
                        } else if (msg.type === 'completion') {
                            if (onVoiceCompletion) onVoiceCompletion(msg.text);
                        }
                    } catch (e) {
                        // Not JSON, might be raw text response
                    }
                } else if (event.data instanceof Blob) {
                    // Playback binary audio chunks returning from Voicebox TTS
                    const reader = new FileReader();
                    reader.onload = async () => {
                        if (reader.result && audioContextRef.current) {
                            const arrayBuffer = reader.result as ArrayBuffer;
                            const int16Buffer = new Int16Array(arrayBuffer);
                            const float32Buffer = new Float32Array(int16Buffer.length);
                            for (let i = 0; i < int16Buffer.length; i++) {
                                float32Buffer[i] = int16Buffer[i] / 32768.0;
                            }

                            const audioBuffer = audioContextRef.current.createBuffer(1, float32Buffer.length, 24000); // Voicebox typically outputs 24kHz
                            audioBuffer.getChannelData(0).set(float32Buffer);

                            const source = audioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(audioContextRef.current.destination);
                            source.start();
                        }
                    };
                    reader.readAsArrayBuffer(event.data);
                }
            };

            ws.onerror = (err) => {
                console.error("[ChatInput] WebSocket error", err);
                if (onVoiceError) onVoiceError(err);
                stopRecording();
            };

            ws.onclose = () => {
                console.log("[ChatInput] WebSocket closed.");
                if (isRecording) stopRecording();
            };

        } catch (err) {
            console.error("Microphone or WebSocket failed", err);
            alert("Please allow microphone access and ensure the backend is running.");
            setIsRecording(false);
        }
    };

    const defaultPlaceholder =
        mode === "intelligence" ? "Enter competitor URL (e.g. kashmirbox.com)..." :
            mode === "analyze" ? "Enter GitHub repo URL (e.g. github.com/owner/repo)..." :
                mode === "cro" ? "Enter a URL to audit (e.g. https://yoursite.com)..." :
                    placeholder || "Type a message... (Enter to send, Shift+Enter for newline)";

    return (
        <div className="chat-input-wrap">
            <div className="chat-input-inner">
                <textarea
                    ref={ref}
                    className="chat-input-field"
                    placeholder={isRecording ? "Listening..." : defaultPlaceholder}
                    value={value}
                    onChange={(e) => { onChange(e.target.value); adjust(); }}
                    onKeyDown={handleKey}
                    rows={1}
                    disabled={loading || isRecording}
                    style={{ opacity: isRecording ? 0.5 : 1 }}
                />
                <div className="chat-input-footer flex items-center justify-between mt-2">
                    <div className="chat-input-tools flex items-center gap-2">
                        {onReadPage && (
                            <button
                                className="chat-tool-btn p-2 hover:bg-white/5 rounded-md transition-colors"
                                onClick={onReadPage}
                                disabled={loading || pageLoading || isRecording}
                                title="Read & Analyze Current Page"
                            >
                                {pageLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "📄"}
                            </button>
                        )}
                        {(onVoiceSend || onVoiceStreamStart) && (
                            <button
                                onClick={toggleRecording}
                                disabled={loading && !isRecording}
                                className={`p-2 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-indigo-500/20 text-indigo-400'
                                    }`}
                                title={isRecording ? "Stop Recording" : "Start Voice Chat"}
                            >
                                {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                            </button>
                        )}
                        {onDeepResearchToggle && (
                            <button
                                onClick={onDeepResearchToggle}
                                disabled={loading || isRecording}
                                className={`p-2 rounded-md transition-colors text-sm font-medium flex items-center gap-1.5 ${deepResearch
                                    ? 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/30'
                                    : 'hover:bg-white/5 text-slate-400 hover:text-slate-300'
                                    }`}
                                title="Toggle Deep Research (Automated multi-step analysis)"
                            >
                                🔬 Deep Search
                            </button>
                        )}
                    </div>

                    {isRecording && (
                        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-red-400 text-sm font-medium">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                            Recording Audio...
                        </div>
                    )}

                    <button
                        className={`chat-send-btn p-2 rounded-lg transition-colors ${!value.trim() && !isRecording ? 'opacity-50 cursor-not-allowed text-slate-500' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                        disabled={(!value.trim() && !isRecording) || loading || isRecording}
                        onClick={onSend}
                    >
                        {loading && !isRecording ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <ArrowUp className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
