# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Type-check and validate Svelte files
- `npm run lint` - Run ESLint

## Code Style Guidelines
- **TypeScript**: Use strict mode with proper typing
- **Framework**: SvelteKit with Svelte 5 runes syntax
- **CSS**: TailwindCSS for styling
- **Database**: Neon with Vercel integration
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Components**: Follow SvelteKit routing conventions for pages
- **Environment**: Store sensitive data like admin password in env variables
- **Client Storage**: Use localStorage for user information persistence
- **Error Handling**: Gracefully handle auction state errors
- **Theme**: Dark mode, professional appearance with elegant graphs
- **Authentication**: Simple password protection for admin functionality