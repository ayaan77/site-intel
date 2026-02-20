import * as fs from 'fs';
import { Buffer } from 'buffer';

async function main() {
    console.log("🎙️ Testing Voice API Endpoint...");

    const audioPath = 'hello_test.wav';
    if (!fs.existsSync(audioPath)) {
        console.error("❌ Audio file not found. Please generate hello_test.wav first.");
        return;
    }

    const audioBuffer = fs.readFileSync(audioPath);
    const blob = new Blob([audioBuffer], { type: 'audio/wav' });

    // Create native FormData
    const formData = new FormData();
    formData.append('audio', blob, 'hello_test.wav');
    formData.append('mode', 'angletalk');
    formData.append('modelTier', 'fast'); // Use fast tier for quicker test

    console.log("📤 Sending POST request to http://localhost:3000/api/voice ...");

    try {
        const response = await fetch("http://localhost:3000/api/voice", {
            method: 'POST',
            body: formData as any
        });

        if (!response.ok) {
            const err = await response.text();
            console.error(`❌ HTTP Error ${response.status}: ${err}`);
            return;
        }

        const data: any = await response.json();

        console.log("\n✅ Success!");
        console.log("📝 Transcribed Text:", data.transcription);
        console.log("🤖 AI Response:", data.response);

        if (data.audioBase64) {
            console.log("🔊 Received audio payload (base64 size: " + data.audioBase64.length + " bytes)");

            // Save the received audio to verify
            const receivedBuffer = Buffer.from(data.audioBase64, 'base64');
            fs.writeFileSync("test_response.wav", receivedBuffer);
            console.log("💾 Saved response audio to test_response.wav");
        } else {
            console.warn("⚠️ No audio payload returned from Voicebox TTS.");
        }

    } catch (err) {
        console.error("❌ Network or parsing error:", err);
    }
}

main().catch(console.error);
