# PROJECT.MD — SMSF Admin Portal

Department management aur feature-level role permissions ke liye admin panel.
Routing **TanStack Router**, data fetching/caching **TanStack Query**, auth/role
checking **router middleware** (`beforeLoad`) se hoti hai.

---

## Tech Stack

| Concern | Library |
|---|---|
| UI | React 19 + TypeScript (Vite) |
| Routing | `@tanstack/react-router` (code-based, `src/app/router.tsx`) |
| Server state | `@tanstack/react-query` v5 |
| Data layer | `src/api/*` — abhi **mock in-memory store**, real API ke liye `apiRequest` (fetch) ready hai |
| Styling | **Hybrid** — purana UI plain CSS (`src/index.css`), naya UI **Tailwind CSS v4** (`@tailwindcss/vite`) |

---

## Routes

| Path | Access | Kya dikhata hai | Component |
|---|---|---|---|
| `/` | — | Role ke home (`/admin` / `/head` / `/users`), warna `/login` redirect | `beforeLoad` redirect |
| `/login` | Public (guest) | Admin login (email + password) + magic access link se auto-login | `LoginPage` |
| `/admin` | **ADMIN** | Department list + **Add Department** button + stats/search | `DepartmentManagementPage` |
| `/admin/departments/$departmentId` | **ADMIN** | Department ki feature list (row ke end me 3 controls) | `FeaturePermissionsPage` |
| `/admin/tokens` | **ADMIN** | Head/User ke liye **magic login link** issue / revoke | `AccessTokensPage` |
| `/head` | **ADMIN, HEAD** | Route stub — real page aane tak placeholder | `pendingPage('Head Panel')` |
| `/users` | **ADMIN, HEAD, USER** | Route stub — USER ka dashboard (page aane tak placeholder) | `pendingPage('Users')` |
| `/forbidden` | Logged-in | 403 — role ke paas route access nahi | `ForbiddenPage` |

**Middleware** (`src/app/middleware/auth.middleware.ts`):

- `_authed` layout route har protected route par pehle `requireAuth` chalata hai —
  session nahi mila to `/login` redirect.
- Uske baad har route par `requireRole(...)` — role allow list me nahi to
  `/forbidden` redirect.
- `/login` par ulta check: pehle se logged-in hai to apne role ke home par redirect.
- `/head` aur `/users` abhi sirf routes hain (permission check test karne ke liye) —
  inke real pages/components baad me provide honge; tab router me sirf
  `component` swap karna hoga, guards waise ke waise rahenge.

---

## Folder Structure

```
src/
├── app/
│   ├── router.tsx                  # Routes + route guards (beforeLoad)
│   ├── middleware/auth.middleware.ts # requireAuth + requireRole (yehi "middleware" hai)
│   ├── auth/session.ts             # localStorage session + homeForRole()
│   ├── queryClient.ts              # QueryClient singleton (staleTime 30s)
│   └── providers/QueryProvider.tsx # QueryClientProvider wrapper
├── api/
│   ├── client.ts                   # fetch wrapper + ApiError (real API ke liye)
│   ├── departments.api.ts          # get/create/update/delete department (mock)
│   ├── feature-permissions.api.ts  # get/update feature permissions (mock)
│   └── mock/db.ts                  # In-memory store + seed data
├── components/                     # ⭐ ALL reusable React components
│   ├── layout/                     # AdminLayout, AdminSidebar, PageLayout, PageHeader
│   ├── ui/                         # Button, Input, Select, Modal, ConfirmDialog, Badge,
│   │                               # Card, DataTable, LoadingState, ErrorState,
│   │                               # EmptyState, SearchInput
│   ├── common/                     # StatCard, StatusBadge, FormField, ProfileChip
│   ├── departments/                # DepartmentTable, DepartmentStats, DepartmentForm,
│   │                               # DepartmentFormModal, DeleteDepartmentDialog,
│   │                               # DepartmentFilters
│   └── permissions/                # FeaturePermissionsTable, PermissionToggle
└── features/
    ├── departments/
    │   ├── pages/DepartmentManagementPage.tsx   # /admin — composes reusable components
    │   ├── hooks/                               # useDepartments + create/update/delete
    │   └── types/department.types.ts
    └── permissions/
        ├── pages/FeaturePermissionsPage.tsx     # /admin/departments/:id — dynamic departmentId
        ├── hooks/                               # useDepartmentFeatures, useUpdateFeaturePermission
        └── types/permission.types.ts
```

---

## Component & Department Template Architecture

**Rule:** every reusable React component lives in `src/components/` (grouped by
`layout/`, `ui/`, `common/`, `departments/`, `permissions/`). Pages under
`src/features/**/pages/` only compose these components — they don't define UI.

**Department pages are templates, not per-department files.** A department is
*data*, not a separate React codebase. The active department comes from the route
(`departmentId` param) and is passed into TanStack Query hooks:

`Route → departmentId (useParams) → Page → useDepartmentFeatures(id) → API`

So `/admin/departments/dept-1` and `/admin/departments/dept-2` render the
**same** `FeaturePermissionsPage` + `FeaturePermissionsTable` — only the loaded
data differs. Never create `FinanceDashboard.tsx` / `SalesDashboard.tsx` etc.
Creating a new department requires **zero** new React files.

- No department name or ID is hardcoded inside reusable components.
- Reusable components never call APIs directly — pages pass data/callbacks in.
- `DepartmentContext` is intentionally **not** added yet: no component is nested
  deep enough to need it. Add it only if `departmentId` must be threaded through
  many levels.

---

## User Flow

```mermaid
flowchart TD
    A["main.tsx<br/>QueryProvider → App"] --> B["router.tsx<br/>RouterProvider"]
    B -->|"/"| C["redirect → role home<br/>(guest → /login)"]
    C --> D["/admin — Department Management<br/>DepartmentManagementPage"]

    D -->|"+ Create Department Login"| E["Department Form Modal"]
    E -->|Submit| F["useCreateDepartment mutation<br/>createDepartment() → mock db"]
    F --> G["invalidateQueries(['departments'])"]
    G --> H["useDepartments refetch<br/>✅ naya department list me dikh jata hai"]

    D -->|"Row click / ⚙ button"| I["/admin/departments/:departmentId<br/>FeaturePermissionsPage"]
    I --> J["useDepartmentFeatures(departmentId)<br/>feature rows load"]
    J --> K["Row ke 3 controls"]

    K --> L["1. Enable / Disable toggle"]
    K --> M["2. Dropdown → Role A<br/>Can Read | Can Edit"]
    K --> N["3. Dropdown → Role B<br/>Can Read | Can Edit"]

    L --> O["useUpdateFeaturePermission mutation<br/>updateFeaturePermission() → mock db"]
    M --> O
    N --> O
    O --> P["invalidateQueries<br/>['department-features', id]"]
    P --> Q["✅ features refetch — updated state dikhta hai"]
```

---

## Data Flow (TanStack Query)

```mermaid
sequenceDiagram
    participant U as User
    participant P as Page Component
    participant H as React Query Hook
    participant Q as Query Cache
    participant A as Mock API (src/api)

    Note over U,A: Flow 1 — Department add karna
    U->>P: "Create Department Login" submit
    P->>H: useCreateDepartment().mutate(data)
    H->>A: createDepartment(data)
    A-->>H: new Department (+ default feature set)
    H->>Q: invalidateQueries(['departments'])
    Q->>A: getDepartments()
    A-->>Q: Department[]
    Q-->>P: updated list re-renders
    P-->>U: ✅ list me naya department

    Note over U,A: Flow 2 — Department click → Features
    U->>P: Department row click
    P->>P: navigate('/admin/departments/:id')
    P->>H: useDepartmentFeatures(id)
    H->>Q: queryKey ['department-features', id]
    Q->>A: getFeaturePermissions(id)
    A-->>Q: FeaturePermission[]
    Q-->>P: feature rows render

    Note over U,A: Flow 3 — Row ka control change
    U->>P: toggle / dropdown change
    P->>H: useUpdateFeaturePermission(id).mutate({id, data})
    H->>A: updateFeaturePermission(id, patch)
    A-->>H: updated FeaturePermission
    H->>Q: invalidateQueries(['department-features', id])
    Q->>A: getFeaturePermissions(id)
    A-->>Q: fresh FeaturePermission[]
    Q-->>P: rows refreshed
```

**Conventions**

- Query key read hook me export hoti hai (`departmentsQueryKey`, `departmentFeaturesQueryKey(id)`), mutation hooks wahi import karke `invalidateQueries` karte hain.
- Mutations me retry 0, queries me retry 1, `staleTime: 30_000` (`src/app/queryClient.ts`).
- UI side-effects (modal close) page se `.mutate(data, { onSuccess })` se hote hain; cache invalidation hook ke andar.

---

## Styling Conventions (Hybrid CSS + Tailwind)

**Rule: purane components me plain CSS classes, naye UI me Tailwind utilities.**

- Setup (Tailwind **v4**, config-file free):
  1. devDep: `tailwindcss` + `@tailwindcss/vite`
  2. `vite.config.ts` me `tailwindcss()` plugin
  3. `src/index.css` ki **pehli line**: `@import "tailwindcss";`
- Naye pages (`/head`, `/users`, aane wale naye screens) Tailwind utilities se
  banao — jaldi hota hai.
- **Gotchas:**
  - v4 me Tailwind **cascade layers** use karta hai → hamari custom CSS
    (unlayered) hamesha utilities ko override karti hai. Matlab purani
    classes (`.nav-item`, `.table-wrapper`, ...) ke upar utility class se
    override nahi hoga — mixing karte waqt dhyan do.
  - Tailwind **preflight** base reset karta hai (margins, button/input
    defaults); purani custom CSS unhe override kar leti hai — purane screens
    par asar nahi hona chahiye, but major change ke baad ek baar visual
    check kar lena.
  - `src/App.css` orphan hai (Vite template ka), koi import nahi karta.
- Jab pura UI ek din rewrite ho, tabhi full Tailwind migration sochna
  (abhi dono saath me rakhna hi plan hai).

---

## Responsive & Sidebar — STRICT Rules (mandatory)

> Har naya UI banate waqt yeh rules **non-negotiable** hain. Koi page/tab tab
> tak "done" nahi maana jayega jab tak niche ke checks pass na ho.

### Sidebar — open/close (implemented)

- **Open:** topbar ka **☰** button. **Close:** sidebar ke andar brand row me
  **✕** button (desktop collapse + mobile drawer dono ke liye).
- State `src/components/layout/AdminLayout.tsx` me:
  - \>900px → default **open**; ≤900px → default **closed**.
  - Mobile par navigation (sidebar link, browser back) ke baad drawer apne aap
    band ho jata hai.
  - Backdrop tap karne par bhi band; open hone par ☰ hide ho jata hai.
- **z-index order:** sidebar drawer `60` > backdrop `55` > modal `50` >
  topbar `40`.
- Sidebar ke andar content overflow kare to scroll andar hi ho
  (`.sidebar { overflow-y: auto }`) — page ka scroll nahi.
- **Gotcha (dobara mat karna):** close par UI mat todo — `.main-content` ko
  `grid-column: 2` explicit rakha hai, warna sidebar hide hote hi wo 0-width
  column me auto-place ho jata tha. Naya grid item add karo to placement
  check karo. Collapse smooth rahe isliye `.app-shell` par
  `transition: grid-template-columns` hai; mobile par
  `body:has(.sidebar-open) { overflow: hidden }` se background scroll lock
  hota hai.

### Responsive checklist (har page ke liye)

1. **375px / 768px / 1440px** — teeno widths par dev tools se check karo;
   mobile par **horizontal page scroll bilkul nahi**.
2. Fixed width mat lagao — hamesha `max-width` + `width: 100%`.
3. Tables hamesha `.table-wrapper` (`overflow-x: auto`) ke andar.
4. Multi-column grids (`.stats-grid` etc.) ≤900px par 1-col.
5. Toolbars/topbars me `flex-wrap` — warna mobile par buttons overflow ho jate hain.
6. Page/modal padding mobile par compact (media queries me already:
   `.page-content`, `.modal`, `.content-card`, `.forbidden-card`, `.auth-card`).
7. Plain CSS classes likh rahe ho to unka mobile rule bhi `@media (max-width: 900px)`
   me likho; **Tailwind** utilities ho to `sm:` / `md:` prefixes.
8. Buttons/inputs **tap-friendly** (min ~34px height) rakho.

**Definition of done:** naya screen → mobile par koi overflow nahi, sidebar
drawer kaam kare, sab kuch tap-friendly. PROJECT.MD me is section ko update
karte raho agar naya breakpoint ya rule add ho.

---

## Feature Row Controls

Har feature row ke **end me 3 controls**:

| # | Control | UI | Mutation field | Options |
|---|---|---|---|---|
| 1 | Enable / Disable | Toggle switch | `enabled` | on / off |
| 2 | Role A permission | Dropdown | `roleAPermission` | `Can Read`, `Can Edit` |
| 3 | Role B permission | Dropdown | `roleBPermission` | `Can Read`, `Can Edit` |

- Feature **disabled** ho to dono dropdowns bhi disable ho jate hain (permission sirf enabled feature par lagti hai).
- Row ke control update ke dauran sirf wahi control disable hota hai (`updatingFeatureId`).
- Har update ek independent mutation hai — invalidation ke baad poori list refetch hoti hai.

---

## Mock Data Layer

Abhi koi backend nahi hai, isliye API functions ek in-memory store (`src/api/mock/db.ts`) par chalte hain:

- Seed: 2 departments (Finance, Operations), har department ke liye 8 default features
  (Dashboard, Reports, User Management, Billing, Audit Log, Settings, Notifications, Data Export).
- Naya department banate hi uske liye default feature set auto-seed hota hai.
- Department delete karne par uske feature permissions bhi delete hote hain (cascade).
- Har call pehle `delay()` se simulated network latency (250–300 ms) leta hai.

**Real API me swap karne ke liye:** `src/api/departments.api.ts` aur
`src/api/feature-permissions.api.ts` ke andar function bodies ko wapas
`apiRequest('/endpoint', {...})` calls se replace karein — signatures same hain,
hooks/pages ko bilkul change nahi karna padega. Base URL:
`VITE_API_BASE_URL` (default `http://localhost:3000/api`), wrapper `src/api/client.ts` me hai.

---

## Commands

```bash
npm run dev     # dev server
npm run build   # tsc -b && vite build
npm run lint    # eslint
```

**Current status (07 Oct 2026):** `npm run build` ✅ (0 errors) · `npm run lint` ✅ (0 errors, 0 warnings).

---

## Recovery & Restore Log (07 Oct 2026)

Ek git `stash` + remote merge ne kai tracked files ko purane (remote) versions par revert kar diya tha aur kuch files delete kar di thi. Neeche sab restore hua:

**Recreate kiye gaye files (purani content se):**

| File | Kya hai |
|---|---|
| `src/App.tsx` | `RouterProvider` wrapper (AdminLayout wala purana version hataya) |
| `src/api/departments.api.ts` | mock in-memory CRUD (fetch/`apiRequest` wapas nahi) |
| `src/api/mock/db.ts` | departments + feature store + seed |
| `src/api/feature-permissions.api.ts` | get/update feature permissions (mock) |
| `src/features/permissions/types/permission.types.ts` | `FeaturePermission`, `PermissionLevel` |
| `src/features/permissions/hooks/useDepartmentFeatures.ts` | query `['department-features', id]` |
| `src/features/permissions/hooks/useUpdateFeaturePermission.ts` | mutation + invalidate |
| `src/features/permissions/components/FeaturePermissionsTable.tsx` | feature rows + toggle + dropdowns |
| `src/features/departments/hooks/useDepartments.ts` | query `['departments']` + export key |

**Re-apply kiye gaye edits (reverted files par wapas):**

- `DepartmentTable.tsx` — `onViewFeatures` prop, row click → features, ⚙ button (stopPropagation)
- `DepartmentManagementPage.tsx` — `useNavigate`, `handleViewFeatures`, `onViewFeatures` prop, `departments` ko `useMemo` me
- `DepartmentFormModal.tsx` — `useEffect` reset ki jagah render-phase `wasOpen` fix
- `LoginPage.tsx` — `handleSessionCreated` ko `useCallback` me wrap (lint warning)
- `router.tsx` / `index.css` — merge conflict markers already hataye the; dono ab clean hain

**Restore ke baad:** build + lint dono green.

---

## Pending Work

1. **Git index abhi unmerged hai** — `git status` me `UU`/`DU`/`MM` entries pending hain (`router.tsx`, `index.css`, `PROJECT.MD`, `FeaturePermissionsPage.tsx`, `AdminSidebar.tsx`). User ko khud resolve karke commit karna hai (AI commit nahi karega). Ek purana stash bhi `stash@{0}` par pada hai.
2. **`/head` aur `/users` ke real pages** — abhi `pendingPage(...)` stubs hain; user pages dega to sirf router me `component` swap hoga, guards waise ke waise rahenge.
3. **Stray file:** `src/features/departments/Haed/page.tsx` — user ne banayi hai (abhi empty, naam me typo `Haed`); hataani/karna user decide karega.
