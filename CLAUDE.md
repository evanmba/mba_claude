# CMS Dashboard — Project Documentation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives) |
| Icons | [Lucide React](https://lucide.dev/) |
| Package Manager | npm |

---

## Folder Structure

```
mba_claude/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root layout (fonts, metadata)
│   ├── globals.css             # Global styles, CSS variables, dark theme
│   ├── page.tsx                # Dashboard home page
│   ├── instagram/page.tsx      # Instagram Manager section
│   ├── analytics/page.tsx      # Analytics section
│   ├── calendar/page.tsx       # Content Calendar section
│   ├── competitors/page.tsx    # Competitor Tracker section
│   └── news/page.tsx           # News Consolidator section
│
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx # Wrapper: Sidebar + Header + main content
│   │   ├── Sidebar.tsx         # Fixed left navigation sidebar
│   │   └── Header.tsx          # Top header bar (title, search, avatar)
│   └── shared/
│       ├── PlaceholderCard.tsx # Generic card container with icon/title/desc
│       └── StatCard.tsx        # Metric card with value, trend, and icon
│
├── lib/
│   └── utils.ts                # cn() utility (clsx + tailwind-merge)
│
├── components.json             # shadcn/ui configuration
├── CLAUDE.md                   # This file
└── tsconfig.json
```

---

## Dashboard Sections

| Section | Route | Description |
|---------|-------|-------------|
| Dashboard | `/` | Overview with stats, quick nav tiles, recent activity |
| Instagram Manager | `/instagram` | Post queue, quick actions, engagement stats |
| Analytics | `/analytics` | Reach chart, audience breakdown, top content |
| Content Calendar | `/calendar` | Monthly calendar grid with scheduled posts |
| Competitor Tracker | `/competitors` | Competitor table, content gap analysis, timing insights |
| News Consolidator | `/news` | Aggregated news feed with trending topics and source management |

---

## Design System

### Theme
- **Dark theme only** — no light mode toggle. All CSS custom properties are set to dark values in `:root`.
- Color palette is defined via CSS custom properties in `app/globals.css`.

### Key CSS Variables

```css
--background: #0a0f1e;       /* Page background */
--card: #0f172a;              /* Card/panel background */
--foreground: #e2e8f0;        /* Primary text */
--muted-foreground: #94a3b8;  /* Secondary/muted text */
--primary: #3b82f6;           /* Blue accent */
--secondary: #1e293b;         /* Subtle backgrounds */
--border: #1e293b;            /* Border color */
--sidebar-bg: #060d1a;        /* Sidebar background (slightly darker) */
--sidebar-width: 260px;       /* Sidebar fixed width */
```

### Accent Colors per Section

| Section | Color | Hex |
|---------|-------|-----|
| Instagram Manager | Purple/Fuchsia | `#d946ef` |
| Analytics | Blue | `#3b82f6` |
| Content Calendar | Green | `#22c55e` |
| Competitor Tracker | Amber | `#f59e0b` |
| News Consolidator | Red | `#ef4444` |

---

## Component Conventions

### Layout
- All pages wrap their content with `<DashboardLayout>` which provides the sidebar and header.
- The sidebar is `position: fixed`; the main content area uses `margin-left: var(--sidebar-width)`.

### Styling Approach
- **Tailwind classes** for layout, spacing, and responsive grid utilities.
- **Inline `style` props** for CSS custom property values (e.g., `style={{ color: "var(--primary)" }}`). This is because Tailwind v4 does not automatically resolve arbitrary CSS variables in class names.
- Hover effects on interactive elements use `onMouseEnter`/`onMouseLeave` handlers where CSS variables are involved.

### Shared Components
- `PlaceholderCard` — general-purpose card. Pass an `icon`, `title`, `description`, and `children`.
- `StatCard` — metric display with optional trend indicator (up/down/neutral).

### File Naming
- Page files: `app/<section>/page.tsx`
- Components: PascalCase (e.g., `Sidebar.tsx`, `StatCard.tsx`)
- Utilities: camelCase (e.g., `utils.ts`)

---

## Key Decisions

1. **App Router over Pages Router** — Uses Next.js App Router for modern React Server Components support and better routing ergonomics.

2. **CSS variables for theming** — Rather than Tailwind's `dark:` variant classes, CSS variables are set globally to dark values. This avoids `<html class="dark">` manipulation and ensures consistent dark theme without any client-side toggle logic.

3. **shadcn/ui manually configured** — The `components.json` was manually created (rather than via the CLI interactive prompt) to lock in the slate base color and correct path aliases.

4. **Inline styles for CSS vars** — Tailwind v4 doesn't resolve arbitrary `var(--*)` values in class names reliably, so CSS variable references are passed as inline `style` props. Tailwind classes are still used for all structural/layout utilities.

5. **Placeholder data** — All pages contain realistic placeholder/mock data to demonstrate the intended UX. No live API integrations are set up yet.

6. **`lucide-react` for icons** — Consistent icon library with good TypeScript support, tree-shakeable, and compatible with shadcn/ui's icon conventions.
