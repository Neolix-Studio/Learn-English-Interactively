# CSS Architecture

The application uses a modern Vanilla CSS approach built on top of **CSS Variables (Custom Properties)**, managed within the Vite build system.

## File Breakdown

### `src/index.css` & `src/App.css`
The core styling files. They contain:
- **Theme Variables**: Defines the dynamic color palette (using standard CSS hex/rgb values).
- **Global Resets**: Box-sizing, typography resets, base body styles (using Google Fonts like Inter/Outfit).
- **Shared Utilities**: Standard animations (e.g., `fade-in`, spinner animations).

### Component-Level Styling
Instead of massive monolithic CSS files, styling is largely handled via:
- **Inline Styles**: Highly dynamic styles (like progress bars filling up, or elements reacting to user clicks) are computed inline in React components.
- **Utility Classes**: Found in `index.css` for common layout structures (e.g., `.screen`, `.interactive-active`).

## Theme System (Dark Mode & Dynamic Themes)
The application supports dynamic theming. We do NOT hardcode colors like `white` or `#000` into our components. 

All components use design tokens:
- `var(--color-bg-base)`: The absolute background of the page.
- `var(--color-bg-surface)`: Raised surfaces (cards, sidebars).
- `var(--color-text-main)`: Primary readable text.
- `var(--color-accent-in)`: The primary brand/action color.
- `var(--glass-border)`: Semi-transparent borders for cards.

> **See [[THEME_UPDATE_GUIDE|Theme Update Guide]]** for detailed instructions on how to add new color palettes, implement dark mode, and modify the global CSS variables dynamically using JavaScript.

## Design Philosophy (Glassmorphism & Neumorphism)
The design relies on "Glassmorphism":
- High contrast vivid accents.
- Background blurs (`backdrop-filter: blur(12px)`).
- Subtle borders to define edges.
- Smooth transitions on interaction (`transform: translateY(2px)`).
