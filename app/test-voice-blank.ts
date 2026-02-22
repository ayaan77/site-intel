import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function run() {
  const formData = new FormData();
  // We can just pass a dummy blob and the audio parse might fail, or we bypass STT by passing transcription directly?
  // Wait, I can just use curl against the local server!
}
