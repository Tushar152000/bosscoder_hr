# Org tree — current design (redesign brief)

The **Org tree** page of the Bosscoder Academy HR portal shows who reports to whom across the company. This document describes the page **as it is built today**: layout, components, interactions and the exact colour codes. It is input for a redesign that **keeps the current colour palette**.

- **URL:** `/directory/tree` (opened from Directory → "Org tree" button)
- **Who uses it:** every employee (read-only); HR uses it to spot people with no manager
- **Stack:** Next.js + Tailwind CSS; chart rendered with React Flow (`@xyflow/react`) and laid out top-to-bottom with `dagre`; icons are Lucide; font is Inter

## Screenshots

Taken from the current build with **made-up sample data** (no real employees).

| View | File |
|---|---|
| Desktop, chart view, one person selected | `org-tree-chart-current.png` |
| Desktop, list view | `org-tree-list-current.png` |
| Mobile (390 px), chart view | `org-tree-mobile-current.png` |

## Real data the design must handle

| Fact | Value |
|---|---|
| Active employees | 117 |
| Managers (people with ≥1 direct report) | 17 |
| Largest team (direct reports of one manager) | 14 |
| People with no manager set | 12 |
| Department names | 18 (largest: Sales 33, Operations 18, Design 11, Marketing 10, Product 9, Technology 7; several have 1–2 people; 10 people have no department) |
| Longest name / job title | 20 / 37 characters |

The tree is **wide and shallow** (max depth ≈ 3–4), with some very wide rows (14 siblings).

## Page layout

Page background `#FAFAF7`, side padding 24 px (40 px from `md`), top padding 24 px. The global top navbar (white, 70 px tall) sits above.

```
Breadcrumb   ⌂ Home › Directory › Org tree
Header       Org tree                                   [Search people… ⌘K] [Chart|List] [Export]
             19 people · 7 managers · 6 departments · max depth 3

Body (lg+: two columns  [ 1fr | 280px ], 12 px gap; below lg: one column)
┌──────────────────────────────────────────────┐ ┌──────────────────────┐
│ CHART (or LIST) card                          │ │ SELECTED panel        │
│  zoom controls (top-right)                    │ ├──────────────────────┤
│  dagre tree, dotted background                │ │ FILTER BY DEPARTMENT  │
│  orphan warning banner (bottom-centre)        │ ├──────────────────────┤
└──────────────────────────────────────────────┘ │ LEGEND                │
                                                 └──────────────────────┘
```

## Components

### Breadcrumb (shared across the whole app — do not restyle)
`⌂ Home › Directory › Org tree` — 14 px (16 px from `md`), medium weight, links `#94A3B8` (hover `#475569`), current page `#0F172A`, chevron separators 11 px.

### Header
- Title "Org tree": 20 px, medium, `#0F172A`.
- Subtitle stats: 12 px, `#64748B` — "N people · N managers · N departments · max depth N".
- Toolbar (right-aligned, wraps under the title on small screens):
  - **Search** — 200 px wide, white, 1 px `#E2E8F0` border, 6 px radius, search icon, 11 px text, `⌘K` hint chip (`#F8FAFC` bg). Typing shows a dropdown of up to 8 matches (avatar + name + title); picking one selects that person and pans the chart to them.
  - **View toggle** — segmented control "Chart / List"; active segment `#EBF3FE` bg, `#0C447C` text; inactive `#64748B`.
  - **Export** — outline button with dropdown: "Export as CSV" (works), "Export as PNG" (disabled, "Soon" tag).

### Chart card
- White card, 1 px `#E2E8F0` border, 12 px radius, shadow `0 1px 3px rgba(0,0,0,0.06)`.
- Height: 480 px, 600 px from `md`, 680 px from `lg`.
- Background: dot grid, 20 px gap, dots `#DBE3EC`.
- Pan by scrolling, zoom with ctrl/pinch (0.3×–1.5×); dragging the canvas does **not** pan; nodes can't be dragged. Opens fitted to the whole tree.
- **Zoom controls** (top-right): white pill with 3 icon buttons — zoom in, zoom out, fit view.
- **Edges:** "smoothstep" right-angle connectors, 1 px `#DBE3EC`.
- **Layout:** top-to-bottom, 80 px between levels, 28 px between siblings.

**Node card** (200 × 68 px):
- White, 1 px `#E2E8F0` border, 6 px radius, padding 10 × 12 px.
- 32 px circular avatar with initials (white, 11 px) on the person's avatar colour.
- Name: 12 px medium `#0F172A`, truncated at ~116 px.
- Second line, 10 px `#64748B`: managers show "Title · N reports"; others show "Title · Department".
- Founder (top of tree with reports) gets a small "Founder" pill: 8 px, `#854F0B` on `#FAEEDA`.
- Selected: border `#0C447C`, shadow `0 2px 8px rgba(12,68,124,0.12)`.
- Filtered out by department: 35% opacity.

**Orphan banner** (bottom-centre of the chart): "N employees have no manager set — fix in Directory", links to the Directory filtered to them. `#854F0B` text on `#FAEEDA`, dashed `#FAC775` border, alert icon.

### List view (replaces the chart)
- Same white card, 12 px padding.
- Indented tree: each level indented 28 px with thin `#E2E8F0`-ish connector lines (vertical + elbow).
- Row: 28 px avatar, name 12 px medium, "Title · Department" 10 px `#64748B`, chevron to expand/collapse on the right (first two levels open by default).
- Row hover `#F8FAFC`; selected row `#EBF3FE` bg with name in `#0C447C`.
- "UNASSIGNED" section at the bottom (10 px, tracked caps, `#94A3B8`) lists people with no manager.

### Right sidebar (280 px, sticky on desktop)
Three white cards (12 px radius, `#E2E8F0` border, same shadow), each with a 10 px tracked-caps label in `#94A3B8`.

1. **SELECTED**
   - Empty: pointer icon + "Click any node to see details".
   - With a person: 40 px avatar, name 13 px medium, title 10 px; then rows (label `#64748B` left, value `#0F172A` right, 10 px): Department, Direct reports, Total downstream, Reports to (clickable manager chip in `#0C447C` — re-centres the chart on the manager), Joined.
   - Actions: primary "View profile" button (`#0C447C` bg, hover `#0A3A6A`, white text, 32 px tall) + square "centre on chart" icon button.
2. **FILTER BY DEPARTMENT** — one row per department, sorted by size: checkbox (checked = `#0C447C` fill), 8 px colour swatch, name, count (`#94A3B8`). Unchecking dims those people in the chart/list. Filters, view and selection are kept in the URL (`?view=list&focus=<id>&dept=Sales,Product`).
3. **LEGEND** — Founder pill = "Top of tree"; people icon (`#0C447C`) = "Has direct reports"; person icon (`#94A3B8`) = "Individual contributor".

## Colour codes (keep these)

### Brand and neutrals

| Token | Hex | Used for |
|---|---|---|
| Brand / primary | `#0C447C` | primary buttons, selected node border, active checkbox, links, active toggle text |
| Brand hover | `#0A3A6A` | primary button hover |
| Brand tint | `#EBF3FE` | active toggle, selected list row |
| Dark blue (headings elsewhere) | `#202658` | large page greetings in other screens |
| Page background | `#FAFAF7` | page |
| Card / surface | `#FFFFFF` | cards, nodes |
| Subtle surface | `#F8FAFC` | hover rows, chips, kbd hint |
| Border | `#E2E8F0` | cards, nodes, inputs |
| Connector / grid | `#DBE3EC` | edges, background dots |
| Text strong | `#0F172A` (slate-900) | names, values, title |
| Text muted | `#64748B` (slate-500) | subtitles, labels |
| Text faint | `#94A3B8` (slate-400) | section labels, counts, placeholders |

### Warning / "Founder"

| Hex | Used for |
|---|---|
| `#FAEEDA` | Founder pill bg, orphan banner bg |
| `#854F0B` | Founder pill text, orphan banner text |
| `#FAC775` | orphan banner dashed border |

### Avatar colours (assigned per person from their name)
`#0C447C`, `#1D9E75`, `#534AB7`, `#993556`, `#D85A30`, `#BA7517`, `#378ADD` — always with white initials.

### Department colours (swatches in the filter)

| Department key | Hex |
|---|---|
| engineering / tech | `#3B82F6` |
| growth | `#10B981` |
| sales | `#8B5CF6` |
| operations / ops | `#F97316` |
| hr | `#EC4899` |
| marketing | `#F59E0B` |
| product | `#06B6D4` |
| design | `#F43F5E` |
| anything else | `#94A3B8` (grey) |

### Type scale on this page
Inter. Title 20 px medium · body 12–13 px · secondary 10–11 px · micro labels 8–10 px (tracked caps for section labels).

## Known problems to solve in the redesign

1. **Nodes are unreadable at the default zoom.** With 100+ people the chart fits the whole tree, so 200 px nodes with 10–12 px text shrink to illegibility; you must zoom in to read anything.
2. **Wide teams make the tree very wide.** A manager with 14 direct reports produces one long row; there's no grouping or wrapping.
3. **Collapse/expand is built but switched off.** Nodes have a "N reports ▾" toggle in code, but it is hard-disabled, so large subtrees can't be folded.
4. **Department colours mostly don't match real names.** The map uses keys like `tech` and `hr`, but real departments are "Technology", "HR & Finance", "Corporate Relations", "Website Tech", etc., so most show the grey fallback. Department colour is also only a tiny swatch in the filter — it isn't shown on the nodes.
5. **Founder detection is structural.** Anyone with reports and no manager is labelled "Founder"; with 12 people missing a manager, the top row can be cluttered and misleading.
6. **Mobile is cramped.** On a phone the toolbar wraps onto two rows, the chart is a small clipped window you can't drag to pan, and the sidebar falls below the chart.
7. **Small polish issues:** the `⌘K` hint isn't wired to a shortcut; the orphan banner says "1 employee have"; "Export as PNG" is a dead "Soon" item; the selected panel sits far from the node you clicked.

## Constraints for the redesign

- **Keep the colour palette above.** New tints/shades derived from these are fine; new hues are not.
- **Data available per person:** name, initials, avatar colour, designation, department, manager, direct-report count, total downstream count, joined date, email, role (Founder / Manager / Employee). No photos on this page today (profile photos exist elsewhere and could be used).
- **Must keep:** chart and list views, search-to-locate, department filter, selection details with "View profile", export, and the no-manager warning for HR.
- **Must work** for 117+ people on desktop and be usable on a 390 px phone.
- **The breadcrumb and top navbar are shared app-wide** — design around them, don't restyle them.
