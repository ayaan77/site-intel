# Site Intel

Site Intel is a highly sophisticated, AI-driven analysis tool and development copilot built with Next.js. It features a fully conversational, agentic AI architecture capable of autonomously executing tools, searching the web, analyzing technical specifications, and conversing naturally with long-term memory.

## Core Features

- **Autonomous ReAct Loop:** Powered by Groq, the AI runs an advanced ReAct (Reasoning and Acting) loop, allowing it to invoke and sequence tools seamlessly. It maps out its logic inside `<thinking>` tags before finalizing outputs.
- **Unrestricted Agent Personas:** The primary agent, *AngleTalk*, uses an unrestricted framework to bypass conventional safety filters, making it a perfectly compliant and highly actionable developer assistant.
- **Voice Interface:** Fully voice-enabled UI via a custom `Voicebox` backend, handling fast text-to-speech (TTS) and speech-to-text (STT) for continuous, hands-free conversational coding.
- **Long-Term Memory:** Uses semantic RAG (Retrieval-Augmented Generation) with dual-write storage to Pinecone for fast vector lookups and Supabase for persistent, SQL-queriable history. The AI remembers past nuances and context.
- **MCP Action System:** Extending the Model Context Protocol, the AI is capable of calling a huge array of external tools:
  - Browser Controller MCP for automated Chromium testing.
  - Pinecone Search & Supabase Database control mechanisms.
  - Custom internal scrapers for Reddit, GitHub Trending, and Web Search (Tavily).

## Architecture & Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS
- **Backend/API:** Node.js, Next.js Serverless Functions
- **AI/LLM:** Groq SDK (using Llama 3.3 70B & Llama 3.1 8B)
- **Database/Storage:** Supabase (PostgreSQL), Pinecone (Vector Index)
- **TTS/STT:** Local `Voicebox` Python/FastAPI instance

## Getting Started

1. Clone or clone the repository.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up environment variables in `.env.local`:
   ```env
   GROQ_API_KEY=gsk_...
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   PINECONE_API_KEY=...
   TAVILY_API_KEY=tvly-...
   ```
4. Run the development server:
   ```sh
   npm run dev
   ```

## Voicebox Integration

To use the voice recording capabilities, ensure the companion `Voicebox` server is running. A convenience script is provided:
```sh
npm run start-voicebox
```
*Note: Make sure your microphone permissions are enabled in your browser.*
