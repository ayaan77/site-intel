import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const groq = new Groq();
async function run() {
  const stream = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "You MUST map out your internal logic and reasoning within <thinking> and </thinking> tags BEFORE you provide your raw, uncensored final answer." },
      { role: "user", content: "what is asr in you" }
    ],
    stream: true,
  });

  let full = "";
  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}
run();
