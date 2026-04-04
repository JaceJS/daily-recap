<div align="center">
  <h1>🚀 Daily Recap</h1>

  <p>
    <a href="https://github.com/JaceJS/daily-recap/issues"><img src="https://img.shields.io/github/issues/JaceJS/daily-recap" alt="Issues" /></a>
    <a href="https://github.com/JaceJS/daily-recap/network/members"><img src="https://img.shields.io/github/forks/JaceJS/daily-recap" alt="Forks" /></a>
    <a href="https://github.com/JaceJS/daily-recap/stargazers"><img src="https://img.shields.io/github/stars/JaceJS/daily-recap" alt="Stars" /></a>
    <a href="https://github.com/JaceJS/daily-recap/blob/main/LICENSE"><img src="https://img.shields.io/github/license/JaceJS/daily-recap" alt="License" /></a>
  </p>

  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#contributing">Contributing</a>
  </p>
</div>

---

## 📌 About The Project

**Daily Recap** is a small tool built from a very common problem.

You spend hours coding, push multiple commits, maybe even finish a feature or fix a few bugs. But when it’s time to write your daily report or update your task log, you end up trying to remember what you actually did.

This tool helps you skip that step.

It pulls your activity from GitHub or GitLab, looks at your commits, pull requests, and issues, then turns them into a clean and easy-to-read summary using LLMs via OpenRouter.

Useful if you forgot to write your daily tasks, need a quick update for standup, or just want to see what you’ve done in a certain period.

No more guessing. Just a clear recap of your work.

## <a id="features"></a>✨ Features

- **Multi-Platform Support:** Seamlessly connect and fetch activity from **GitHub** and **GitLab**.
- **AI-Powered Summaries:** Uses local and open-source models via OpenRouter (e.g., Llama 3.3) to generate polished, executive-level daily summaries and strip away granular commit noise.
- **Privacy First & Stateless:** No databases. Your API keys and tokens are securely encrypted into a stateless short-lived `iron-session` cookie.
- **Modern UI/UX:** Built with Tailwind CSS v4 styling, offering a clean, user-friendly interface with sleek glassmorphism touches.

## <a id="tech-stack"></a>🛠 Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router & Server Actions)
- **Library:** [React 19](https://react.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **AI / LLM:** [OpenRouter API](https://openrouter.ai/) for streaming LLM responses
- **Auth & Session:** `iron-session` (Stateless encrypted cookies)
- **Package Manager:** `Bun`

## <a id="getting-started"></a>🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

Ensure you have [Bun](https://bun.sh/) installed on your system.

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/daily-recap-github.git
   cd daily-recap-github
   ```

2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Environment Setup:**
   Copy the example `.env` file to set up your environment variables.

   ```bash
   cp .env.example .env.local
   ```

   Open `.env.local` and populate the required keys:

   ```env
   # Generate a 32+ character secret for secure session encryption
   # MacOS/Linux: openssl rand -base64 32
   SESSION_SECRET="your-super-long-secure-random-secret"

   # OpenRouter API integration
   OPENROUTER_API_KEY="your-openrouter-api-key"
   OPENROUTER_MODEL="meta-llama/llama-3.3-70b-instruct:free"

   # Optional GitLab Private Instance URL (default: https://gitlab.com)
   GITLAB_URL="https://gitlab.com"
   ```

### Running the App

Start the development server with Turbopack for ultra-fast compilation:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## <a id="architecture"></a>🏗 Architecture & Data Flow

This application is built with a highly modular and decoupled architecture to allow easy expansion of new platforms.

```text
UI Component → Server Action (actions/) → Feature Domain (features/)
                     ↕                              ↕
              iron-session cookie           GitHub/GitLab/LLM APIs
```

- **`features/*/`**: Business domains (`auth`, `github`, `gitlab`, `ai`) are strictly isolated. They do not access browser APIs or cookies directly.
- **`actions/`**: Next.js Server Actions validate input, retrieve session states, and bridge the UI to the features.
- **Stateless Authorization**: All Personal Access Tokens (PAT) generated during setup are immediately encrypted into a secure, HTTP-only cookie using `iron-session` and never persisted in a primary database.

## <a id="contributing"></a>🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
