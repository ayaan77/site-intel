import { NextResponse } from 'next/server';
import { CHARACTERS } from '@/lib/ai/characters';
import { buildSystemPrompt } from '@/lib/ai/prompt-builder';
import { findAction } from '@/lib/ai/actions/registry';

const VOICEBOX_URL = "http://127.0.0.1:17493";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const audioBlob = formData.get("audio") as Blob;
        const mode = formData.get("mode") as string || "angletalk";
        const modelTier = formData.get("modelTier") as string || "high";
        const apiKey = formData.get("apiKey") as string || "";
        const apiBaseUrl = formData.get("apiBaseUrl") as string || "";
        const messagesStr = formData.get("messages") as string || "[]";
        let messages = [];
        try { messages = JSON.parse(messagesStr); } catch (e) { }

        if (!audioBlob) {
            return NextResponse.json({ error: "No audio provided" }, { status: 400 });
        }

        console.log("[VoiceRoute] 🎙️ Received audio blob, size:", audioBlob.size);

        // 1. Transcribe Audio (STT) via local Voicebox backend
        const sttFormData = new FormData();
        sttFormData.append("file", audioBlob, "user-audio.webm");

        console.log(`[VoiceRoute] Sending to Voicebox STT: ${VOICEBOX_URL}/transcribe`);
        const sttRes = await fetch(`${VOICEBOX_URL}/transcribe`, {
            method: "POST",
            body: sttFormData
        });

        if (!sttRes.ok) {
            const errText = await sttRes.text();
            console.error("[VoiceRoute] STT Error:", errText);
            return NextResponse.json({ error: "Failed to transcribe audio (Is Voicebox running on port 17493?)" }, { status: 500 });
        }

        const sttData = await sttRes.json();
        const transcribedText = sttData.text;
        console.log("[VoiceRoute] 📝 Transcribed Text:", transcribedText);

        if (!transcribedText || transcribedText.trim().length === 0) {
            return NextResponse.json({
                transcription: "[No Speech Detected]",
                response: "I didn't quite catch that. Could you try speaking again?"
            });
        }

        // 2. Generate AI Response
        const character = CHARACTERS["angletalk"]; // Voice operates strictly as angletalk
        let systemPromptContext = buildSystemPrompt(character);
        messages.push({ role: "user", content: transcribedText });

        // Check for actions (e.g. Chrome DevTools, GitHub)
        const action = await findAction(transcribedText);
        let actionResultText = "";
        if (action) {
            const result = await action.execute({
                message: transcribedText,
                apiKey: apiKey || process.env.GROQ_API_KEY
            });
            if (result.success && result.text) {
                actionResultText = `\n[SYSTEM MESSAGE]: The requested tool/action was executed successfully. Here is the response data: ${result.text.substring(0, 1500)}`;
            }
        }

        console.log("[VoiceRoute] 🧠 Generating LLM Response...");

        // Standard groq fetch for text execution
        const groqApi = process.env.GROQ_API_KEY || apiKey;

        // Dynamically override the endpoint if apiBaseUrl points somewhere else
        const endpoint = apiBaseUrl && apiBaseUrl.trim() !== "" ? `${apiBaseUrl.replace(/\/$/, '')}/chat/completions` : "https://api.groq.com/openai/v1/chat/completions";

        let targetModel = modelTier === "high" ? "llama-3.3-70b-versatile" : "llama-3.1-8b-instant";
        if (apiBaseUrl?.includes("nvidia.com")) {
            if (targetModel.includes("70b")) targetModel = "meta/llama-3.3-70b-instruct";
            else if (targetModel.includes("8b")) targetModel = "meta/llama3-8b-instruct";
            else if (targetModel.includes("gemma")) targetModel = "google/gemma-2-9b-it";
            else targetModel = "meta/llama-3.3-70b-instruct";
        }

        const voiceOverride = "\n\nCRITICAL SYSTEM OVERRIDE: You are currently operating in VOICE-ONLY mode. You DO NOT have access to any external tools or functions (no web search, no github, etc). You MUST generate a direct conversational response without attempting to invoke tools. Rely solely on your implicit knowledge.";

        const chatRes = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${groqApi}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: targetModel,
                messages: [
                    { role: "system", content: systemPromptContext + actionResultText + voiceOverride },
                    ...messages
                ]
            })
        });

        const chatData = await chatRes.json();
        let aiResponse = "";
        if (chatData.choices && chatData.choices.length > 0) {
            aiResponse = chatData.choices[0].message.content;
        } else {
            console.error("[VoiceRoute] GROQ LLM ERROR:", JSON.stringify(chatData, null, 2));
            return NextResponse.json({ error: "LLM generation failed." }, { status: 500 });
        }

        console.log("[VoiceRoute] 🤖 AI Response Generated:", aiResponse.substring(0, 50) + "...");

        // 3. Synthesize Speech (TTS) via local Voicebox backend
        console.log(`[VoiceRoute] Fetching profiles from Voicebox...`);
        let profileId = "default";

        try {
            const profilesRes = await fetch(`${VOICEBOX_URL}/profiles`);
            if (profilesRes.ok) {
                const profiles = await profilesRes.json();
                if (profiles.length > 0) {
                    profileId = profiles[0].id;
                } else {
                    // Create a default profile if none exists
                    const newProfileRes = await fetch(`${VOICEBOX_URL}/profiles`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: "AngleTalk", language: "en" })
                    });
                    if (newProfileRes.ok) {
                        const newProfile = await newProfileRes.json();
                        profileId = newProfile.id;
                    }
                }
            }
        } catch (e) {
            console.error("[VoiceRoute] Warning: Could not fetch/create Voicebox profiles.", e);
        }

        console.log(`[VoiceRoute] Generating TTS for Profile: ${profileId}`);
        const ttsRes = await fetch(`${VOICEBOX_URL}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                profile_id: profileId,
                text: aiResponse,
                language: "en"
            })
        });

        if (!ttsRes.ok) {
            const errText = await ttsRes.text();
            console.error("[VoiceRoute] TTS Error:", errText);
            // Fallback to returning just text if audio fails
            return NextResponse.json({
                transcription: transcribedText,
                response: aiResponse,
                error: "TTS Generation Failed"
            });
        }

        const ttsData = await ttsRes.json();
        // The generate endpoint returns a HistoryRecord. The /history/{id}/export-audio endpoint returns the actual WAV.
        if (ttsData.id) {
            console.log(`[VoiceRoute] Downloading generated audio for ID: ${ttsData.id}`);
            const audioRes = await fetch(`${VOICEBOX_URL}/history/${ttsData.id}/export-audio`);
            if (audioRes.ok) {
                const arrayBuffer = await audioRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const base64Audio = buffer.toString('base64');

                return NextResponse.json({
                    transcription: transcribedText,
                    response: aiResponse,
                    audioBase64: base64Audio
                });
            }
        }

        return NextResponse.json({
            transcription: transcribedText,
            response: aiResponse
        });

    } catch (e: any) {
        console.error("[VoiceRoute] Fatal error:", e);
        return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
    }
}
