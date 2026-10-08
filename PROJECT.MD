# PROJECT.MD — SMSF Admin Portal + MBG Onboarding Console (Head/User Panels)

Teen role experiences ek hi React app me:

1. **Admin Portal** (`/admin/*`) — departments banana, har department ke **features
   (= head panel ke menu items)** manage karna, Head/User ke liye login links issue karna.
2. **Head Panel / MBG Onboarding Console** (`/head/*`) — department head ka console.
   Sidebar ke items **admin ke feature permissions se dynamically** aate hain.
3. **User Panel** (`/users/*`) — department user ka console. Wahi reusable shell/screens
   use karta hai, lekin Role B permissions aur USER session ke hisaab se read/edit access milta hai.

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
| `/forbidden` | Logged-in | 403 | `ForbiddenPage` |
| `/departments/$departmentId/{dashboard,customers,help-center,services}` | — | Purane department template pages | `Department*Page` |

### Head Panel (`_head` layout → `HeadConsoleLayout`)

| Path | Access | Kya hota hai |
|---|---|---|
| `/head` | ADMIN, HEAD | Pehle **enabled** feature par redirect (`HeadIndexPage`) |
| `/head/$screen` | ADMIN, HEAD | `$screen` = feature ka **slug** → enabled feature dhundho → `SCREEN_REGISTRY[feature.screen]` ka page render (`HeadScreenPage`) |

> Sirf **2 routes** — naya menu item add karne par router me kuch nahi badalna.
> Disabled / unknown slug → "Page not available" card.

### User Panel (`_user` layout → `HeadConsoleLayout`)

| Path | Access | Kya hota hai |
|---|---|---|
| `/users` | **USER** | Pehle enabled feature par redirect; Role B permission apply hoti hai |
| `/users/$screen` | **USER** | Admin-enabled feature ko same `SCREEN_REGISTRY` se render karta hai |

Head aur User ke liye duplicated pages nahi hain: `HeadConsoleLayout`, `HeadIndexPage`,
`HeadScreenPage`, User/Customer page compositions aur reusable components dono portals share
karte hain. URL base session role ke hisaab se `/head` ya `/users` hota hai.

**Middleware** (`src/app/middleware/auth.middleware.ts`):

- `requireAuth()` — bina session `/login`
- `requireRole(...)` — normal role guard
- `requireRoleDashboard(...)` — wrong dashboard kholne par logged-in user ko uske apne
  role home (`/admin`, `/head`, `/users`) par redirect
- `redirectAuthenticatedUser()` — logged-in user ko guest login page se role home bhejta hai

Magic-link token existing session par priority rakhta hai. HEAD/USER session me `departmentId`
hota hai (`AuthUser.departmentId`); admin head-preview ke liye fallback `dept-1`.

---

## Dynamic Head Navbar (core design)

**Feature permission == sidebar item.** Admin jo karega, Head/User console me turant dikhega:

```
Admin: /admin/departments/$id  ──(create/update/delete/move/toggle)──▶  featurePermissions[]
                                                                             │
Portal: useHeadNav(departmentId) ─ enabled ∧ screen ∧ sort(order) ─▶ HeadShell sidebar
                                                                             │
       /head/$screen or /users/$screen ─ slug match ─▶ SCREEN_REGISTRY component ─▶ page
```

`FeaturePermission` fields:

| Field | Matlab |
|---|---|
| `name`, `description` | Sidebar label · topbar subtitle |
| `screen` | `dashboard` \| `users` \| `customers` \| `attendance` \| `meeting` \| `sop` \| `help-center` \| `custom` — kaunsa page component |
| `slug` | URL segment: `/head/<slug>` ya `/users/<slug>` (department me unique) |
| `icon` | `IconName` (`components/head/shared/iconPaths.ts`) |
| `order` | Sidebar position (admin ▲▼ se) |
| `enabled` | Off → sidebar se gayab + route block |
| `roleAPermission`, `roleBPermission` | `CAN_READ` / `CAN_EDIT` (Role A = Head, Role B = User) |
| `category` | `screens` \| `customers` \| `users` — admin page par **alag block** |
| `kind` | `screen` (sidebar item) ya `column` (table column — nav me kabhi nahi aata) |
| `columnKey` | Column features: table ka column id (`company`, `phone`, `actions` …) |

### Category-wise column features (2nd admin block)

`/admin/departments/$id` par **teen alag cards** khulte hain
(`FEATURE_CATEGORIES`, `features/permissions/config/featureCategories.ts`):

1. **Head Panel Menu** — purana feature table (reorder / toggle / Role A-B / edit / delete)
2. **Customer List — Columns** — `CUSTOMER_COLUMN_TEMPLATE` ke 6 columns
3. **Department Users — Columns** — `USER_COLUMN_TEMPLATE` ke 8 columns

Har column row par **enable/disable toggle + Role A / Role B** permission.
Head panel (`useColumnFeatures(departmentId, 'customers' | 'users')`):

- `enabled: false` → column table me **bilkul render nahi hota**
- `actions` column ka permission hi manage-access decide karta hai: `CAN_EDIT` →
  edit/delete/Add buttons; `CAN_READ` → sirf view. (Screen-level ka alag gate nai.)
- session role HEAD/ADMIN → `roleAPermission`, USER → `roleBPermission`
- unknown column → fail-open (visible + editable), taaki missing seed table khaali na kare

Isliye `useHeadNav` sirf `kind === 'screen' && enabled` leta hai — column rows
sidebar me kabhi nahi aati.

Naya screen type add karna ho: `permission.types.ts` me `HeadScreenKey` → page banao
`features/departments/head/pages/` me → `screenRegistry.tsx` me map karo →
`features/permissions/config/screenOptions.ts` me admin dropdown option.
Naya **column** add karna ho: template array me entry daalo → `CustomerTable` /
`DepartmentUsersTable` me `hiddenColumns` handling add karo.

---

## Folder Structure

```
src/
├── app/
│   ├── router.tsx                      # admin + _head + _user route trees
│   ├── middleware/auth.middleware.ts   # auth/role guards + role-home redirects
│   ├── auth/session.ts                 # localStorage session + homeForRole()
│   ├── queryClient.ts / providers/QueryProvider.tsx
├── api/
│   ├── client.ts                       # fetch wrapper (real API ke liye)
│   ├── departments.api.ts              # mock CRUD
│   ├── feature-permissions.api.ts      # get / create / update / delete / move (mock)
│   ├── auth.api.ts, customers.api.ts, services.api.ts, help-center.api.ts, department-dashboard.api.ts
│   └── mock/
│       ├── db.ts                       # departments + FEATURE_TEMPLATE (8 built-in screens) + COLUMN templates + seed + template reconciliation
│       ├── persist.ts                  # readPersisted/writePersisted (localStorage, versioned keys)
│       ├── auth.db.ts                  # users (head/user → departmentId: 'dept-1') + issuedTokens (persisted)
│       ├── head.db.ts                  # department users, work items, notifications
│       └── staff-report.db.ts          # sample staff report items
├── styles/
│   └── head.css                        # head panel ka poora CSS (.hshell tokens) — index.css se @import
├── components/
│   ├── layout/   ui/   common/   departments/   customers/   dashboard/   services/   help-center/
│   ├── permissions/
│   │   ├── FeaturePermissionsTable.tsx # order ▲▼ · icon+path · toggle · Role A/B · edit/delete
│   │   ├── ColumnFeaturesTable.tsx     # column rows: name · toggle · Role A/B
│   │   ├── FeatureFormModal.tsx        # add/edit feature (screen → slug/icon auto-fill)
│   │   └── PermissionToggle.tsx
│   ├── reports/                        # StaffReportModal, WorkReportTable, workReportMeta
│   └── head/                           # ⭐ MBG Onboarding Console components
│       ├── layout/                     # HeadShell, HeadSidebar, HeadTopbar, NotificationsMenu, ImpersonationBanner
│       ├── shared/                     # Icon + iconPaths, SegmentedControl, IconButton, Avatar, SearchBar, SectionCard, LearningButton
│       ├── users/                      # DepartmentUsersTable, UserFormModal, UserDetails, RolePill, MetricPill, roleMeta
│       ├── dashboard/                  # (pending)
│       ├── customer/                   # (pending)
│       ├── 15-days-meeting/            # meeting filters/list/search components
│       ├── sop/                        # SOP search/modal components
│       ├── help-center/                # (pending)
│       └── user/
│           └── attendance/             # `checkin.tsx` (DailyAttendanceCard) + `calender.tsx` (AttendanceCalendar) — dashboard page me composed
└── features/
    ├── auth/        # login, tokens, forbidden (types me AuthUser.departmentId add hua)
    ├── permissions/
    │   ├── types/permission.types.ts   # FeaturePermission (+screen/slug/icon/order/category/kind/columnKey), HeadScreenKey
    │   ├── config/screenOptions.ts     # admin dropdown: screens + ICON_OPTIONS
    │   ├── config/featureCategories.ts # FEATURE_CATEGORIES + CUSTOMER/USER_COLUMN_TEMPLATE + categoryMeta
    │   ├── hooks/useDepartmentFeatures.ts, useUpdateFeaturePermission.ts, useFeatureMutations.ts (create/remove/move)
    │   ├── hooks/useColumnFeatures.ts  # hiddenColumns + canEdit (session role → Role A/B)
    │   └── pages/FeaturePermissionsPage.tsx  # category-wise cards (menu · customer cols · user cols)
    ├── reports/types/staff-report.types.ts
    └── departments/
        ├── types/ hooks/ components/ pages/   # purane department template pages
        └── head/                       # ⭐ Head panel pages
            ├── config/screenRegistry.tsx       # screen key → page component
            ├── hooks/useHeadNav.ts             # features → nav items (+bySlug)
            ├── hooks/useHeadDepartmentId.ts
            ├── types/head.types.ts             # HeadNavItem, HeadAccount, HeadNotification, DepartmentUser…
            └── pages/
                ├── HeadConsoleLayout.tsx       # shared _head/_user layout (HeadShell + Outlet)
                ├── HeadIndexPage.tsx           # /head or /users → first enabled
                ├── HeadScreenPage.tsx          # shared dynamic screen resolver
                ├── DashboardPage.tsx           # placeholder body
                ├── DepartmentUsersPage.tsx     # ✅ full (table, add/edit/delete, login-as, staff report)
                ├── CustomerListPage.tsx        # ✅ customers-list UI (composes components/head/customers-list)
                ├── AttendancePage.tsx          # ✅ composed from user/attendance widgets (check-in + month calendar)
                ├── MeetingPage.tsx             # ✅ filters/search/status + local mock interactions
                ├── SopPage.tsx                 # ✅ search + inline sequence editing (local mock)
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

Shell features: collapsible sidebar, yellow active bar, account card (email + actual session role),
logout, sticky blur topbar, bell + unread badge +
dropdown ("Mark all read"), impersonation strip ("You are logged in as X").

> Head/User preview switch ab route access decide nahi karta. Logged-in session role authoritative
> hai; HEAD `/head/*` aur USER `/users/*` route tree me hi rehta hai.

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
- `useHeadNav` session role se correct route base (`/head` / `/users`) banata hai.
- `useColumnFeatures` Role A (HEAD/ADMIN) ya Role B (USER) select karke hidden columns aur
  editable controls derive karta hai.
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
  se 8 features seed: Dashboard, Department Users, Customer List, **Attendance**,
  15 Days Meeting, SOP, Help Center (enabled) + Reports (custom, disabled) + **6
  Customer columns + 8 User columns** (`kind: 'column'`, nav me kabhi nahi aate).
- `db.ts` customers (11) ab **onboarding fields ke saath seed** hote hain —
  `onboardingStatus` (pending/in-progress/completed), `callStatus`, `assigneeId`
  (head.db users), `remark`, `updatedLabel`, `contactDate`, biz-relation pills
  (`businessRelationType/businessCount/businessIndex/duplicateCount`). Purane kisi bhi
  profile ke liye `CustomerListPage` fallback derive karta hai — customers array persist
  nahi hota (load par code se fresh seed), isliye naye fields turant sabko dikhte hain.
- `ensureTemplateScreens()` — persisted dept me template screen missing ho to add karke
  persist karta hai (naya built-in screen purane snapshots me bhi paucha, data wipe na).
- Naya department → auto seed; delete → cascade.
- `head.db.ts`: 8 department users, Abhishek/Mohit ke work items, notifications.
- `auth.db.ts`: `admin@smsf.test / admin123` (ADMIN) · `head@smsf.test` (HEAD, dept-1) ·
  `user@smsf.test` (USER, dept-1) — head/user magic link se login.
- `delay()` 150–300 ms.
- **Ab localStorage me persist** hota hai (versioned keys) — reload/new tab par bhi data
  rehta hai:
  - `smsf.mock.db` (v1) → departments + feature permissions
  - `smsf.mock.issued-tokens` (v1) → magic links (taki admin ke banaye token reload/HMR/new
    tab me bhi kaam kare)
  - `smsf.auth.session` → login session (purana)
  - Admin kisi doosre tab me feature add/remove/toggle kare to `storage` event par
    `hydrateMockDb()` module-level arrays reload karta hai aur React Query ke department/
    feature queries invalidate hote hain; open Head/User sidebar bina reload update hota hai.
  - Auth session bhi localStorage-based hai, isliye same browser profile ke tabs ek session
    share karte hain. Simultaneous ADMIN aur HEAD/USER testing ke liye alag profile/incognito use karo.
  - Reset chahiye → browser me in keys ko delete kar do (profile wipe).
  - Real API aane par sirf `src/api/*.api.ts` bodies `apiRequest(...)` se replace karni hain;
    hooks/pages same.

---

## Commands

```bash
npm run dev     # dev server
npm run build   # tsc -b && vite build
npm run lint    # eslint
```

---

## Status (08 Oct 2026)

**Build ✅ · Lint ✅ · tsc ✅**. Latest role-route/permission changes production build aur
ESLint se verify hue. Naye E2E (CDP, preview build) me `smoke.mjs` sab steps pass:
admin login → link issue → reload persistence → 3 category cards (6/8 rows) → Company
column off → reload → head magic link → sidebar → **customers-list UI** (`/head/customers`
par `components/head/customers-list/`: SearchBar + tab/assignee/date Filters + table
[#/Business/Contact/Status/Assign To/Internal Remark/Updated] + biz pill + drawer) →
Department Users headers → raw token paste login. **Actions Role A → CAN_READ → customers-list
read-only** (status/assign/phone-edit buttons disabled, remark read-only; drawer phir bhi
khulta hai) bhi E2E verified. **Attendance** screen (`attendance.mjs`) pehle pass tha.
NOTE: source files kabhi kabhi external editor se overwrite ho rahe the (dot network) —
is baar `screenRegistry.tsx` ka `customers` mapping `CustomerListPage` se
`CustomerOnboardingPage` par revert hua aur `CustomerListPage.tsx` double-gate
(`screenPermission && canEdit`) par wapis gaya; dono dobara fix kiye. Aakhiri decided design:
Actions column **single-gate** — `CustomerListPage` ab wahi `columnFeatures.canEdit('actions')`
se `canEdit` leta hai aur customers-list components ko wired karta hai (updates `useUpdateCustomer`
se persist; `CustomerOnboardingPage.tsx` local-only overrides wala aata hai, registered nahi).
Dhyan rahe: Customer Columns config (admin card) ab customers-list table ka layout control
nahi karta — vo sirf admin/legacy `CustomerTable` par lagta hai.

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
- [x] **Role-aware dashboard middleware** — login/session role se ADMIN → `/admin`,
      HEAD → `/head`, USER → `/users`; wrong dashboard access apne role home par redirect
- [x] **USER console routes** — `_user` layout + `/users` + `/users/$screen`, shared
      `HeadConsoleLayout`/registry/components, USER-specific sidebar URLs
- [x] **Screen + column permission enforcement** — Role A = HEAD/ADMIN, Role B = USER;
      `CAN_READ` read-only aur `CAN_EDIT` par Customer/User add-edit-delete/login-as actions
- [x] **"Invalid or revoked access token" fix** — `issuedTokens` localStorage me persist +
      `loginWithToken` raw token / `?token=` extract / `+`–space tolerant matching
- [x] **Magic link wins over existing session** (`loginRoute.beforeLoad`) — koi doosra user
      login hai to bhi link kholne par usi link wala banda login hota hai
- [x] **Category-wise column features** — 3 admin cards + `kind/category/columnKey` model +
      `useColumnFeatures` + `CustomerTable` / `DepartmentUsersTable` me `hiddenColumns` +
      actions permission gating + head `CustomerListPage` full
- [x] Mock persistence (departments, feature permissions, issued tokens) + pre-existing tsc
      errors (`customer/dashboard.tsx`, `user/attendance/checkin.tsx`) fixed
- [x] **Cross-tab feature sync** — admin add/remove/toggle ke `smsf.mock.db` storage event par
      mock DB rehydrate + React Query invalidation; open Head/User nav live refresh
- [x] **Attendance screen** — `HeadScreenKey` + `SCREEN_OPTIONS` + `screenRegistry` +
      `AttendancePage` (composes `DailyAttendanceCard` + `AttendanceCalendar` from
      `components/user/attendance/`) + FEATURE_TEMPLATE seed; head & user console me
      sidebar item + `/head` `/users` par E2E render verified (check-in card, calendar,
      check-out interaction)
- [x] **Customers-list UI on Customer List screen** — `CustomerListPage` ab
      `components/head/customers-list/*` compose karta hai: SearchBar + tab/assignee/
      date-range Filters + onboarding table (status/assign/remark inline edit, founder-
      biz pill, duplicates, phone/call, updated, action icons) + detail drawer
      (`CustomersListModal`, SAMPLE_FOUNDER_BUSINESSES cust-1/cust-2 ke liye extend).
      `Customer` type/`UpdateCustomerRequest` onboard fields extend, `db.ts` 11 customers
      seeded (onboardingStatus/callStatus/assigneeId/remark/updatedLabel/contactDate/
      biz pills/duplicates), `createCustomer` defaults onboard fields. Edits
      `useUpdateCustomer` se persist; access **single-gate** (`canEdit = canEdit('actions')`),
      CAN_READ par disabled/read-only + drawer khulta hai — E2E verified.

### Pending (order me)
1. `components/head/users/` ko prototype ke exact **Department Users** screen se match karna
   (abhi purane bigger styles par hai; shell compact 14px hai)
2. `components/head/dashboard/` — KPI cards, trend chart, status breakdown, most active day,
   delay-side donut, team target & performance table + `DashboardPage`
3. ~~`components/head/customer/` — customer onboarding table, status/assignee filters, detail
   drawer, duplicates, call log, booking + `CustomerListPage`~~ ✅ done — ~`components/head/
   customer/`~ ab `components/head/customers-list/` (user ke dots se) + `CustomerListPage` wired.
   Baaki: call-log/booking sections prototype ke saath aur match karna.
4. 15 Days Meeting ke local mock interactions ko real API/persistence se connect karna
5. SOP inline sequence editing ko real API/persistence se connect karna
6. `components/head/help-center/` — tickets, assign (manual / round robin) + `HelpCenterPage`
7. Mock → real API (`src/api/*.api.ts` bodies), including Department Users CRUD
8. Role/permission flows ka browser E2E: ADMIN config → HEAD Role A → USER Role B
9. Git: purana unmerged index / `stash@{0}` user khud resolve kare (AI commit nahi karega)

### Cleanup notes
- `src/features/head/` aur `src/features/departments/Haed/` **delete** ho chuke (naya path
  `features/departments/head/`). `components/head/` root par ab koi file nahi — sab subfolders me.
- `src/App.css` orphan.