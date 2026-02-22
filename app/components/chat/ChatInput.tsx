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
}

export function ChatInput({ value, onChange, onSend, onVoiceSend, onReadPage, loading, pageLoading, placeholder, mode }: ChatInputProps) {
    const ref = useRef<HTMLTextAreaElement>(null);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

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
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        } else {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error("Voice recording is not supported in this browser or context (requires HTTPS or localhost).");
                }
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunksRef.current.push(e.data);
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    stream.getTracks().forEach(track => track.stop());
                    if (onVoiceSend) onVoiceSend(audioBlob);
                };

                mediaRecorder.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Microphone access denied or failed", err);
                alert("Please allow microphone access to use voice chat.");
            }
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
                        {onVoiceSend && (
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
