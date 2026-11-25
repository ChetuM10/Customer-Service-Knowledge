# Customer Service Knowledge-Based Resolution Platform — Frontend Learning Guide & Architecture

> **Role:** React & Full-Stack Engineering Reference  
> **Scope:** 6 Backend-Completed Modules (Customers, Support Requests, Issue Classification ML, Knowledge Categories, Knowledge Articles, Article Version Management)  
> **UI Style:** Shadow-layered SaaS Dashboard (Dark & Light Mode) with Google Material Symbols

---

## 🗺️ Frontend Architecture & Build Roadmap

We are building the React frontend **one file at a time**, modularly, so every single line is understood before moving forward.

```
frontend/src/
├── index.css                  ← File 1: Theme variables (Light/Dark), shadow cards, tables, badges
├── services/
│   └── api.js                 ← File 2: Centralized Axios instance & API endpoint functions
├── context/
│   └── ThemeContext.jsx       ← File 3: Global Light/Dark theme state + localStorage persistence
├── components/
│   ├── Layout.jsx             ← File 4: Sidebar + Top Header + Theme Toggle + Outlet
│   └── StatusBadge.jsx        ← File 5: Reusable pill badge for statuses, priorities & ML confidence
├── pages/
│   ├── CustomersPage.jsx      ← File 6: Module 1 (List, Search, Create, Edit, Delete Customers)
│   ├── TicketsPage.jsx        ← File 7: Modules 2 & 3 (Tickets CRUD + ML Classification & Probabilities)
│   ├── CategoriesPage.jsx     ← File 8: Module 4 (Knowledge Categories CRUD + Soft Deactivate)
│   └── ArticlesPage.jsx       ← File 9: Modules 5 & 6 (Articles CRUD, Lifecycle Transitions & Version History)
└── App.jsx                    ← File 10: React Router setup connecting all pages
```

---

## 📄 File 1: `src/index.css` — Theme System, Shadows & Base Styles

### 1. What It Does
Defines the global CSS reset, typography, and a **CSS Variable Design System** that powers both **Dark Mode** (deep zinc/charcoal surfaces with layered shadows, inspired by the shadcn dashboard) and **Light Mode** (crisp white elevated cards with soft drop shadows).

### 2. Imports
None (this is a pure CSS stylesheet imported once in `src/main.jsx`).

### 3. Simple Language Explanation
Think of `index.css` as the **paint palette and furniture rulebook** for the entire house. Instead of picking colors separately in every room (component), we define named colors like `--bg-card` and `--text-primary` at the top. When the user flips the Light/Dark switch, we only change one label (`data-theme="dark"` vs `data-theme="light"`) on the root HTML element, and the entire app's colors and shadows update automatically.

### 4. Event & Flow Tracing (Theme Variable Resolution)
1. **Initial Load:** `index.css` sets `:root` (default dark theme) variables on the `<html>` element.
2. **User Toggles Theme:** JavaScript updates `document.documentElement.setAttribute('data-theme', 'light')`.
3. **Browser Recalculation:** The CSS selector `[data-theme="light"]` overrides the variables (`--bg-app`, `--bg-card`, `--shadow-card`, etc.).
4. **Instant Repaint:** Every component using `var(--bg-card)` and `var(--shadow-card)` repaints smoothly via `transition: background-color 0.2s ease, color 0.2s ease`.

### 5. Technical Explanation
- **CSS Custom Properties (`--var-name`):** Runtime-evaluated variables scoped to `:root` and overridden via attribute selectors (`[data-theme="light"]`).
- **Elevation via Box-Shadow:** Dark mode uses subtle top-edge highlights (`inset 0 1px 0 rgba(255,255,255,0.04)`) combined with deep drop shadows (`0 8px 24px rgba(0,0,0,0.45)`) because dark backgrounds swallow standard gray shadows. Light mode uses soft multi-layered ambient + direct shadows (`0 4px 12px rgba(15,23,42,0.06)`).
- **Utility Classes:** `.card`, `.btn`, `.badge`, `.data-table`, and `.modal-backdrop` keep JSX clean and prevent duplicating inline styles across modules.

### 6. Interview Corner
1. **Why use CSS Variables (`var(--bg-card)`) for Dark/Light mode instead of React inline styles?**  
   *Answer:* CSS variables update at the browser's CSS engine level without triggering React component re-renders across the entire tree, and they work seamlessly with pseudo-classes like `:hover` and `:focus`.
2. **Why does `box-sizing: border-box` matter in layouts?**  
   *Answer:* By default (`content-box`), adding `padding` or `border` increases an element's total width beyond `100%`, causing horizontal scrollbars. `border-box` includes padding and border inside the declared width/height.
3. **Why do dark mode cards need a subtle `border` or `inset` highlight in addition to `box-shadow`?**  
   *Answer:* On dark backgrounds (`#09090b`), a black drop shadow has very low contrast. Adding a `1px solid` muted border and a faint top inset highlight creates clear visual separation and depth.

---

## 📄 File 2: `src/components/Layout.jsx` — App Shell, Sidebar & Light/Dark Toggle

### 1. What It Does
Renders the persistent dashboard skeleton: a left **Sidebar** (brand + 4 module links), a **Top Header** (page title + Light/Dark theme toggle button), and a **Main Content Area** (`<Outlet />`) where the active page renders.

### 2. Imports
- `useState`, `useEffect` from `'react'` — manages `theme` (`'dark'` / `'light'`) and syncs it with `document.documentElement` and `localStorage`.
- `NavLink`, `Outlet`, `useLocation` from `'react-router-dom'` — handles active sidebar highlighting, nested page rendering, and reading the current URL path for the header title.

### 3. Event & Flow Tracing (Light/Dark Toggle)
1. **Initial Mount:** `useState` reads `localStorage.getItem('theme')` (defaults to `'dark'`).
2. **Side Effect (`useEffect`):** Runs whenever `theme` changes:
   - Sets `document.documentElement.setAttribute('data-theme', theme)`
   - Saves preference via `localStorage.setItem('theme', theme)`
3. **User Clicks Toggle Button:** `onClick` flips `theme` (`'dark'` ↔ `'light'`), triggering `useEffect` and repainting all CSS variables in `index.css`.

### 4. Interview Corner
1. **What is `<Outlet />` in React Router v6?**  
   *Answer:* A placeholder inside a parent layout route that renders whichever child route matches the current URL, keeping the sidebar/header mounted without re-creating them on navigation.
2. **Why `NavLink` instead of `<a href="...">`?**  
   *Answer:* `<a href>` triggers a full browser page reload and loses React state; `NavLink` swaps views client-side and automatically provides `isActive` for styling the active menu item.

