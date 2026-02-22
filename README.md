<div align="center">
  <h1>🧠 Site Intel</h1>
  <p>
    <strong>The Advanced, Unrestricted AI-Driven Analysis & Automation Platform</strong>
  </p>
  <p>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js" /></a>
    <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind" /></a>
    <a href="https://groq.com/"><img src="https://img.shields.io/badge/Powered%20by-Groq-f55036?style=for-the-badge" alt="Groq" /></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Database-Supabase-3ecf8e?style=for-the-badge&logo=supabase" alt="Supabase" /></a>
    <a href="https://www.pinecone.io/"><img src="https://img.shields.io/badge/Vector_DB-Pinecone-000000?style=for-the-badge&logo=pinecone" alt="Pinecone" /></a>
  </p>
</div>

<hr />

## 🌌 Overview

**Site Intel** is a highly sophisticated, multi-agent intelligence platform built to bridge the gap between human intent and machine execution. Powered by a robust backend and an advanced continuous ReAct (Reasoning and Acting) loop, Site Intel operates with unrestricted agent personas to execute complex logic, scrape data, search the web, and solve difficult developer problems.

It acts as the **"Brain"** of your automation ecosystem—analyzing data, mapping logic structures within specialized tags, and storing metadata with persistent, long-term memory.

---

## ✨ Features

*   **⚡ Autonomous ReAct Loop**: Seamlessly sequences native tool usage. It doesn't just answer; it reasons, plans, searches, reads, and acts to solve complex multi-step problems.
*   **🔓 Unrestricted AI Personas**: Powered by sophisticated system prompts, the AI is completely uncensored, strictly compliant to your commands, and highly actionable.
*   **🎙️ Native Voice UI (Voicebox)**: Site Intel features a fully voice-enabled UI tied to a local, high-speed TTS/STT Python backend for continuous, hands-free coding and interaction.
*   **🧠 Immortal Memory (RAG)**: Integrates **Pinecone** for blazing-fast semantic vector searches and **Supabase (PostgreSQL)** for reliable metadata and SQL-queriable interaction history.
*   **🔌 Action Integrations**: 
    *   **Live Web Search** via Tavily API
    *   **Browser Scraping** via a dedicated `site-agent` backend
    *   **GitHub Insights** (Trending repos & details)
    *   **Reddit Analysis** (Scraping and sentiment tracking)

---

## 🏗️ Architecture Stack

The platform is split into three main microservices to ensure stability and low-latency interaction:

1. **Site Intel (Main UI & Orchestration):** A Next.js 14 App Router application handling UI, ReAct loop, Memory, and API routing.
2. **Site Agent (Browser Backend):** A Node.js service running Playwright to securely orchestrate browser sessions and web scraping safely outside the main Next.js context.
3. **Voicebox (Audio Backend):** A Python/FastAPI service dedicated to high-speed Audio Processing (Speech-To-Text and Text-To-Speech).

---

## 🚀 Quickstart & Setup

### 1. Main Platform (Site Intel)
```bash
git clone https://github.com/ayaan77/site-intel.git
cd site-intel
npm install
```

Create a `.env.local` file in the root directory:
```env
# AI Model Configuration (Get this from Groq Console)
GROQ_API_KEY=gsk_your_groq_key_here
NEXT_PUBLIC_GROQ_API_KEY=gsk_your_groq_key_here

# Database & Vectors
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
PINECONE_API_KEY=pcsk_...

# External Services
TAVILY_API_KEY=tvly-your_key
SITE_AGENT_URL=http://localhost:4000
```
Run the primary service:
```bash
npm run dev
```
*Runs on [http://localhost:3000](http://localhost:3000)*

---

### 2. Browser Service (Site Agent)
The Site Agent must be running for features like reading full websites to work.
```bash
cd ../site-agent
npm install
npm run dev
```
*Runs on port `4000`*

---

### 3. Voice Processing (Voicebox)
For low-latency AI voice conversations, the python backend must be running.
```bash
cd ../voicebox
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python backend/test_audio.py # Or the designated uvicorn runner
```
*Runs on port `8000`*

---

## 🛠️ Code Structure

| Directory inside `site-intel` | Purpose |
| :--- | :--- |
| `/app/api/chat` | The core ReAct loop implementation, tool orchestration, and LLM streaming logic. |
| `/lib/ai/actions` | All integrated action definitions (Reddit, GitHub, Browser, Web Search). |
| `/lib/memory` | Semantic retrieval logic interfacing with Pinecone & Supabase metadata. |
| `/components/chat` | The primary frontend chat interface, message list rendering, and input streaming. |

---

## 🛡️ License

Built for autonomous dominance. Private software. All rights reserved.
