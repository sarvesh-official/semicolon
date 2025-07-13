# 🛠️ Semicolon

**Semicolon** is a CLI-based AI agent that automates project setup directly from documentation. Paste a link to the official docs — Semicolon reads it, understands the steps, runs terminal commands, scaffolds files, and verifies the results. Zero guesswork.

```bash
npx semicolon init https://nextjs.org/docs/getting-started
```

🎯 **Built to solve**:

* Repeating the same setup steps for every project
* Copying outdated boilerplates
* Debugging broken installations due to version drift

✅ **What it does (today):**

* Parses documentation to plan the setup
* Executes real shell commands (`pnpm`, `npx`, `mkdir`, etc.)
* Creates and verifies project files (`tailwind.config.js`, `index.html`, etc.)
* Uses a structured reasoning loop: `THINK → ACTION → VERIFY → OUTPUT`
* Communicates using strict JSON mode — no hallucinations, no surprises

🚧 **Currently supports:**

* OpenAI GPT-4
* Node.js environment
* Frameworks like **Next.js**, **Tailwind**, and **ShadCN**

💡 **Upcoming features:**

* Paste-any-doc support (scraping setup steps)
* Reusable plugin-style commands (`semicolon run add-auth`)
* `.semicolonrc` for preferences and memory
* Multi-model fallback (Claude, Gemini, etc.)

> Semicolon isn’t a code assistant — it’s a **build assistant**.
