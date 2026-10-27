# Dream Spex AI coding guide

## Project shape
- This is a Vite + React + TypeScript storefront for eyewear ecommerce. The app entry is `src/App.tsx`; routes are declared there and guard customer/franchise/admin access via `useAuth` + role checks.
- The homepage is a heavy composition in `src/pages/HomePage.tsx`, with shared shell elements in `src/components/layout/Navbar.tsx` and `src/components/layout/Footer.tsx`.
- Reuse existing UI patterns from `src/components/ui/*` instead of introducing one-off styling. `Button.tsx`, `ProductCard.tsx`, `LocationSelector.tsx`, and `LuxuryLoader.tsx` are the main reusable building blocks.
- `src/data/mockData.ts` is the canonical product/category seed data. Prefer extending it or deriving from it rather than hardcoding product content into new components.

## App architecture
- Cross-page state is split between contexts: `src/context/ShopContext.tsx` handles cart/wishlist, `src/context/AuthProvider.tsx` handles auth/role state, and `src/context/ThemeProvider.tsx` persists light/dark theme to `document.documentElement.dataset.theme`.
- Navigation and search behavior is centralized in `Navbar.tsx`; it owns megamenu logic, search modal logic, and cart/wishlist counts.
- Product/category pages are route-driven views; many “shop” flows rely on query params like `?category=...`, `?brand=...`, `?badge=...` rather than bespoke local state.

## Conventions to follow
- Use `react-router-dom` `Link` / `useNavigate` for navigation. Keep URL params consistent with existing patterns.
- Use `lucide-react` icons for UI actions; avoid adding another icon library.
- Use `react-helmet-async` + `Helmet` for page title/meta when a page is more than a simple route.
- Preserve the theme tokens and “premium green + cream” palette already used in the app; do not introduce a completely different visual language.
- Keep route protection and admin/franchise flows unchanged unless the task explicitly requires it.

## Build and validation
- Dev: `npm run dev`
- Prod build: `npm run build`
- Lint: `npm run lint` (uses `oxlint`, not ESLint)
- Preview: `npm run preview`

## Important implementation notes
- The current app is a mock-data storefront; do not replace real catalog data with placeholder demo content unless the task explicitly asks for a design-only mockup.
- If you add a new home/landing section, match the composition style already used in `HomePage.tsx`: hero area, category cards, service strip, bestsellers, explanation blocks, and CTA sections.
- For media work, prefer the existing `public/` and `src/assets/` patterns; keep video/poster fallback behavior graceful and mobile-aware.
- Avoid breaking existing routes and auth guards in `src/App.tsx`; route changes are a high-risk area.
- Prefer minimal, targeted edits over large rewrites; this codebase already has a rich but cohesive component structure.
