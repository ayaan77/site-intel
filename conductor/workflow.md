# Development Workflow

## Methodology
We follow **Context-Driven Development**.
1.  **Context First**: update `product.md` or `tech-stack.md` before writing code.
2.  **Plan**: Create a `plan.md` (or use the Agent's internal `implementation_plan`) for complex features.
3.  **Implement**: Write code, preferably TDD where applicable.
4.  **Verify**: Test manually or via automated scripts.

## Agent Collaboration
-   **Agentic Mode**: Use the "Agentic" toggle for complex, multi-step tasks.
-   **Artifacts**: The agent creates artifacts (`task.md`, `walkthrough.md`) in the `brain/` directory.
-   **Conductor**: The agent reads this directory (`conductor/`) to understand the project.

## Code Standards
-   **Components**: Functional components, strictly typed props.
-   **Server Actions**: Use `lib/actions/*` for backend logic (ElizaOS pattern).
-   **API Routes**: `app/api/*` for streaming endpoints.
-   **Environment**: Keep secrets in `.env.local`; never commit keys.

## Git Conventions
-   **Commits**: Conventional Commits (e.g., `feat: add github scraper`, `fix: resolve hydration error`).
-   **Branches**: Feature branches `feat/feature-name`.
