# TaskFlow

## Overview

TaskFlow is a project management application built with Next.js that features interactive task dependency graphs. It's a Russian-language application where users can manage teams, projects, and tasks with visual dependency tracking using ReactFlow. The frontend communicates with an external backend API at `https://corsair-taskflow.site/api/v1`.

This is a **frontend-only** application — there is no backend, database, or server-side API in this repository. All data comes from the external API.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Framework
- **Next.js** with the App Router pattern (app directory)
- **TypeScript** throughout
- **React Server Components** enabled (`rsc: true` in components.json), though most pages are client components (`"use client"`)
- **TailwindCSS v4** with CSS custom properties for theming (oklch color space)

### Routing Structure
The app uses Next.js route groups:
- `app/(app)/` — Authenticated pages (dashboard, profile, teams, projects). These are wrapped in `AppShell` which provides sidebar navigation and auth protection.
- `app/(auth)/` — Authentication pages (login, register). Simple centered layout, no sidebar.
- `app/settings/` and `app/invitations/` — Standalone pages that handle their own layout (settings wraps itself in AppShell manually).
- Root `app/page.tsx` redirects to `/dashboard`.

### Component Library
- **shadcn/ui** (new-york style) with extensive Radix UI primitives
- Components live in `components/ui/` — these are standard shadcn components and should not be modified unless necessary
- Custom components in `components/graph/` (task nodes, edges, dialogs) and `components/layout/` (sidebar, app shell)

### State Management & Data Fetching
- **SWR** for data fetching with global config in `SWRProvider` (no revalidation on focus, 3 retries, 5s deduping)
- **React Context** for authentication state (`AuthProvider` in `lib/auth-context.tsx`)
- **next-themes** for dark/light theme support (defaults to dark)

### Authentication
- JWT-based auth with access/refresh tokens stored in `localStorage` (`tf_tokens` key)
- Token refresh is handled automatically with deduplication (single in-flight refresh promise)
- Auth context provides `login`, `register`, `verifyTelegram`, `logout`, and `refreshUser`
- Registration requires Telegram verification (OTP code flow)
- `AppShell` component guards authenticated routes — redirects to `/login` if not authenticated

### API Client
- Centralized in `lib/api.ts`
- Base URL: `https://corsair-taskflow.site/api/v1`
- Modules for: `auth`, `users`, `teams`, `projects`, `tasks`
- Automatic token refresh on 401 responses
- Custom `ApiError` class for error handling

### Task Graph (Core Feature)
- Built with **ReactFlow** (v11+ via `reactflow` package, though `@xyflow/react` v12 is also in dependencies)
- Custom node type: `TaskNode` (`components/graph/task-node.tsx`) — displays task status, priority, assignee, deadline
- Custom edge type: `DependencyEdge` (`components/graph/dependency-edge.tsx`) — shows dependency actions (notifications, status changes)
- Task statuses: `todo`, `in_progress`, `review`, `completed`, `blocked`
- Priority levels: 0 (low), 1 (medium), 2 (high)
- Graph data comes from `GET /api/v1/projects/{projectSlug}/tasks/graph`

### Internationalization
- UI text is in Russian (hardcoded strings, no i18n framework)
- Fonts: Inter (Latin + Cyrillic) and JetBrains Mono

### Theming
- Dark mode by default, with light mode support
- CSS custom properties using oklch color space
- Custom semantic colors: `--success`, `--warning`, plus chart colors
- Two CSS files exist (`app/globals.css` and `styles/globals.css`) — `app/globals.css` is the active one used in the layout

## External Dependencies

### External API
- **Backend**: `https://corsair-taskflow.site/api/v1` — handles all business logic, data storage, authentication
- Endpoints include: auth (login/register/refresh), users, teams, projects, tasks, invitations, task graphs

### Third-Party Services
- **Vercel Analytics** (`@vercel/analytics`) — integrated in root layout
- **Telegram** — used for user verification during registration (users send a code to a Telegram bot)

### Key NPM Packages
- `reactflow` / `@xyflow/react` — interactive graph visualization
- `swr` — data fetching and caching
- `sonner` — toast notifications
- `next-themes` — theme switching
- `react-hook-form` + `@hookform/resolvers` — form handling
- `zod` — schema validation
- `recharts` — chart components
- `date-fns` — date utilities
- `lodash` — utility functions
- `vaul` — drawer component
- `react-day-picker` — calendar component
- `react-resizable-panels` — resizable panel layouts
- `cmdk` — command palette
- `input-otp` — OTP input for Telegram verification