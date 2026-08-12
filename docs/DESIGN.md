---
version: alpha
name: Terremoto Colombia
description: The Mallanet visual system for the citizen emergency platform. The network brand is Mallanet.org. The product is Terremoto Colombia (terremotocolombia.co).
colors:
  primary: "#0f2154"
  secondary: "#4080f2"
  tertiary: "#CE1126"
  neutral: "#EEF2F7"
  canvas: "#EEF2F7"
  surface: "#FFFFFF"
  surface-muted: "#F7F8F9"
  surface-raised: "#FFFFFF"
  border: "#DCE3EC"
  border-strong: "#CBD5E1"
  text: "#0f2154"
  text-muted: "#52606D"
  text-soft: "#94A3B8"
  on-dark: "#e1eaff"
  brand-navy: "#0f2154"
  brand-blue: "#4080f2"
  action-blue: "#4080f2"
  mallanet-blue: "#4080f2"
  mallanet-ink: "#0f2154"
  mallanet-mist: "#e1eaff"
  crisis-red: "#CE1126"
  crisis-red-hover: "#A30D1E"
  rescue-red: "#DC2626"
  supplies-yellow: "#EAB308"
  shelter-green: "#16A34A"
  no-power-blue: "#0EA5E9"
  missing-purple: "#9333EA"
  building-brown: "#78350F"
  volunteer-green: "#047857"
  warning: "#FBB658"
  warning-surface: "#F8F0E0"
  success: "#10B981"
  success-surface: "#E3F5F0"
  info-surface: "#E6F3FF"
  context-accent-1: "#FCD116"
  context-accent-2: "#003893"
  context-accent-3: "#CE1126"
  dark-canvas: "#0f2154"
  dark-surface: "#132236"
typography:
  display-lg:
    fontFamily: Sora
    fontSize: "48px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline-lg:
    fontFamily: Sora
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  headline-md:
    fontFamily: Sora
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title-md:
    fontFamily: Sora
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0em"
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0em"
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0em"
  label-md:
    fontFamily: IBM Plex Sans
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0em"
  label-caps:
    fontFamily: IBM Plex Sans
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.12em"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  pill: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "24px"
  6: "32px"
  7: "48px"
  8: "64px"
components:
  nav-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label-md}"
    height: "62px"
  hero-surface:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-dark}"
    typography: "{typography.display-lg}"
    rounded: "{rounded.xs}"
  access-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "20px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "24px"
  primary-button:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-dark}"
    typography: "{typography.label-md}"
    rounded: "{rounded.pill}"
    padding: "14px"
  primary-button-hover:
    backgroundColor: "{colors.crisis-red-hover}"
    textColor: "{colors.on-dark}"
    typography: "{typography.label-md}"
    rounded: "{rounded.pill}"
    padding: "14px"
  secondary-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label-md}"
    rounded: "{rounded.pill}"
    padding: "12px"
  volunteer-button:
    backgroundColor: "{colors.volunteer-green}"
    textColor: "{colors.on-dark}"
    typography: "{typography.label-md}"
    rounded: "{rounded.pill}"
    padding: "14px"
  global-help-button:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-dark}"
    typography: "{typography.label-md}"
    rounded: "{rounded.pill}"
    padding: "14px"
  input:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "12px"
  map-chip-active:
    backgroundColor: "{colors.text}"
    textColor: "{colors.on-dark}"
    typography: "{typography.label-md}"
    rounded: "{rounded.pill}"
    padding: "8px"
---

# DESIGN.md - Disaster Response Template

This file follows the
[DESIGN.md](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md)
format. This format lets humans and agents share one visual source of truth.
This file also consolidates the system that already lives in
`app/globals.css`.

The tokens in this file are **brand-neutral by design**. Each token describes
a role, such as `crisis-red`, `shelter-green`, or `supplies-yellow`, not a
brand name. The deployment name, its logo, and its real identity live in
`config/deployment.config.json`. If your setup uses the `disaster-brand`
skill, or another rebranding tool, that skill rewrites these tokens with your
organization's colors and name. Do not edit this file by hand for that
purpose.

**Stylex (site shell):** The landing page and layout styles live in
`frontend/styles/shell-layout.css`. This file uses `e-*` classes. These
classes come from the YAML tokens in this file. StyleX is on hold. The
project will reintroduce it in a later phase.

## Overview

The interface must feel like a crisis coordination center: calm, clear,
mobile-first, and focused on fast decisions. The visual voice combines
editorial gravity with the utility of an operations dashboard. No screen
should look like a promotional piece or a social app. Every screen must help
the user report, verify, locate, share, or find help with the least effort.

Follow these color rules for the interface:

- Use blue/navy and neutral grays for the interface itself.
- Use red only for urgency and primary actions.
- Use green for available help.
- Use yellow for supplies or warnings.

The three `context-accent-*` tokens are an optional accent, for example a top
stripe. They mark the context of a specific deployment, such as a region, a
flag, or a local partner. These tokens carry no fixed meaning in the
template. Each deployment decides whether to use them, and which colors to
assign.

## Colors

The palette prioritizes contrast, outdoor readability, and emergency states.
The YAML tokens hold the normative values.

- **Operating base:** `canvas`, `surface`, `border`, `text`, and `text-muted`
  form the main interface. These tokens must dominate dense screens, such as
  the map, lists, forms, and directories.
- **Brand and trust:** Use `brand-navy`, `brand-blue`, and `action-blue` in
  the hero section, important links, informational layers, and
  non-destructive actions.
- **Urgency:** Use `crisis-red` for reporting, for donations in a critical
  context, for visible focus, for high-risk badges, and for emergency calls.
  Do not use it to decorate neutral blocks.
- **Map layers:** `rescue-red`, `supplies-yellow`, `shelter-green`,
  `no-power-blue`, `missing-purple`, and `building-brown` identify report
  types. Keep these colors stable. This helps users recognize map layers
  fast.
- **Deployment context:** `context-accent-1`, `context-accent-2`, and
  `context-accent-3` stay free for a top band or other local-identity
  accents, if the deployment wants to use them.

In dark mode, keep the same hierarchy. Use `dark-canvas` as the background
and `dark-surface` as the panel. Use light text. Keep reds and greens
saturated enough to keep their meaning.

## Typography

The typography uses **Sora 600/700** for titles, brand elements, and
high-impact numbers. It uses **IBM Plex Sans 400/500/600/700** for body text,
controls, forms, and metadata. Sora sets this project apart, typographically,
from Terremoto Venezuela. IBM Plex keeps dense dashboards readable. The
monospace font is **IBM Plex Mono**.

- **Headlines:** `display-lg`, `headline-lg`, and `headline-md` must be
  short, direct, and readable over complex backgrounds. Avoid long phrases in
  the hero section.
- **Operating text:** `body-md` is the default for explanations and forms.
  `body-sm` covers lists, contextual help, and descriptions.
- **Controls and data:** Use `label-md` for buttons, chips, and tabs. Use
  `label-caps` sparingly, for metadata or categories. Never use `label-caps`
  for paragraphs.
- **Numbers and counters:** Keep `tabular-nums` for counts, times, or
  statistics that change live.

## Layout

The layout is mobile-first, with a maximum width of **1120px** for editorial
and administrative content. The map works as a primary surface, not as an
illustration. On desktop, the map must combine with a sidebar. On mobile, the
layout must prioritize fixed actions and horizontal filters, without covering
important data.

The spatial rhythm builds on **8px** increments. Use 4px only for optical
adjustments. Follow these spacing rules:

- Use `spacing.2` and `spacing.3` for chips and dense controls.
- Use `spacing.5` and `spacing.6` for cards.
- Use `spacing.7` and `spacing.8` to separate public sections.

Sections must alternate light surfaces (`canvas`, `surface`,
`surface-muted`) to improve scanning. Avoid nested floating blocks. If a card
already exists, its children must be content or controls, not another full
card.

## Elevation and Depth

Depth communicates hierarchy, not decoration. Prefer 1px borders and short,
soft shadows. Reserve larger shadows for map panels, floating bars, and
modals. A hover state can lift a card by 2px when the action is safe. A hover
state must not move elements in critical report flows.

Map overlays must use blur or translucency only when it does not reduce
readability. In a "tap the map to place the report" state, darken the map.
Show a clear instruction. Always keep an exit visible.

Exception: the **top nav bar** is a translucent floating pill. It uses
`color-mix` of `--esurf` at 80%, plus
`backdrop-filter: blur(20px) saturate(160%)`. This is the frosted pattern.
It matches `.e-nav__mobile-bar`. Three reasons justify this exception:

1. The content that scrolls behind the nav bar belongs to the page itself,
   not to critical data.
2. The header keeps its internal contrast, because it keeps 80% opacity.
3. Browsers with no `backdrop-filter` support fall back to an opaque
   surface, through `@supports`.

Map overlays follow the general rule above, not this exception.

## Shapes

Corner radii express function:

- Use `rounded.sm` and `rounded.md` for fields, badges, small chips, and
  table controls.
- Use `rounded.lg` and `rounded.xl` for public cards, filters, panels, and
  help blocks.
- Use `rounded.pill` for primary buttons, active chips, floating actions,
  and mobile navigation.

The brand icon uses a compact red rectangle with the alert symbol. Keep it
simple. Do not add extra effects or photographic backgrounds.

## Components

- **Nav bar:** Sticky at the top, with a white surface, a discreet bottom
  border, and actions of at least 44px. It must show the deployment name,
  from `config/deployment.config.json`. It must keep psychological help,
  donation, language, and theme actions on one line, with no wrapping. At
  narrow widths, these actions can scroll horizontally.
- **Hero:** Navy background, with a real context image at low opacity. The
  text is always white, with a light shadow. The four access options form
  the first flow. They are not decoration.
- **Access card:** A white card with a large emoji, a short title, and a
  human description. It must support two columns on mobile and four columns
  on desktop.
- **Primary button:** Red, with white text and a pill radius. Reserve it for
  reporting, donating, or actions that move the user toward urgent help.
- **Map shell:** A map plus a sidebar, with a 1.5px border, a `rounded.lg`
  radius, horizontal filters, and a floating report action. The layers use
  the stable colors from `REPORT_TYPES`.
- **Forms:** Fields on `surface-muted`, with a visible border, a red focus
  state, and actionable messages. Do not hide a save failure. Do not show
  success when an error occurred.
- **Help cards:** White cards with a `rounded.xl` radius, an icon in a soft
  pill, short text, and a full-width action.
- **Mobile sticky nav:** Fixed at the bottom. It respects safe areas and
  keeps primary actions within thumb reach.
- **Footer:** Navy surface, with light typography and legal and partner
  links at sufficient contrast. It keeps the deployment name visible on
  every public route.
- **Tabs:** Implement `tablist`/`tab` roles, with only one tab in the focus
  order. Support arrow-key, Home, and End navigation. On mobile, tabs can
  scroll horizontally without cutting off labels.

## Do's and Don'ts

- **Do:** Prioritize clarity, contrast, useful empty states, and clear
  Venezuelan Spanish text.
- **Do:** Use synthetic or anonymized data in examples, fixtures, and design
  screenshots.
- **Do:** Keep the layer colors and report enums stable. Users learn this
  visual language during the emergency.
- **Don't:** Publish phone numbers, emails, private addresses, sensitive
  coordinates, private photos, or real hashes in design pieces or docs.
- **Don't:** Use red to decorate, or for secondary actions. Reduce its
  strength when no real urgency exists.
- **Don't:** Change layer icons or colors without a clear, communicated
  visual migration.
- **Don't:** Turn partner badges or verification marks into promises of
  structural safety, government endorsement, or official confirmation.
