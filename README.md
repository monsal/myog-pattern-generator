# MYOG Pattern Generator

An AI-powered pattern generator that turns your gear ideas into printable sewing patterns in minutes.

**"From idea to pattern in 5 minutes"** - No CAD skills required.

## Features

- 🤖 **AI-First Design** - Describe what you want, AI generates the complete pattern
- 📐 **Professional Patterns** - All pieces, seam allowances, notches, and assembly instructions
- 🎨 **Interactive Preview** - See your pattern pieces before printing
- 📄 **Print-Ready Export** - Multi-page PDF with registration marks (coming soon)
- 💾 **Browser Storage** - Your patterns save automatically

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **AI**: Claude API (Anthropic) + GPT-4 Vision (OpenAI)
- **Canvas**: HTML5 Canvas for pattern rendering
- **Deployment**: Vercel (frontend + serverless functions)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Anthropic API key ([get one here](https://console.anthropic.com/))
- OpenAI API key (optional, for image analysis) ([get one here](https://platform.openai.com/))

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/monsal/myog-pattern-generator.git
cd myog-pattern-generator
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit \`.env.local\` and add your API keys:
\`\`\`
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
\`\`\`

4. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## License

MIT

---

**Made with ❤️ for the MYOG community**
