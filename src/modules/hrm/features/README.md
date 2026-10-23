# `src/features/` — Business Domains

This folder is intentionally empty. Each business domain lives as its own
self-contained subfolder. Add one when you start the feature — not before.

## Adding a new feature

```
src/features/<feature>/
├── components/   # React components used ONLY by this feature
├── hooks/        # Hooks used ONLY by this feature
├── services/     # API calls + DTO mapping for this feature
├── store/        # Redux slice (or react-query keys) for this feature
├── types/        # TypeScript types for this feature
└── index.ts      # PUBLIC API — the ONLY file external code may import from
```

Naming: lowercase singular (`employees/`, `payroll/`, `auth/`).

## Rules (enforced by ESLint)

1. **Features never import other features.** If two need the same thing, lift it to `@shared/`.
2. **External code may only import a feature's `index.ts`.** Deep imports are blocked.
3. **A feature may import `@shared/*` and `@config/*`** — never `@app/*`.
4. **A feature owns its own slice, services, and types.** No central `hrmSlice` style monolith.

See [`FRONTEND_RULES.md`](../../FRONTEND_RULES.md) §1 and §6 for the full contract.
