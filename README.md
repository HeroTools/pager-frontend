# Pager - Frontend

A modern team communication platform with AI-powered features, built with Next.js and real-time collaboration capabilities.

## ✨ Features

### Core Communication

- **Workspaces** - Organize teams with dedicated spaces
- **Channels** - Public and private team channels
- **Direct Messages** - Private conversations between users
- **Threads** - Organized message threading
- **Rich Text Editor** - Powered by Quill with full formatting support

### AI Integration

- **AI Agents** - Custom AI assistants per workspace
- **Message Embeddings** - Semantic search and context awareness
- **Intelligent Responses** - AI-powered message suggestions and automation

### Media & Files

- **File Sharing** - Upload and share documents, images, and media
- **Message Attachments** - Drag-and-drop file attachment support
- **Thumbnails** - Automatic preview generation

### Real-time Features

- **Live Messaging** - Instant message delivery via Supabase Realtime
- **Typing Indicators** - See when others are typing
- **User Presence** - Online/away/busy status indicators
- **Audio/Video Calls** - Built-in calling functionality

### User Experience

- **Dark/Light Themes** - Automatic theme switching with system preference
- **Responsive Design** - Mobile-first responsive interface
- **Notifications** - In-app and push notifications
- **Message Reactions** - React to messages with emojis
- **Custom Emojis** - Upload workspace-specific emojis

## 🛠 Tech Stack

### Frontend Framework

- **Next.js 15.4** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development

### Styling & UI

- **Tailwind CSS v4.1** - Utility-first CSS framework with custom design tokens
- **Radix UI** - Headless UI components
- **Lucide React** - Icon library
- **Custom Design System** - OKLCH color space with glassmorphism effects

### State Management & Data

- **Zustand v5** - Lightweight state management
- **React Query v5.83** - Server state management and caching
- **Supabase JS SDK** - Database client and real-time subscriptions

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **TypeScript** - Static type checking

## 🚀 Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- npm, yarn, or pnpm
- Git

### Environment Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd <project-name>
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Environment Variables**
   Create a `.env.local` file in the root directory:

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key

   # AWS Configuration (for backend integration)
   NEXT_PUBLIC_API_GATEWAY_URL=your_api_gateway_url

   # Application Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── workspace/         # Workspace-specific routes
│   ├── globals.css        # Global styles and design system
│   └── layout.tsx         # Root layout component
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components (buttons, inputs, etc.)
│   ├── chat/             # Chat-specific components
│   ├── workspace/        # Workspace-specific components
│   └── layout/           # Layout components
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries and configurations
│   ├── supabase/         # Supabase client configuration
│   ├── openai/           # OpenAI integration
│   ├── utils.ts          # General utilities
│   └── types.ts          # TypeScript type definitions
├── stores/               # Zustand state stores
├── styles/               # Additional styling files
└── types/                # TypeScript type definitions
```

## 🎨 Design System

The application uses a custom design system built on Tailwind CSS v4.1 with:

- **OKLCH Color Space** - Perceptually uniform colors for better accessibility
- **CSS Custom Properties** - Dynamic theming with automatic dark mode
- **Design Tokens** - Consistent spacing, typography, and color scales
- **Glassmorphism Effects** - Modern frosted glass UI elements

### Key Design Principles

- Mobile-first responsive design
- Accessibility-first component architecture
- Consistent 8px grid system
- Semantic color naming

## 🔄 Development Workflow

### Code Quality

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Formatting
npm run format

# Run all checks
npm run check-all
```

### Building

```bash
# Development build
npm run build

# Production build
npm run build:production

# Analyze bundle
npm run analyze
```

### Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🔌 Backend Integration

This frontend connects to:

- **AWS Lambda Functions** - API endpoints via API Gateway
- **Supabase** - PostgreSQL database, authentication, and real-time features
- **OpenAI API** - AI agents and embedding generation

Ensure your backend services are deployed and environment variables are correctly configured.

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guide](CONTRIBUTING.md) for detailed information on:

- Setting up your development environment
- Git workflow and best practices
- Code standards and style guidelines
- Pull request process
- Reporting issues and requesting features

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following our [code standards](CONTRIBUTING.md#code-standards)
4. Test your changes: `npm run check-all`
5. Commit with clear messages: `git commit -m 'Add amazing feature'`
6. Push to your fork: `git push origin feature/amazing-feature`
7. Create a Pull Request

For first-time contributors, check out our [detailed setup guide](CONTRIBUTING.md#development-setup).

- Add tests for new features

## 📚 Key Dependencies

| Package                 | Purpose                 |
| ----------------------- | ----------------------- |
| `next`                  | React framework         |
| `react`                 | UI library              |
| `@tanstack/react-query` | Server state management |
| `zustand`               | Client state management |
| `@supabase/supabase-js` | Backend integration     |
| `tailwindcss`           | Styling framework       |
| `react-quill`           | Rich text editor        |
| `lucide-react`          | Icons                   |

## 🐛 Troubleshooting

### Common Issues

**Build Errors**

- Ensure all environment variables are set
- Clear `.next` directory and reinstall dependencies
- Check TypeScript errors with `npm run type-check`

**Supabase Connection Issues**

- Verify Supabase URL and keys in environment variables
- Check network connectivity and CORS settings
- Ensure Supabase project is active

**Styling Issues**

- Clear browser cache
- Ensure Tailwind CSS is properly configured
- Check for CSS custom property support

## 📄 License

This project is licensed under the Apache License 2.0.

### What this means:

- ✅ **Free to use** for any purpose, including commercial use
- ✅ **Modify and distribute** with minimal restrictions
- ✅ **Patent protection** included
- ✅ **Enterprise-friendly** licensing
- 🔓 **No copyleft requirements** - you can incorporate this into proprietary software

For more details, see the [LICENSE](LICENSE) file.

## 🏢 Commercial Support

While this software is open source, we also offer:

- **Hosted solutions** with premium features and support
- **Enterprise support** and customization services
- **Professional services** for deployment and integration

Contact us for commercial inquiries.

## 🆘 Support

For development support:

- Create an issue in this repository
- Contact the development team
- Check the project documentation

---

Built with ❤️ using Next.js and modern web technologies.
