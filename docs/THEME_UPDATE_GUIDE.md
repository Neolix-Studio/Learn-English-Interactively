# Theme Update Guide

This document outlines the current state of styling in the project and everything that needs to be refactored or updated to fully support dynamic theming (e.g., seamless switching between light, dark, and future custom themes).

## Current Theme System

The project currently uses a CSS Custom Properties (variables) based theme system. 
The core variables are defined in `src/assets/css/main.css` and use the `[data-theme="dark"]` attribute on the `:root` element to switch variable values.

**Main Theme Variables:**
```css
:root {
    --color-bg-base: #F9FAFB;
    --color-bg-surface: #FFFFFF;
    --color-text-main: #111827;
    --color-text-muted: #6B7280;
    --color-accent-in: #3b82f6;
    /* ... */
}
```

## What Needs to Be Changed

To make future theme updates robust and easy, the following areas must be addressed. Right now, there are many hardcoded values and inline styles that do not respond to theme changes.

### 1. Refactor Inline Styles
Many components use React inline `style={{ ... }}` blocks. Even when they use CSS variables (e.g., `color: 'var(--color-text-main)'`), inline styles are harder to maintain, override, and manage for animations/transitions.

**Files heavily relying on inline styles:**
- **Pages:** `Home.tsx`, `PracticePage.tsx`, `Contact.tsx`, `Gateway.tsx`, `Leaderboard.tsx`, `Dashboard.tsx`, `Characters.tsx`, `Impressum.tsx`
- **Welcome Screens:** `WelcomeLayout.tsx`, `WelcomeStartScreen.tsx`, `ExperienceScreen.tsx`, `WhyLearningScreen.tsx`, `PlacementScreen.tsx`, `HearAboutUsScreen.tsx`
- **Lesson Player:** `LessonPlayer.tsx`, `BossEncounter.tsx`, `PostLesson.tsx`, `InteractiveSentence.tsx`, `QuestionHeader.tsx`
- **Exercises:** Most components in `src/components/LessonPlayer/exercises/` (`Dictation.tsx`, `MultipleChoice.tsx`, `MatchPairs.tsx`, etc.)
- **Modals:** `AuthModal.tsx`, `ProfileModal.tsx`, `ShopModal.tsx`, `GrammarModal.tsx`
- **Global Components:** `Header.tsx`, `SidebarLeft.tsx`, `SidebarRight.tsx`, `Roadmap.tsx`, `ModuleBanner.tsx`

**Action:** Move inline styles into CSS modules or standard CSS classes (e.g., `main.css`, `interactive.css`) using BEM or standard class naming.

### 2. Remove Hardcoded Hex and RGBA Colors
Several files contain hardcoded hex (`#RRGGBB`) or `rgba(...)`/`oklch(...)` colors in their `.tsx` files instead of relying on the `--color-*` variables. These will break or look incorrect if a new theme palette is introduced.

**Notable files with hardcoded colors:**
- `src/pages/Gateway.tsx` (Lots of SVGs with hardcoded `fill="#CE2939"`, `#FFFFFF`, `#0B4EA2`, etc.)
- `src/pages/Home.tsx` (Hardcoded SVG strokes like `#3B82F6`, `#F59E0B`, `#8B5CF6`)
- `src/pages/PracticePage.tsx` (Hardcoded borders and shadows like `#F59E0B`, `#D97706`, `rgba(0,0,0,0.2)`, `rgba(255,255,255,0.05)`)
- `src/pages/Contact.tsx` (Hardcoded `oklch(1 0 0 / 0.05)`)
- `src/components/modals/GrammarModal.tsx`

**Action:** Replace all hardcoded colors with semantic CSS variables. If a specific color is needed, add it to `main.css` (e.g., `--color-warning: #F59E0B;`) and define its dark mode equivalent.

### 3. SVG Fill and Stroke Attributes
SVGs within the components are often hardcoded with `fill="color"` or `stroke="color"`.

**Action:** 
- For dynamic SVGs, use `fill="currentColor"` or `stroke="currentColor"` and set the color on the parent element.
- For multi-colored SVGs (like the mascots in `Gateway.tsx`), extract the colors into CSS variables so they can adapt to dark mode (e.g., `fill="var(--mascot-fur)"`).

### 4. Review CSS Files for Hardcoded Values
Some CSS files might still contain hardcoded values instead of using the `--color-*` variables.

**Files to review:**
- `dashboard.css`, `gateway.css`, `grammarModal.css`, `interactive.css`, `landing.css`, `legal.css`, `roadmap.css`

**Action:** Scan these files and replace `#...` and `rgb/rgba` values with appropriate variables.

## Summary Checklist for Next Theme Update

- [ ] Consolidate all CSS variables into `src/assets/css/main.css` (or a dedicated `theme.css`).
- [ ] Ensure every semantic color (backgrounds, surfaces, texts, borders, shadows, accents, success, error, warnings) has a defined light and dark mode variable.
- [ ] Search for `style={{` in `src/` and migrate inline styling to CSS classes.
- [ ] Search for `#`, `rgb(`, `rgba(`, `oklch(` in `.tsx` files and replace them with `var(--...)`.
- [ ] Check all `<svg>` elements and update `fill`/`stroke` to use `currentColor` or variables.
- [ ] Add `transition: background-color 0.4s ease, color 0.4s ease;` (or use `var(--transition-theme)`) to all global surfaces for smooth theme switching.
