# SMSF Admin Portal & MBG Onboarding Console

A React + TypeScript frontend for the SMSF Admin Portal and MBG Onboarding Console. The app provides role-based experiences for administrators, department heads, and department users, with dynamically configured navigation and permissions.

## Features

- **Admin portal** — manage departments, configure department features, and issue or revoke access links for department heads and users.
- **Head console** — department dashboard with navigation generated from the department's enabled feature permissions.
- **User console** — a shared console experience with user-specific navigation and Role B permissions.
- **Role-based access** — authentication and role checks are handled by route guards.
- **Feature permissions** — configure sidebar screens, customer-list columns, and department-user columns, including visibility and read/edit permissions.
- **Customer and service workflows** — customer lists, services, help center, meetings, attendance, SOP, and related department screens.
- **Data fetching and caching** — TanStack Query manages server-style data, caching, and mutations.
- **Mock data mode** — many API modules currently use a mock in-memory/localStorage data layer; the fetch client is available for connecting real backend endpoints.

## Tech Stack

| Area | Technology |
|---|---|
| UI | React 19, TypeScript |
| Build/dev server | Vite |
| Routing | TanStack Router |
| Data fetching and caching | TanStack Query v5 |
| Tables | TanStack Table |
| Styling | CSS, Tailwind CSS v4 |
| Animation | Framer Motion |
| Icons | Lucide React |
| Code quality | ESLint, TypeScript |

## Requirements

Install the following before running the project:

- Node.js (use a current LTS release)
- npm
- Access to the repository and its environment configuration, if required

## Getting Started

### 1. Install dependencies

From the project root:

```bash
npm install
```

### 2. Configure environment variables

Check the API client and project configuration for the environment variables required by your setup. Create a local `.env` file if needed.

**Do not commit secrets, access tokens, or production credentials to Git.**

### 3. Start the development server

```bash
npm run dev
```

Vite will print the local development URL in the terminal (typically `http://localhost:5173`).

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Run TypeScript project checks and create a production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |

Before opening a pull request, run:

```bash
npm run lint
npm run build
```

## Application Routes

### Public and Admin

| Route | Access | Purpose |
|---|---|---|
| `/` | Based on session | Redirects to the appropriate role home or login |
| `/login` | Guest | Sign in using the supported login flow |
| `/admin` | Admin | Manage departments |
| `/admin/departments/$departmentId` | Admin | Configure department screens, columns, and permissions |
| `/admin/tokens` | Admin | Issue or revoke access tokens / login links |
| `/forbidden` | Authenticated | Access-denied page |

The app also contains legacy department-template routes under `/departments/$departmentId/...`.

### Head Console

| Route | Access | Purpose |
|---|---|---|
| `/head` | Admin or Head | Redirects to the first enabled feature |
| `/head/$screen` | Admin or Head | Opens the feature matching the URL slug |

### User Console

| Route | Access | Purpose |
|---|---|---|
| `/users` | User | Redirects to the first enabled feature visible to the user |
| `/users/$screen` | User | Opens an enabled feature using the user's permissions |

The Head and User consoles share layout and screen components. Their route prefix, session role, feature visibility, and Role A/Role B permissions determine the experience shown.

## How Navigation and Permissions Work

Department features configured in the Admin portal drive the Head and User console navigation.

- **Enabled feature** — can appear in the sidebar and can be opened.
- **Slug** — determines the URL segment, such as `/head/<slug>` or `/users/<slug>`.
- **Screen** — selects the page component through the screen registry.
- **Order** — controls sidebar position.
- **Role A permission** — controls Head access.
- **Role B permission** — controls User access.
- **Show to user** — controls whether a feature or column is visible in the User console.
- **Column features** — control customer-list and department-user table columns separately from sidebar screens.

When adding a new screen type, update the screen type definitions, implement the page, register it in the screen registry, and add the option to the Admin configuration. When adding a table column, update its column template and the relevant table's column-visibility handling.

## Project Structure

```text
src/
├── app/
│   ├── auth/                 # Session handling and role home helpers
│   ├── middleware/           # Authentication and role route guards
│   ├── providers/            # App providers, including TanStack Query
│   ├── queryClient.ts        # TanStack Query client configuration
│   └── router.tsx            # Application route tree
├── api/
│   ├── client.ts             # Fetch/API request wrapper
│   ├── *.api.ts              # API modules grouped by domain
│   └── mock/                 # Mock data, persistence, and seed data
├── components/
│   ├── common/               # Shared form and UI components
│   ├── layout/                # Shared layout components
│   ├── permissions/          # Feature and column permission UI
│   └── head/                 # Shared Head/User console components
├── features/
│   ├── auth/                 # Login, access tokens, and forbidden page
│   ├── permissions/          # Permission types, hooks, config, and pages
│   ├── reports/              # Staff report types and UI
│   └── departments/
│       ├── ...               # Department features and legacy pages
│       └── head/             # Shared Head/User console pages and hooks
├── styles/                   # Feature-level stylesheets
├── App.tsx
└── main.tsx
```

## Data Fetching and State

- **TanStack Query** is used for asynchronous/server-style data: queries, caching, loading/error states, and mutations.
- **API modules** in `src/api/` provide a domain-specific interface between UI/hooks and data sources.
- **Mock modules** in `src/api/mock/` provide sample data and localStorage persistence for the current mock-backed workflows.
- **Authentication session** is managed separately in `src/app/auth/session.ts`; route middleware uses it to enforce access and redirect users.

When connecting a real backend, update the relevant API module and environment configuration while preserving the hooks and UI contracts where possible. Confirm endpoint paths, request/response shapes, and authentication requirements with the backend before switching a feature from mock data to live API calls.

## Authentication and Security Notes

- Route guards improve navigation and user experience, but **frontend checks are not a security boundary**. The backend must independently authenticate requests and enforce role/department permissions.
- Keep `.env` files and credentials out of version control.
- Do not put production secrets in frontend environment variables; values bundled into a browser app are visible to users.
- Use HTTPS and configure token/session handling according to the backend's security requirements.

## Troubleshooting

### Dependencies or local startup fail

```bash
npm install
npm run dev
```

If dependency installation behaves unexpectedly, check that your Node.js and npm versions are compatible with the project's Vite and TypeScript versions.

### TypeScript or production build errors

```bash
npm run build
```

Resolve reported type errors before deploying.

### ESLint errors

```bash
npm run lint
```

Use the file and rule reported by ESLint to locate the issue.

### Changes are not reflected

Restart the Vite development server and refresh the browser. If a change concerns mock data, check whether the relevant mock module persists data in localStorage; old browser data may affect what you see.

## Deployment

Create and test the production build:

```bash
npm run build
```

The generated static assets are written to `dist/`. Deploy the contents of that directory to your chosen static hosting provider, and configure the host to serve the app's entry point for client-side routes. Configure the API base URL and backend CORS/authentication settings for the target environment.

## Project Notes

For detailed project-specific behavior, route conventions, permission fields, and feature implementation guidance, see [`PROJECT.MD`](./PROJECT.MD).
