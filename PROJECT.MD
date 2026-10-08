# PROJECT.MD — SMSF Admin Portal + MBG Onboarding Console (Head Panel)

Do hisse ek hi React app me:

1. **Admin Portal** (`/admin/*`) — departments banana, har department ke **features
   (= head panel ke menu items)** manage karna, Head/User ke liye login links issue karna.
2. **Head Panel / MBG Onboarding Console** (`/head/*`) — department head ka console.
   Sidebar ke items **admin ke feature permissions se dynamically** aate hain.

Routing **TanStack Router**, data **TanStack Query**, auth/role check **router
`beforeLoad`** se.

---

## Tech Stack

| Concern | Library |
|---|---|
| UI | React 19 + TypeScript (Vite) |
| Routing | `@tanstack/react-router` (code-based, `src/app/router.tsx`) |
| Server state | `@tanstack/react-query` v5 |
| Data layer | `src/api/*` — abhi **mock in-memory store**, real API ke liye `apiRequest` (fetch) ready |
| Styling | Admin: plain CSS (`src/index.css`) · Head panel: plain CSS (`src/styles/head.css`, font **Jost**) · Tailwind v4 available |

---

## Routes

### Public / Admin

| Path | Access | Kya dikhata hai | Component |
|---|---|---|---|
| `/` | — | Role ke home (`/admin` / `/head` / `/users`), warna `/login` | `beforeLoad` redirect |
| `/login` | Guest | Admin login (email + password) + access-token / magic-link login | `LoginPage` |
| `/admin` | **ADMIN** | Department list + Add Department + stats/search | `DepartmentManagementPage` |
| `/admin/departments/$departmentId` | **ADMIN** | **Head panel menu builder** — features add/edit/delete/reorder/toggle + Role A/B | `FeaturePermissionsPage` |
| `/admin/tokens` | **ADMIN** | Head/User ke liye magic login link issue / revoke | `AccessTokensPage` |
| `/users` | ADMIN, HEAD, USER | Stub — USER dashboard (pending) | `pendingPage('Users')` |
| `/forbidden` | Logged-in | 403 | `ForbiddenPage` |
| `/departments/$departmentId/{dashboard,customers,help-center,services}` | — | Purane department template pages | `Department*Page` |

### Head Panel (`_head` layout → `HeadConsoleLayout`)

| Path | Access | Kya hota hai |
|---|---|---|
| `/head` | ADMIN, HEAD | Pehle **enabled** feature par redirect (`HeadIndexPage`) |
| `/head/$screen` | ADMIN, HEAD | `$screen` = feature ka **slug** → enabled feature dhundho → `SCREEN_REGISTRY[feature.screen]` ka page render (`HeadScreenPage`) |

> Sirf **2 routes** — naya menu item add karne par router me kuch nahi badalna.
> Disabled / unknown slug → "Page not available" card.

**Middleware** (`src/app/middleware/auth.middleware.ts`): `requireAuth` + `requireRole(...)`.
`/login` par ulta check (logged-in → apne home). HEAD/USER session me `departmentId`
hota hai (`AuthUser.departmentId`); admin preview ke liye fallback `dept-1`.

---

## Dynamic Head Navbar (core design)

**Feature permission == sidebar item.** Admin jo karega, head ko turant dikhega:

```
Admin: /admin/departments/$id  ──(create/update/delete/move/toggle)──▶  featurePermissions[]
                                                                             │
Head:  useHeadNav(departmentId) ── enabled ∧ sort(order) ──▶ nav items ──▶ HeadShell sidebar
                                                                             │
       /head/$screen ── slug match ──▶ SCREEN_REGISTRY[screen].component ──▶ page body
```

`FeaturePermission` fields:

| Field | Matlab |
|---|---|
| `name`, `description` | Sidebar label · topbar subtitle |
| `screen` | `dashboard` \| `users` \| `customers` \| `meeting` \| `sop` \| `help-center` \| `custom` — kaunsa page component |
| `slug` | URL segment: `/head/<slug>` (department me unique) |
| `icon` | `IconName` (`components/head/shared/iconPaths.ts`) |
| `order` | Sidebar position (admin ▲▼ se) |
| `enabled` | Off → sidebar se gayab + route block |
| `roleAPermission`, `roleBPermission` | `CAN_READ` / `CAN_EDIT` |

Naya screen type add karna ho: `permission.types.ts` me `HeadScreenKey` → page banao
`features/departments/head/pages/` me → `screenRegistry.tsx` me map karo →
`features/permissions/config/screenOptions.ts` me admin dropdown option.

---

## Folder Structure

```
src/
├── app/
│   ├── router.tsx                      # saare routes + guards (admin + _head layout)
│   ├── middleware/auth.middleware.ts   # requireAuth / requireRole
│   ├── auth/session.ts                 # localStorage session + homeForRole()
│   ├── queryClient.ts / providers/QueryProvider.tsx
├── api/
│   ├── client.ts                       # fetch wrapper (real API ke liye)
│   ├── departments.api.ts              # mock CRUD
│   ├── feature-permissions.api.ts      # get / create / update / delete / move (mock)
│   ├── auth.api.ts, customers.api.ts, services.api.ts, help-center.api.ts, department-dashboard.api.ts
│   └── mock/
│       ├── db.ts                       # departments + FEATURE_TEMPLATE (7 screens) + seed
│       ├── auth.db.ts                  # users (head/user → departmentId: 'dept-1')
│       ├── head.db.ts                  # department users, work items, notifications
│       └── staff-report.db.ts          # sample staff report items
├── styles/
│   └── head.css                        # head panel ka poora CSS (.hshell tokens) — index.css se @import
├── components/
│   ├── layout/   ui/   common/   departments/   customers/   dashboard/   services/   help-center/
│   ├── permissions/
│   │   ├── FeaturePermissionsTable.tsx # order ▲▼ · icon+path · toggle · Role A/B · edit/delete
│   │   ├── FeatureFormModal.tsx        # add/edit feature (screen → slug/icon auto-fill)
│   │   └── PermissionToggle.tsx
│   ├── reports/                        # StaffReportModal, WorkReportTable, workReportMeta
│   └── head/                           # ⭐ MBG Onboarding Console components
│       ├── layout/                     # HeadShell, HeadSidebar, HeadTopbar, NotificationsMenu, ImpersonationBanner
│       ├── shared/                     # Icon + iconPaths, SegmentedControl, IconButton, Avatar, SearchBar, SectionCard, LearningButton
│       ├── users/                      # DepartmentUsersTable, UserFormModal, UserDetails, RolePill, MetricPill, roleMeta
│       ├── dashboard/                  # (pending)
│       ├── customer/                   # (pending)
│       ├── meeting/                    # (pending — 15 Days Meeting)
│       ├── sop/                        # (pending)
│       └── help-center/                # (pending)
└── features/
    ├── auth/        # login, tokens, forbidden (types me AuthUser.departmentId add hua)
    ├── permissions/
    │   ├── types/permission.types.ts   # FeaturePermission (+screen/slug/icon/order), HeadScreenKey
    │   ├── config/screenOptions.ts     # admin dropdown: screens + ICON_OPTIONS
    │   ├── hooks/useDepartmentFeatures.ts, useUpdateFeaturePermission.ts, useFeatureMutations.ts (create/remove/move)
    │   └── pages/FeaturePermissionsPage.tsx
    ├── reports/types/staff-report.types.ts
    └── departments/
        ├── types/ hooks/ components/ pages/   # purane department template pages
        └── head/                       # ⭐ Head panel pages
            ├── config/screenRegistry.tsx       # screen key → page component
            ├── hooks/useHeadNav.ts             # features → nav items (+bySlug)
            ├── hooks/useHeadDepartmentId.ts
            ├── types/head.types.ts             # HeadNavItem, HeadAccount, HeadNotification, DepartmentUser…
            └── pages/
                ├── HeadConsoleLayout.tsx       # _head layout (HeadShell + Outlet)
                ├── HeadIndexPage.tsx           # /head → first enabled
                ├── HeadScreenPage.tsx          # /head/$screen resolver
                ├── DashboardPage.tsx           # placeholder body
                ├── DepartmentUsersPage.tsx     # ✅ full (table, add/edit/delete, login-as, staff report)
                ├── CustomerListPage.tsx        # placeholder body
                ├── MeetingPage.tsx             # placeholder body
                ├── SopPage.tsx                 # placeholder body
                ├── HelpCenterPage.tsx          # placeholder body
                └── CustomFeaturePage.tsx       # admin ke custom features ke liye generic
```

**Rule:** reusable UI sirf `src/components/` me; `features/**/pages/` sirf compose karte hain.
Head panel ke component **page-wise subfolder** me jate hain (`head/users/`, `head/customer/` …),
shared primitives `head/shared/` me, shell `head/layout/` me.

---

## Head Panel — Design Source & Tokens

Design source: `MBG_Onboarding_Console.html` (prototype, 11 screens). Shell usi se
pixel-match hai. Tokens `.hshell` par CSS variables me:

| Token | Value |
|---|---|
| Blue / hover | `#2459e0` / `#1a45b8` |
| Yellow | `#ffc629` (active nav bar, badges, brand mark) |
| BG / border | `#f4f6fb` / `#e6e9f0` |
| Font | Jost 14px (Google Fonts link `index.html` me) |
| Sidebar | 236px open / 64px collapsed (`is-collapsed`) |

Shell features: collapsible sidebar, yellow active bar, account card (email + role),
Head/User `SegmentedControl` switch, logout, sticky blur topbar, bell + unread badge +
dropdown ("Mark all read"), impersonation strip ("You are logged in as X").

---

## Reusable Components (head + reports)

| Component | Props ka gist |
|---|---|
| `HeadShell` | `navItems, activeKey, onNavigate, account, role/onRoleChange, onLogout, title/subtitle | topbarContent, notifications, impersonating, children` |
| `SegmentedControl<T>` | `options[{value,label,count?}], value, onChange, fill, size` |
| `Icon` | `name: IconName` (ek path-map), `size`, `strokeWidth`, ya raw `d` |
| `DepartmentUsersTable` | `users, onView/onEdit/onDelete/onLoginAs (optional), renderExpanded` |
| `UserFormModal` | `mode: 'create' \| 'edit'` (edit me password field nahi), `initialValues, onSubmit` |
| `StaffReportModal` | `person, items, target, summary?/stats? override` — stats/tabs/filter khud derive |
| `FeatureFormModal` | admin: `mode, initialValues, onSubmit(CreateFeaturePermissionRequest)` |
| `Modal` (ui) | `size: sm/md/lg/xl`, `flush`, Escape-to-close — purane callers unchanged |
| `DataTable` (ui) | legacy `children` mode **ya** `rows + rowKey + column.render` generic mode |
| `Pill`, `StatTile`, `FilterTabs`, `ProfileHeader`, `EntityCell/DelayCell/RemarkCell` | staff report ke building blocks |

---

## Data Flow (TanStack Query)

- Query key read hook me export (`departmentsQueryKey`, `departmentFeaturesQueryKey(id)`),
  mutation hooks wahi import karke `invalidateQueries`.
- Head nav bhi **usi** `['department-features', id]` query par chalta hai → admin ke
  mutation ke baad head sidebar auto-refresh (same session).
- Mutations retry 0, queries retry 1, `staleTime: 30_000`.
- UI side-effects (modal close) page se `.mutate(data, { onSuccess })`.

---

## Styling Conventions

- Admin screens: plain CSS `src/index.css`. Head panel: `src/styles/head.css`
  (`@import` index.css ki 2nd line par). Tailwind v4 bhi loaded hai (`@import "tailwindcss"`).
- **Gotcha:** Tailwind v4 cascade layers — unlayered custom CSS utilities ko override
  karti hai. `.modal label` / `.modal input` jaise global rules naye forms par lag jate
  hain → naye form ko apni class se specificity do (jaise `.user-form-modal label.user-form__field`).
- `.hshell button { font: inherit }` — `color: inherit` **mat** lagana (specificity
  se child classes ka color override ho jata tha).
- `src/App.css` orphan hai.

---

## Responsive & Sidebar — STRICT Rules (mandatory)

### Admin sidebar (`AdminLayout`)
- Open: topbar ☰ · Close: sidebar ✕ · >900px default open, ≤900px closed, mobile drawer
  nav ke baad auto-close, backdrop tap close.
- z-index: drawer 60 > backdrop 55 > modal 50 > topbar 40.
- `.main-content { grid-column: 2 }` explicit — hatana mat.

### Head sidebar (`HeadShell`)
- ☰ toggle collapse (236 → 64px, icons-only, labels/account hide).
- ≤760px: sidebar `position: fixed` drawer; collapsed = width 0.

### Checklist (har page)
1. 375 / 768 / 1440px check; mobile par horizontal scroll **nahi**.
2. `max-width` + `width:100%`, fixed widths nahi. Tables `.table-wrapper` (overflow-x) me.
3. Grids ≤900px par 1-col; toolbars `flex-wrap`.
4. Tap targets ≥34px. Plain CSS ho to `@media` rule saath likho.

---

## Mock Data Layer

- `db.ts`: 2 departments (Finance, Operations); har department ko `FEATURE_TEMPLATE`
  se 7 features seed: Dashboard, Department Users, Customer List, 15 Days Meeting, SOP,
  Help Center (enabled) + Reports (custom, disabled).
- Naya department → auto seed; delete → cascade.
- `head.db.ts`: 8 department users, Abhishek/Mohit ke work items, notifications.
- `auth.db.ts`: `admin@smsf.test / admin123` (ADMIN) · `head@smsf.test` (HEAD, dept-1) ·
  `user@smsf.test` (USER, dept-1) — head/user magic link se login.
- `delay()` 150–300 ms.
- **In-memory hai** → page reload par admin ke feature changes reset. Real API aane par
  sirf `src/api/*.api.ts` bodies `apiRequest(...)` se replace karni hain; hooks/pages same.

---

## Commands

```bash
npm run dev     # dev server
npm run build   # tsc -b && vite build
npm run lint    # eslint
```

---

## Status (08 Oct 2026)

**Build ✅ · Lint ✅ · tsc ✅** (verified headless Chromium me bhi: login → admin → head flows).

### Done
- [x] Router tree fix (`/login`, `_authed` layout, sab routes registered) — "Page not found" bug
- [x] Auth pages ka missing CSS (`auth-*`, `forbidden-*`, `role-badge`, `status-badge`, tokens page)
- [x] `Modal` (size/flush/Esc), `DataTable` generic mode, `Pill`, `StatTile`, `FilterTabs`, `ProfileHeader`, `TableCells`
- [x] `StaffReportModal` (daily work report — On time / On track / delayed + side tag)
- [x] Head shell prototype-match (`components/head/layout/` + `shared/` + `styles/head.css`)
- [x] Head folder structure: `layout/ shared/ users/ dashboard/ customer/ meeting/ sop/ help-center/`
- [x] Head pages `features/departments/head/pages/` + `screenRegistry` + `useHeadNav`
- [x] **Dynamic navbar** — admin feature CRUD + reorder + toggle → head sidebar/routes live
- [x] Admin `FeatureFormModal`, table me order ▲▼ / icon / path / edit / delete
- [x] `AuthUser.departmentId`

### Pending (order me)
1. `components/head/users/` ko prototype ke exact **Department Users** screen se match karna
   (abhi purane bigger styles par hai; shell compact 14px hai)
2. `components/head/dashboard/` — KPI cards, trend chart, status breakdown, most active day,
   delay-side donut, team target & performance table + `DashboardPage`
3. `components/head/customer/` — customer onboarding table, status/assignee filters, detail
   drawer, duplicates, call log, booking + `CustomerListPage`
4. `components/head/meeting/` — 15 Days Meeting + `MeetingPage`
5. `components/head/sop/` — SOP step builder + `SopPage`
6. `components/head/help-center/` — tickets, assign (manual / round robin) + `HelpCenterPage`
7. `/users` (USER role dashboard) — abhi stub; head ke `role switch` se `/users` jata hai
8. Mock → real API (`src/api/*.api.ts` bodies)
9. Git: purana unmerged index / `stash@{0}` user khud resolve kare (AI commit nahi karega)

### Cleanup notes
- `src/features/head/` aur `src/features/departments/Haed/` **delete** ho chuke (naya path
  `features/departments/head/`). `components/head/` root par ab koi file nahi — sab subfolders me.
- `src/App.css` orphan.