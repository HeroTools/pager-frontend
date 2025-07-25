# Contributing to Pager

Thank you for your interest in contributing to Pager! This guide will help you get started with the development workflow and contribution process.

Please note that by participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## 🚀 Quick Start

Pager uses a **fork-and-rebase** workflow. All contributors create a fork of the repository and submit pull requests to have their contributions reviewed and accepted. We recommend working on feature branches.

## 📋 Before You Start

- Make sure you have Node.js 18.17.0 or later installed
- Familiarize yourself with our [Code Standards](#code-standards)
- Check existing [issues](https://github.com/HeroTools/pager-frontend/issues) and [pull requests](https://github.com/HeroTools/pager-frontend/pulls)

## 🔧 Development Setup

### Step 1: Fork and Clone

1. **Fork the repository** by clicking the "Fork" button on [GitHub](https://github.com/HeroTools/pager-frontend)

2. **Clone your fork** to your local machine:

   ```bash
   git clone --config pull.rebase=true https://github.com/YOUR_USERNAME/pager-frontend.git
   cd pager-frontend
   ```

   The `--config pull.rebase=true` configures Git to use rebase by default, which keeps a cleaner history.

3. **Set up the upstream remote** to sync with the main repository:

   ```bash
   git remote add upstream https://github.com/HeroTools/pager-frontend.git
   ```

4. **Verify your remotes**:

   ```bash
   git remote -v
   # Should show:
   # origin    https://github.com/YOUR_USERNAME/pager-frontend.git (fetch)
   # origin    https://github.com/YOUR_USERNAME/pager-frontend.git (push)
   # upstream  https://github.com/HeroTools/pager-frontend.git (fetch)
   # upstream  https://github.com/HeroTools/pager-frontend.git (push)
   ```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Environment Setup

1. **Copy the environment template**:

   ```bash
   cp .env.example .env
   ```

2. **Fill in your environment variables** in the `.env` file:
   - Supabase credentials
   - OpenAI API key
   - Any other required configuration

### Step 4: Start Development

```bash
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000) to see the application running.

## 🌊 Git Workflow

### Keeping Your Fork Updated

Before starting work on a new feature, always sync your fork:

```bash
git fetch upstream
git checkout main
git rebase upstream/main
git push origin main
```

### Working on Features

1. **Create a feature branch** from the latest main:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our [Code Standards](#code-standards)

3. **Run quality checks**:

   ```bash
   npm run check-all
   ```

4. **Commit with clear messages**:

   ```bash
   git add .
   git commit -m "feat: brief description of what you did"
   ```

5. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** from your fork to the main repository

### Handling Merge Conflicts

If your branch conflicts with upstream changes:

```bash
git fetch upstream
git rebase upstream/main
# Resolve any conflicts in your editor
git add .
git rebase --continue
git push --force-with-lease origin feature/your-feature-name
```

## 🎯 Code Standards

### TypeScript

- Use TypeScript for all new code
- Prefer strict type checking
- Use proper type definitions instead of `any`

### Code Style

- Use the existing ESLint and Prettier configurations
- Run `npm run format` before committing
- Follow existing naming conventions:
  - `camelCase` for variables and functions
  - `PascalCase` for components and types
  - `kebab-case` for file names

### Component Structure

```typescript
interface ComponentProps {
  title: string
  onAction: () => void
}

export function Component({ title, onAction }: ComponentProps) {
  return (
    <div className="component-container">
      <h2>{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  )
}
```

### Commit Messages

Write clean, descriptive commit messages following conventional commit format. While we don't have commitlint configured, we prefer this style for consistency:

```bash
# Good - use conventional commit prefixes
git commit -m "feat: add message threading support"
git commit -m "fix: resolve typing indicator not showing"
git commit -m "refactor: improve channel creation modal"
git commit -m "chore: update dependencies"
git commit -m "docs: add API documentation"

# Bad - vague or unclear messages
git commit -m "updates"
git commit -m "fix bug"
git commit -m "changes to chat"
```

**Common prefixes:**

- `feat:` - new features
- `fix:` - bug fixes
- `refactor:` - code refactoring
- `chore:` - maintenance tasks
- `docs:` - documentation updates
- `style:` - formatting changes
- `perf:` - performance improvements

## 🧪 Quality Checks

### Before Submitting

Run the full quality check suite to ensure your changes meet our standards:

```bash
npm run check-all
```

This runs:

- ESLint for code quality
- TypeScript type checking
- Prettier formatting check

### Quick Fixes

If you need to fix linting and formatting issues quickly:

```bash
npm run fix-all
```

### Troubleshooting Build Issues

If you encounter build problems, try clearing the cache:

```bash
npm run clean
npm install
npm run dev
```

## 📝 Pull Request Process

### Before Creating a PR

- [ ] Your code follows the style guidelines
- [ ] Your commit messages are clear
- [ ] You've updated documentation if needed

### PR Description

Include in your pull request:

- **What:** Brief description of changes
- **Why:** Explanation of the problem being solved
- **How:** Technical approach taken
- **Screenshots:** For UI changes

Example:

```markdown
## What

Add support for message reactions with custom emojis

## Why

Users need to be able to react to messages with workspace-specific emojis

## How

- Added reaction component with emoji picker
- Integrated with custom emoji API
- Added hover states and animations

## Screenshots

[Include before/after screenshots]
```

### Review Process

- Maintainers will review your PR within a few days
- Address feedback promptly
- Be open to suggestions and changes
- PRs require approval before merging

## 🐛 Reporting Issues

### Bug Reports

Include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS information
- Screenshots if applicable

### Feature Requests

Include:

- Clear description of the desired feature
- Use case or problem it solves
- Any implementation ideas
- Examples from other applications

## 🎨 UI/UX Contributions

- Follow the existing design system
- Ensure accessibility (proper contrast, keyboard navigation)
- Include dark mode considerations

## 📚 Documentation

- Update README.md for new features
- Add inline code comments for complex logic
- Update API documentation when relevant

## ❓ Getting Help

- Check existing issues and discussions
- Create a new issue for questions
- Join our community discussions
- Contact maintainers for urgent matters

## 🏆 Recognition

Contributors are recognized in:

- GitHub contributor graphs
- Release notes for significant contributions
- Special mentions for first-time contributors

Thank you for contributing to Pager! 🚀

---

By contributing to this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md) and licensing terms.
