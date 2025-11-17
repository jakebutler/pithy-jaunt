# Pithy Jaunt

<!-- Deployment test: Vercel ignore build step verification -->

> Transform natural language into working pull requests with AI-powered DevOps automation

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Pithy Jaunt is a mobile-first and web-enabled Agent-DevOps autopilot that turns natural language tasks into working pull requests. Simply connect a public GitHub repository, describe what you want built (via voice or text), and watch as AI agents analyze your code, implement changes, test them, and create ready-to-merge PRs—complete with screenshots.

## ✨ Key Features

- 🎯 **Natural Language Task Input** - Describe features in plain English or use voice commands
- 🔍 **Intelligent Code Analysis** - Powered by CodeRabbit for deep repository understanding
- 🤖 **Multi-LLM Agent Support** - Switch between OpenAI and Anthropic models
- 🏗️ **Ephemeral Execution Environments** - Isolated Daytona workspaces for safe code generation
- 📸 **Automated UI Testing** - Browser Use captures screenshots and validates changes
- 📱 **Mobile & Web** - Full-featured iOS/Android app and Next.js web interface
- 🔔 **Smart Notifications** - Get notified on mobile when PRs are ready for review
- ⚡ **Real-time Execution Logs** - Watch your code being written in real-time via SSE

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- GitHub account with a public repository
- API keys for: OpenAI/Anthropic, Daytona, CodeRabbit, Supabase

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pithy-jaunt.git
cd pithy-jaunt

# Install dependencies (web)
npm install

# Install dependencies (mobile)
cd mobile
npm install
```

### Configuration

Create a `.env.local` file in the root directory:

```env
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
GITHUB_TOKEN=your_github_token
DAYTONA_API_KEY=your_daytona_key
GALILEO_API_KEY=your_galileo_key
CODERABBIT_API_KEY=your_coderabbit_key
RESEND_API_KEY=your_resend_key
MODEL_PROVIDER=openai
MODEL_NAME=gpt-4o

# Data retention & cleanup
LOG_RETENTION_DAYS=7
WORKSPACE_CLEANUP_ENABLED=true
WORKSPACE_MAX_CONCURRENT=100

# Scale constraints
MAX_CONCURRENT_USERS=10
```

### Running Locally

```bash
# Start the web app
npm run dev

# Start the mobile app
cd mobile
npx expo start
```

## 🏗️ Architecture

Pithy Jaunt follows a spec-driven development workflow using [OpenSpec](openspec/AGENTS.md):

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   User      │────▶│  CodeRabbit  │────▶│   Daytona   │
│ (Mobile/Web)│     │   Analysis   │     │  Workspace  │
└─────────────┘     └──────────────┘     └─────────────┘
                                                 │
                                                 ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   GitHub    │◀────│  Browser Use │◀────│  LLM Agent  │
│     PR      │     │ Screenshots  │     │  (GPT/Claude)│
└─────────────┘     └──────────────┘     └─────────────┘
```

### Tech Stack

- **Web**: Next.js 15, React, Tailwind CSS, ShadCN UI
- **Mobile**: React Native (Expo)
- **Backend**: Convex (serverless + realtime)
- **Auth**: Supabase
- **AI/LLM**: OpenAI GPT-4o, Anthropic Claude
- **DevOps**: Daytona, GitHub API, CodeRabbit
- **Observability**: Galileo

## 📖 Documentation

- [Full Product Documentation](pithy_jaunt_full_docs.md) - Complete PRD, API specs, and component architecture
- [OpenSpec Workflow](openspec/AGENTS.md) - Spec-driven development guidelines
- [Project Conventions](openspec/project.md) - Code style, architecture patterns, and constraints
- [Context7 MCP Setup](docs/CONTEXT7_SETUP.md) - Configure Context7 for library documentation (optional)

## 🛠️ Development Workflow

We use OpenSpec for structured, spec-driven development:

1. **Create Proposals** - Document changes before implementation
2. **Implement** - Build features following the spec
3. **Validate** - Run `openspec validate --strict`
4. **Archive** - Move completed changes to archive

See [openspec/AGENTS.md](openspec/AGENTS.md) for detailed workflow instructions.

## 📱 Mobile Development

The mobile app is built with React Native and Expo:

```bash
cd mobile
npx expo start

# Run on iOS
npx expo start --ios

# Run on Android
npx expo start --android
```

## 🧪 Testing

- **Unit Tests**: Jest + React Testing Library
- **E2E Tests**: Browser Use for web UI
- **Accessibility**: WCAG AA compliance testing
- **Linting**: ESLint + Prettier

```bash
# Run tests
npm test

# Run linter
npm run lint

# Check accessibility
npm run a11y
```

## Local Development

## 🚢 Deployment

### Web (Vercel)

```bash
# Deploy to production
vercel --prod
```

### Mobile (Expo)

```bash
cd mobile

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the [OpenSpec workflow](openspec/AGENTS.md)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📋 MVP Roadmap

- [x] Project setup and documentation
- [ ] Supabase authentication (email/password, magic link)
- [ ] Repository connection flow
- [ ] CodeRabbit integration
- [ ] Daytona workspace management
- [ ] LLM agent implementation (OpenAI + Anthropic)
- [ ] Task execution and PR creation
- [ ] Browser Use screenshot integration
- [ ] Mobile app (iOS priority)
- [ ] Notification system (push + email)
- [ ] Real-time log streaming

## 🎯 Hackathon Scope

This is a hackathon MVP focusing on:
- ✅ Public repositories only
- ✅ Core agent-to-PR workflow
- ✅ Basic mobile and web UI
- ✅ Voice input stub for demo

Post-hackathon enhancements:
- Private repository support
- WorkOS SSO integration
- Advanced workspace reuse
- Production-grade error handling

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- CodeRabbit for intelligent code analysis
- Daytona for ephemeral development environments
- OpenAI and Anthropic for LLM capabilities
- Expo for React Native tooling

## 📞 Contact

For questions or support, please open an issue or contact the maintainers.
