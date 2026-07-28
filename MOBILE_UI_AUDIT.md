# Mobile UI/UX Audit

Status: First approved fix batch completed  
Started: 2026-07-27

## Scope

The first pass covers the public pages, dashboard shell, onboarding flow, FTUE
lesson, practice, characters, leaderboard, gateway, contact/legal pages, and the
404 page.

Tested viewports:

- 320 × 568 — narrow portrait
- 360 × 800 — common Android portrait
- 390 × 844 — modern phone portrait
- 844 × 236 — constrained mobile landscape matching the reported failure mode

The audit includes horizontal overflow, clipped text, fixed/off-canvas panels,
touch-target sizing, full-height layouts, and the lesson answer/feedback flow.

## Implemented findings

### Resolved — Lesson feedback loses long explanations

Affected area: FTUE and standard lesson player

The reported feedback/button overlap does not reproduce in the current build at
390 × 844 or 844 × 236. The current responsive rules correctly reserve separate
flex space for the feedback and the `Tovább` button.

However, mobile feedback descriptions use `white-space: nowrap`,
`overflow: hidden`, and `text-overflow: ellipsis`. A longer message such as
`A helyes válasz: Coffee with sugar ...` is therefore intentionally hidden.
This is fragile and can make correction feedback incomplete even when it no
longer renders underneath the button.

Implemented:

- Keep the button in a fixed-width column.
- Allow the explanation to wrap to two lines.
- Let the feedback footer grow slightly when needed.
- On extremely short landscape screens, cap the feedback text at two lines
  rather than a single-line ellipsis.

Verified at 390 × 844 and 844 × 236. The controls remain separate, and short
landscape now leaves approximately 107 px for exercise content instead of
approximately 92 px.

### Resolved — Leaderboard search row exceeds a 320 px viewport

Affected route: `/leaderboard`

At 320 px wide, the search button reaches from approximately x=299 to x=395.
The right-hand portion is outside the viewport. The document itself suppresses
horizontal scrolling, so the clipped part cannot be reached.

Implemented:

- Stack the search button below the field at the narrow-phone breakpoint.
- Use `minmax(0, 1fr)` so the field can shrink safely.

Verified at 320 px: the form ends at x=292 and the button at x=283.

### Resolved — Primary mobile controls below the 44 × 44 px target

Affected areas:

- Public header menu button: approximately 30 × 21 px
- Dashboard mobile menu button: approximately 40 × 40 px
- Lesson close button: approximately 32 × 32 px
- Lesson report button: approximately 19 × 27 px
- Contact form submit button: approximately 108 × 40 px
- Several legal/footer links have a text-height-only hit area
- Onboarding secondary login/back actions have approximately 22 px height

Implemented 44 × 44 px minimum targets for the public menu, dashboard menu,
lesson close/report controls, onboarding secondary actions, and contact submit
button. The icons remain visually compact.

### Resolved — Narrow dashboard roadmap artwork clipped at both edges

Affected route: `/dashboard`

At 320–360 px, alternating roadmap node containers extend about 9–15 px beyond
the viewport. Horizontal scrolling is suppressed, so the artwork is visibly
cropped. The primary node controls remain usable, but the composition is not
fully contained.

Implemented:

- Reduce the narrow-mobile node-container width while retaining the lateral
  offset.
- Preserve the alternating path without allowing any node container to leave
  the content box.

Verified at 320 px: the first sampled alternating nodes remain between x=13
and x=301.

### Improved — Very short landscape leaves little usable lesson content height

Affected route: `/lesson/ftue` and standard lesson screens

At 844 × 236, the header consumes about 48 px and feedback footer about 64 px,
leaving roughly 92 px for the exercise. The exercise area is internally
scrollable, so it remains functional, but the choices can be almost completely
out of view when feedback is not shown.

Implemented:

- Add a short-landscape composition that reduces nonessential header spacing
  and uses more compact exercise cards.
- Keep internal scrolling as the fallback.

Verified at 844 × 236: header approximately 45 px, footer approximately 52 px,
and exercise viewport approximately 107 px. All critical controls retain a
44 px touch target.

### Resolved — Minor text-box clipping risk on the landing hero heading

Affected route: `/`

At 320 and 360 px, the hero heading's rendered content is about 5 px taller than
its content box. It is not obviously cut off in every rasterization, but it is a
font/line-height risk.

Implemented a larger narrow-mobile line-height so glyphs have more vertical
breathing room without changing the heading scale.

## Verified behavior

- No document-level horizontal scrolling was found on the tested routes.
- The current lesson feedback and `Tovább` button do not overlap at 390 × 844.
- The current lesson feedback and `Tovább` button do not overlap at 844 × 236.
- The onboarding routes remain scrollable when their content exceeds a
  320 × 568 viewport.
- Off-canvas dashboard sidebars do not increase the document scroll width.
- The public, contact, legal, gateway, and 404 layouts remain contained within
  the tested portrait widths.
- Production build passes after the fixes.
- Lint completes with the repository's pre-existing warnings and no new error.

## Remaining coverage

- Authenticated-only states for Profile and Friends
- Authentication, beta-request, shop, settings, upload, grammar, feedback,
  refill, and report-problem modals
- Every lesson exercise type and its correct, incorrect, skipped, loading, and
  completion states
- Soft-keyboard behavior for forms
- Safe-area verification on a physical/notched-device browser
- 200% text zoom and screen-reader focus order
