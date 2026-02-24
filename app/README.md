# Site Intel: AI Website Intelligence Platform 🧠⚡

![Project Status](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue) ![Next.js](https://img.shields.io/badge/Framework-Next.js_15-black) ![AI](https://img.shields.io/badge/AI-ElizaOS_Architecture-purple)

**Site Intel** is an advanced AI platform combining **Agentic AI**, **Competitor Intelligence**, and **CRO Auditing** into a single, powerful workspace.

Powered by a custom **ElizaOS-inspired architecture**, it features **AngleTalk** — a multi-modal AI that thinks before it speaks, reasons before it answers, and remembers what you tell it forever.

---

## ✨ Key Features

### 🧠 ElizaOS-Powered AI Engine
Unlike standard chatbots, Site Intel uses a modular agentic architecture:
- **🎭 Character System**: Agents have distinct personalities (`Character`), backstories, and interaction styles.
- **⚡ Action System**: Agents can dynamically select tools (e.g., `analyze_github`, `scan_website`) based on context.
- **📚 Embedded Knowledge**: Agents reference specific tech stacks and patterns from their "lore".

### 🧠 Structured Chain-of-Thought (Reasoning)
AngleTalk now reasons explicitly before answering using a 5-step **Chain-of-Thought** framework inside every `<thinking>` block:
1. **Facts** — What is known for certain?
2. **Assumptions** — What is being assumed, and are they safe?
3. **Plan** — Step-by-step approach to the answer.
4. **Critique** — Is the plan flawed? Is data missing? If so, call a tool.
5. **Final Check** — Does the answer strictly rely on verified facts?

### 🎯 Factual Accuracy Mode
- The AI is explicitly prohibited from hallucinating or guessing facts.
- For any external data (current events, websites, GitHub repos), it **must** call a tool first.
- If tools fail, it states clearly: "I do not have the factual information to answer this," rather than inventing an answer.

### 🏛️ Council Mode (Multi-Agent Consensus)
For complex queries, activate **The Council** for a 3-stage deliberation:
1. **🗳️ Opinions**: Three distinct models (Llama 3 70B, Llama 3 8B, Gemma 2) generate independent answers.
2. **⚖️ Peer Review**: Models anonymously critique each other's reasoning.
3. **👑 Synthesis**: The Chairman model synthesizes the best insights into a final, high-quality response.

### 🔬 Deep Research Mode
Activate **Deep Research** for any topic to get an autonomous, multi-step research report. The AI iterates over subtopics, synthesizes findings, and outputs a comprehensive, structured markdown report.

### 💾 Long-Term Memory (RAG)
Every conversation is automatically stored in a dual database system:
- **Pinecone** — Vector similarity search for semantic retrieval.
- **Supabase** — Relational storage for browsing and managing all memories.
- **Memory Condenser** — Automatically summarizes and compresses old memories to keep the context window efficient.

The AI retrieves relevant memories on every message, making it smarter the more you use it.

### 🕵️ Deep Intelligence & CRO
- **Site Intel**: Enter any URL to extract brand voice, tech stack, and market positioning.
- **CRO Audit**: Analyzes landing pages for conversion killers (Trust, CTA, Layout) with a 0-100 score.
- **GitHub Deep Dive**: Server-side analysis of GitHub repos (File Tree + Content) to understand architecture.

---

## 🤖 The 9 AI Modes

Access these specialized personas via the `/chat` interface:

| Mode | Persona | Capabilities |
| :--- | :--- | :--- |
| **🏗️ Architect** | AngleTalk | Designs scalable systems, generates specs, advises on architecture patterns. |
| **🔥 Roast** | The Roaster | Brutal, no-holds-barred critiques of landing pages and tech stacks. |
| **🤬 CTO** | The CTO | Simulates a high-pressure technical interview or whiteboard session. |
| **⚖️ Compare** | Tech Lead | Side-by-side comparison of libraries/frameworks (pros/cons). |
| **📊 Diagram** | System Designer | Generates Mermaid.js charts for architecture visualization. |
| **🔍 Analyze** | Code Reviewer | Fetches and analyzes GitHub repos (bypassing CORS). |
| **🕵️ Site Intel** | Competitor Analyst | Deep-dives into website strategy, branding, and tech. |
| **🎯 CRO Audit** | Growth Hacker | Scores landing pages and suggests quick wins. |
| **💡 Idea** | Product Manager | Brainstorms features, pivots, and product strategies. |

---

## 🏗️ Technical Architecture

### System Flow
```mermaid
graph TD
    User[User Message] -->|Input| ChatAPI[/api/chat]
    ChatAPI -->|1. Identify| Router{Action or Chat?}
    
    Router -->|Action Detected| Registry[Action Registry]
    Registry -->|Execute| Tool[GitHub / Scraper / CRO]
    Tool -->|Result| ChatAPI
    
    Router -->|Chat| Prompt[Prompt Builder]
    Prompt -->|Context + Lore| LLM[Groq Inference]
    LLM -->|Stream SSE| Client[React UI]
    
    subgraph "ElizaOS Core"
        Registry
        Prompt
    end
```

### Project Structure
```bash
site-intel/
├── app/
│   ├── api/chat/         # Main chat endpoint (Streams SSE, ReAct loop)
│   ├── api/analyze/      # Scraper & Analysis proxy
│   ├── api/memory/       # Memory CRUD (get, delete memories)
│   └── chat/             # Chat UI Page
├── components/
│   ├── chat/             # UI Components (MessageList, Settings, ChatInput)
│   └── cro/              # CRO Report Components
├── lib/
│   ├── ai/
│   │   ├── characters.ts     # Persona & style definitions (Lore, Knowledge)
│   │   ├── prompt-builder.ts # Dynamic prompt assembly + Structured CoT
│   │   ├── prompts.ts        # Mode-specific system prompts (9 modes)
│   │   ├── council.ts        # Multi-agent Council (3-stage consensus)
│   │   ├── deep-research.ts  # Deep Research Mode (multi-step synthesis)
│   │   └── actions/          # Tool definitions (Web Search, GitHub, Reddit, Browser)
│   └── memory/
│       ├── memory-manager.ts # Dual-write to Pinecone + Supabase
│       └── condenser.ts      # Auto-condenses old memories via LLM
└── public/                   # Static assets
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- Groq API Key (for Llama 3.3 70B inference)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/ayaan77/site-intel.git
    cd site-intel
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env.local` file:
    ```bash
    GROQ_API_KEY=gsk_...                  # Get one at console.groq.com
    NEXT_PUBLIC_SUPABASE_URL=https://...  # Supabase project URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... # Supabase anon key
    PINECONE_API_KEY=...                  # For vector memory (pinecone.io)
    TAVILY_API_KEY=tvly-...               # For web search (tavily.com)
    ```

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Open `http://localhost:3000` in your browser.

---

## 📦 Deployment

This project is optimized for **Vercel**.

1.  Push your code to GitHub.
2.  Import the project in Vercel.
3.  Add the `GROQ_API_KEY` to Vercel Environment Variables.
4.  Deploy! 🚀

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
