# Mastering Prepositions - Design Guide

This design guide documents the design system, color palette, typography, visual components, and interactive mechanics used in the **Mastering Prepositions** web application.

---

## 1. Design Philosophy

The website features a **sleek dark mode** with **neon accents** and **glassmorphism** visual patterns. The goal is to provide a visually striking, interactive, and uncluttered learning interface for Hungarian speakers mastering English language. The website follows "Mobile-First" design principles.

---

## 2. Typography

The system utilizes two Google Fonts for distinct hierarchy and legibility:

- **Headings Font**: `'Outfit', sans-serif`
  - High-geometry font suited for bold headers and highlights.
  - Used for Section Titles, Hero Title, and Preposition labels.
- **Body Font**: `'Inter', sans-serif`
  - High legibility, neutral-sans font.
  - Used for descriptions, Hungarian translation texts, examples, and sentences.
- **Fluid Sizing**: Utilizes CSS `clamp()` to dynamically scale typography across desktop and mobile screens without breaking layouts:
  - Hero Header: `clamp(3rem, 5vw + 1rem, 5rem)`
  - Section Headers: `clamp(2rem, 3vw, 3rem)`
  - Subtitles: `clamp(1.2rem, 2vw, 1.5rem)`

---

## 3. Color Palette (OKLCH System)

Colors are defined using the modern **OKLCH** color space to achieve uniform perceived brightness and vibrant saturation.

| Color Variable       | Value                       | Description              | Visual Output              |
| :------------------- | :-------------------------- | :----------------------- | :------------------------- |
| `--color-bg-base`    | `oklch(0.15 0.01 260)`      | Deep charcoal blue/slate | Main Background            |
| `--color-bg-surface` | `oklch(0.2 0.02 260 / 0.5)` | Semitransparent slate    | Glassmorphism Card Surface |
| `--color-text-main`  | `oklch(0.95 0.01 260)`      | Near-white               | Primary Text               |
| `--color-text-muted` | `oklch(0.7 0.02 260)`       | Muted gray-blue          | Subtitles & Descriptions   |
| `--color-accent-in`  | `oklch(0.75 0.15 250)`      | Vibrant Neon Blue        | `IN` Preposition Accent    |
| `--color-accent-on`  | `oklch(0.75 0.18 310)`      | Electric Neon Purple     | `ON` Preposition Accent    |
| `--color-accent-at`  | `oklch(0.8 0.18 150)`       | Bright Neon Green        | `AT` Preposition Accent    |
| `--color-success`    | `oklch(0.75 0.2 150)`       | Warm Green               | Correct Answers / Success  |
| `--color-error`      | `oklch(0.65 0.2 25)`        | Coral Red                | Incorrect Mistakes         |

---

## 4. UI Components

### 4.1. Visual Triangle (Pyramid)

An interactive stack representing the nesting of prepositions from general/broad (`IN`) to specific (`AT`).

- **Layers**:
  - `IN` (Top - 100% width): Broad scope (Time: Centuries/Months; Space: Zoned areas/Countries).
  - `ON` (Middle - 75% width): Medium scope (Time: Days/Dates; Space: Surfaces/Vehicles).
  - `AT` (Bottom - 50% width): Specific scope (Time: Hours; Space: Precise points/Locations).
- **Interactions**:
  - Hovering or focusing on a layer scales the component (`scale(1.02)`) and raises the shadow.
  - Interactive popup tooltips slide out laterally with details and example blocks.

### 4.2. Dependent Prepositions (Flip Cards)

Grid cards highlighting common Hungarian-to-English preposition mistakes.

- **Front Face**: Displays the Hungarian phrase and common literal translation mistake (e.g. `gondolkozom valamin` -> ❌ _I think on..._).
- **Back Face**: Flips on hover/focus to display the correct preposition (e.g. ✅ _think_ **about**) marked in Success Green.
- **Mechanics**: Utilizes CSS 3D Transforms (`rotateY(180deg)`) and `-webkit-backface-visibility: hidden` for smooth hardware-accelerated flipping.

### 4.3. Dynamic vs. Static Comparisons

Visual cards illustrating the difference between movement-based and stationary prepositions.

- **IN vs. INTO**: Movement into a container box.
- **ON vs. ONTO**: Movement jumping onto a surface.
- **AT vs. TO**: Movement walking to a vertical bus stop pole.
- **Mechanics**: Clicking "Mozgás bekapcsolása" (Enable Motion) appends an `.is-animating` class, triggering keyframe animations (`translate`, `scale`, and path transitions) on a glowing orb.

---

## 5. Visual Styles & Glassmorphism

To create a premium look, the design implements translucent layers overlaying subtle background gradients:

- **Translucent Background Gradients**:
  ```css
  background-image:
    radial-gradient(
      circle at 15% 50%,
      oklch(0.25 0.05 260 / 0.4),
      transparent 25%
    ),
    radial-gradient(
      circle at 85% 30%,
      oklch(0.25 0.05 310 / 0.4),
      transparent 25%
    );
  ```
- **Glassmorphism Panels**:
  - `backdrop-filter: blur(12px)`
  - Border: `1px solid oklch(1 0 0 / 0.1)` (highly translucent white border mimicking reflections)
  - Box Shadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37)`

---

## 6. Animations & Micro-interactions

- **Scroll-driven Reveals**:
  Utilizes the CSS scroll timeline API (`@supports (animation-timeline: view())`) to automatically fade-in and slide up cards as they enter the screen, keeping the page alive during scrolling.
- **Hover Micro-Transitions**:
  All buttons, flip cards, and interactive layers transition properties (transform, shadow, color) over a uniform `0.3s ease` duration (`var(--transition-base)`).
- **Accessibility Safeguard**:
  Includes a `prefers-reduced-motion` media query to disable transitions and scrolling timelines instantly for visitors with vestibular sensitivities.

---

## 7. Responsive Strategy

The layout is designed mobile-first and adjusts at the `768px` tablet breakpoint:

- The horizontal lateral tooltips in the Visual Triangle collapse into vertically stacked details.
- The state containers in the Dynamic comparisons change from a side-by-side grid (`grid-template-columns: 1fr 1fr`) to a single column stack.
- The Visual Triangle layers adjust to uniform width on mobile screens for natural touch targets.
