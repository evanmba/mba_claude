# MBA Sales App

Standalone sales-script tool for MBA closers. Separate Next.js project from the CMS dashboard in the repo root — has its own `package.json`, build, and Vercel deploy.

## Local dev

```bash
cd sales-app
npm install
npm run dev
```

Runs on `http://localhost:3000`. (If the main CMS app is also running, start this one with `npm run dev -- -p 3001`.)

## Vercel deploy

Create a **second Vercel project** separate from the CMS:

1. In the Vercel dashboard → **Add New → Project**.
2. Import the same `evanmba/mba_claude` GitHub repo.
3. On the configuration step, set **Root Directory** to `sales-app`.
4. Leave Framework Preset as **Next.js**. Keep the default build/install commands.
5. Deploy. Point a subdomain (e.g. `sales.mendozabaseball.com` or `closers.mendozabaseball.com`) at the project in its **Domains** settings.

The CMS Vercel project keeps Root Directory at `/` (the repo root) and stays unaffected. Pushes to the branch trigger both projects' builds — each builds only the code in its own root.

## What's here

- `app/page.tsx` — the sales-script UI (call-type toggle, email + closer, opening, discovery, gap creation, program recommendation).
- `app/layout.tsx` — root HTML shell + `MBA Sales Script` page metadata.
- `app/globals.css` — dark theme CSS variables + Tailwind v4 setup.
- `components/shared/PlaceholderCard.tsx` — card container used for each section.
- `public/logo.png` — MBA logo used in the header.

## Configuring closers / programs / copy

Top of `app/page.tsx`:

- `CLOSERS` — add/remove names for the dropdown.
- `PROGRAMS` — if the three program names change, update this tuple.
- `ACCENT` — cyan (`#06b6d4`) accent for this site; change hex to rebrand.
- `OPENING_COPY`, `PROGRAM_COPY` — placeholder script text. Replace with the real sales script when ready.
- `recommendProgram(d)` — placeholder rule that picks the suggested program from discovery data. Refine as the real logic comes in.
