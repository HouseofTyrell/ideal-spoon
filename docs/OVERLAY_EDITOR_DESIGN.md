# Overlay Editor Design Document

## Overview

This document outlines the design for a visual overlay editor in Kometa Preview Studio that allows users to create, customize, and preview Kometa overlays without manually writing YAML.

---

## User Interaction Philosophy

### Design Principles

1. **Visual First** - Users should see changes in real-time as they adjust settings
2. **Progressive Disclosure** - Show simple options first, advanced options on demand
3. **Sensible Defaults** - Pre-fill with reasonable values so users can start quickly
4. **No YAML Knowledge Required** - Generate YAML behind the scenes
5. **Escape Hatch** - Allow advanced users to edit raw YAML when needed

---

## Feature Priority Matrix

### Tier 1: Essential (MVP)
| Feature | Why Essential |
|---------|---------------|
| Positioning (offset/align) | Core to placing any overlay |
| Built-in overlays (pmm: resolution, ratings) | Most common use case |
| Live preview | Core value proposition |
| Basic backdrop styling (color, size) | Very common customization |

### Tier 2: Important (Phase 2)
| Feature | Why Important |
|---------|---------------|
| Text overlays | Second most common overlay type |
| Font selection/sizing | Required for text overlays |
| Queue configuration | Multiple overlays on same poster |
| Group/weight management | Conflict resolution |

### Tier 3: Advanced (Phase 3)
| Feature | Why Advanced |
|---------|---------------|
| Custom image overlays | Power user feature |
| Special text variables | Requires understanding metadata |
| Suppress overlays | Edge case |
| Blur effects | Niche use case |

### Tier 4: Expert (Phase 4)
| Feature | Why Expert |
|---------|---------------|
| Template creation | Advanced abstraction |
| Addon images with text | Complex composition |
| Raw YAML editing | Escape hatch |

---

## UI Component Design

### 1. Overlay Library Panel (Left Sidebar)

```
┌─────────────────────────────┐
│ OVERLAY LIBRARY             │
├─────────────────────────────┤
│ 📁 Built-in Overlays        │
│   ├── Resolution/Edition    │
│   ├── Audio Codec           │
│   ├── Ratings (IMDb, TMDb)  │
│   ├── Streaming Services    │
│   ├── Network/Studio        │
│   └── Status (Returning...)  │
├─────────────────────────────┤
│ 📁 Custom Overlays          │
│   ├── [User's overlays]     │
│   └── + Create New          │
├─────────────────────────────┤
│ 📁 Text Overlays            │
│   └── + Create Text         │
└─────────────────────────────┘
```

**Interaction:** Drag-and-drop overlays onto the preview canvas, or click to add.

---

### 2. Preview Canvas (Center)

```
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │         POSTER PREVIEW         │    │
│  │                                 │    │
│  │    [4K]          [HDR]         │    │
│  │                                 │    │
│  │                                 │    │
│  │    ⭐ 8.7                       │    │
│  │                                 │    │
│  │    [NETFLIX]                   │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ◀ Matrix │ Dune │ Breaking Bad ▶       │
└─────────────────────────────────────────┘
```

**Interactions:**
- Click overlay on canvas to select and edit
- Drag overlay to reposition
- Visual guides/snapping to edges
- Toggle between preview targets

---

### 3. Properties Panel (Right Sidebar)

```
┌─────────────────────────────┐
│ OVERLAY PROPERTIES          │
├─────────────────────────────┤
│ Resolution Overlay          │
│ ─────────────────────────── │
│                             │
│ POSITION                    │
│ ┌─────────────────────────┐ │
│ │  ◉ TL   ○ TC   ○ TR    │ │
│ │  ○ ML   ○ MC   ○ MR    │ │
│ │  ○ BL   ○ BC   ○ BR    │ │
│ └─────────────────────────┘ │
│                             │
│ Horizontal: [  150  ] px    │
│ Vertical:   [   50  ] px    │
│                             │
│ ─────────────────────────── │
│ BACKDROP                    │
│ Color: [#000000] ■  [99]% α │
│ Width:  [Auto ▼]            │
│ Height: [Auto ▼]            │
│ Radius: [  15  ] px         │
│ Padding:[  10  ] px         │
│                             │
│ ─────────────────────────── │
│ ▶ Advanced Options          │
│   Group: [resolution]       │
│   Weight: [100]             │
│   Queue: [None ▼]           │
└─────────────────────────────┘
```

---

### 4. Active Overlays List (Bottom Panel)

```
┌────────────────────────────────────────────────────────────────┐
│ ACTIVE OVERLAYS                                    [+ Add]     │
├────────────────────────────────────────────────────────────────┤
│ ☑ Resolution   │ Top-Left     │ Group: res    │ Weight: 100   │
│ ☑ Ratings      │ Bottom-Left  │ Group: rating │ Weight: 100   │
│ ☑ Streaming    │ Bottom-Right │ Queue: bottom │ Weight: 50    │
│ ☐ Audio Codec  │ Top-Right    │ Group: audio  │ Weight: 80    │
└────────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Checkbox to enable/disable for preview
- Drag to reorder (affects weight)
- Click row to select and edit properties
- Delete button on hover

---

## Detailed Feature Specifications

### 5. Position Picker Component

**Visual grid selector** for quick alignment:

```
┌───────────────────────┐
│  Click to position:   │
│  ┌───┬───┬───┐        │
│  │ ↖ │ ↑ │ ↗ │        │
│  ├───┼───┼───┤        │
│  │ ← │ ● │ → │        │
│  ├───┼───┼───┤        │
│  │ ↙ │ ↓ │ ↘ │        │
│  └───┴───┴───┘        │
│                       │
│  Fine-tune:           │
│  H: [150] px  ← + →   │
│  V: [ 50] px  ← + →   │
└───────────────────────┘
```

**Mapping:**
| Grid Position | horizontal_align | vertical_align |
|---------------|------------------|----------------|
| Top-Left      | left             | top            |
| Top-Center    | center           | top            |
| Top-Right     | right            | top            |
| Middle-Left   | left             | center         |
| Center        | center           | center         |
| Middle-Right  | right            | center         |
| Bottom-Left   | left             | bottom         |
| Bottom-Center | center           | bottom         |
| Bottom-Right  | right            | bottom         |

---

### 6. Color Picker Component

```
┌─────────────────────────┐
│ Background Color        │
│ ┌───────────────────┐   │
│ │ Color Wheel/Grid  │   │
│ └───────────────────┘   │
│                         │
│ Hex: #[000000]          │
│ Opacity: [━━━━━○━━] 60% │
│                         │
│ Presets:                │
│ [■][■][■][■][■][■][■]   │
│ Black/White/Grays       │
│                         │
│ Recent:                 │
│ [■][■][■]               │
└─────────────────────────┘
```

**Output format:** `#RRGGBBAA` (e.g., `#00000099`)

---

### 7. Built-in Overlay Selector

```
┌─────────────────────────────────────────┐
│ ADD BUILT-IN OVERLAY                    │
├─────────────────────────────────────────┤
│ 🔍 Search overlays...                   │
├─────────────────────────────────────────┤
│ RESOLUTION & QUALITY                    │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │  [4K]   │ │ [1080p] │ │  [HDR]  │    │
│ │Resolution│ │         │ │         │    │
│ └─────────┘ └─────────┘ └─────────┘    │
│                                         │
│ RATINGS                                 │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │  IMDb   │ │  TMDb   │ │   RT    │    │
│ │  ⭐8.5  │ │  ⭐8.2  │ │  🍅83%  │    │
│ └─────────┘ └─────────┘ └─────────┘    │
│                                         │
│ STREAMING                               │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │ Netflix │ │ Disney+ │ │   Max   │    │
│ └─────────┘ └─────────┘ └─────────┘    │
│                                         │
│ AUDIO                                   │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │  Atmos  │ │ DTS-HD  │ │  5.1    │    │
│ └─────────┘ └─────────┘ └─────────┘    │
└─────────────────────────────────────────┘
```

---

### 8. Text Overlay Editor

```
┌─────────────────────────────────────────┐
│ TEXT OVERLAY                            │
├─────────────────────────────────────────┤
│ Text Content:                           │
│ ┌─────────────────────────────────────┐ │
│ │ Direct Play                         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ─── OR USE VARIABLE ───                 │
│ [▼ Select Variable          ]           │
│   • <<imdb_rating>>                     │
│   • <<runtime>>                         │
│   • <<title>>                           │
│   • <<content_rating>>                  │
│                                         │
│ ─────────────────────────────           │
│ FONT                                    │
│ Family: [Inter ▼]                       │
│ Size:   [  48  ] px                     │
│ Color:  [#FFFFFF] ■                     │
│ Style:  [Bold ▼]                        │
│                                         │
│ STROKE (Outline)                        │
│ ☐ Enable stroke                         │
│ Color:  [#000000] ■                     │
│ Width:  [   2  ] px                     │
└─────────────────────────────────────────┘
```

---

### 9. Queue Configuration

```
┌─────────────────────────────────────────┐
│ QUEUE: bottom_overlays                  │
├─────────────────────────────────────────┤
│ Starting Position:                      │
│ ┌───┬───┬───┐                           │
│ │   │   │   │                           │
│ ├───┼───┼───┤                           │
│ │   │   │   │                           │
│ ├───┼───┼───┤                           │
│ │ ● │   │   │  ← Bottom-Left            │
│ └───┴───┴───┘                           │
│                                         │
│ Direction: [→ Horizontal ▼]             │
│ Spacing:   [    15    ] px              │
│ Max Items: [     5    ]                 │
│                                         │
│ ☐ Alternate sides (surround)            │
│                                         │
│ ─────────────────────────────           │
│ ITEMS IN QUEUE:                         │
│ 1. Resolution  [Weight: 100]            │
│ 2. Audio       [Weight: 90]             │
│ 3. Streaming   [Weight: 80]             │
└─────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Basic Positioning (Week 1-2)
**Goal:** Users can add built-in overlays and position them

- [ ] Position picker component (9-grid + offset inputs)
- [ ] Built-in overlay library (resolution, ratings, streaming, audio)
- [ ] Live preview integration
- [ ] Enable/disable overlay toggles
- [ ] Basic YAML generation

### Phase 2: Styling & Backdrop (Week 3-4)
**Goal:** Users can customize appearance

- [ ] Color picker component with opacity
- [ ] Backdrop settings (size, radius, padding)
- [ ] Border/line settings
- [ ] Font selector (from available fonts)
- [ ] Preview updates in real-time

### Phase 3: Text Overlays (Week 5-6)
**Goal:** Users can create custom text overlays

- [ ] Text content input
- [ ] Variable selector with categories
- [ ] Variable modifiers (%, #, W, etc.)
- [ ] Font styling (size, color, stroke)
- [ ] Text positioning

### Phase 4: Groups & Queues (Week 7-8)
**Goal:** Users can manage overlay conflicts and sequences

- [ ] Group assignment UI
- [ ] Weight adjustment (drag to reorder)
- [ ] Queue configuration panel
- [ ] Queue direction and spacing
- [ ] Suppress overlays selector

### Phase 5: Advanced Features (Week 9-10)
**Goal:** Power user features

- [ ] Custom image upload
- [ ] Blur overlay support
- [ ] Template creation/saving
- [ ] Raw YAML editor with syntax highlighting
- [ ] Import/export configurations

---

## Data Model

### OverlayConfig Interface

```typescript
interface OverlayConfig {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  enabled: boolean;              // Active in preview
  type: 'builtin' | 'custom' | 'text';

  // Source (for custom/builtin)
  source?: {
    type: 'pmm' | 'file' | 'url' | 'git';
    path: string;
  };

  // Positioning
  position: {
    horizontalAlign: 'left' | 'center' | 'right';
    verticalAlign: 'top' | 'center' | 'bottom';
    horizontalOffset: number;
    verticalOffset: number;
  };

  // Backdrop styling
  backdrop?: {
    color: string;               // #RRGGBBAA
    width?: number | 'auto';
    height?: number | 'auto';
    radius?: number;
    padding?: number;
    lineColor?: string;
    lineWidth?: number;
  };

  // Text-specific (type === 'text')
  text?: {
    content: string;             // Static text or variable
    font: string;
    fontSize: number;
    fontColor: string;
    fontStyle?: string;
    strokeColor?: string;
    strokeWidth?: number;
  };

  // Grouping
  group?: string;
  weight?: number;
  queue?: string;
  suppressOverlays?: string[];
}
```

---

## YAML Generation Example

**User Configuration:**
```
Overlay: Resolution
Position: Top-Left
Offset: H=50, V=30
Backdrop: #000000 @ 60% opacity
Radius: 15px
```

**Generated YAML:**
```yaml
overlays:
  resolution:
    overlay:
      name: resolution
      horizontal_offset: 50
      horizontal_align: left
      vertical_offset: 30
      vertical_align: top
      back_color: "#00000099"
      back_radius: 15
    pmm: resolution
```

---

## Open Questions

1. **Template Variables:** Should we support Kometa's template system or simplify?
2. **Multi-Library:** How to handle different overlay configs per library?
3. **Persistence:** Save configurations per-profile or globally?
4. **Export Format:** Full Kometa config or just overlay section?

---

## Success Metrics

- Users can create a complete overlay config without writing YAML
- Preview accurately represents final Kometa output
- 80% of overlay customizations achievable through UI
- Raw YAML edit available for remaining 20%
