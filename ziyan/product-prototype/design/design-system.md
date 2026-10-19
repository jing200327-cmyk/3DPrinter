# AI Readable Design System Specification

## 1. Design Principles

* Prefer existing components over creating new UI patterns.
* Prefer design tokens over hardcoded values.
* Maintain consistency across product surfaces.
* Every component must define:

  * Purpose
  * Variants
  * States
  * Sizes
  * Token dependencies
  * Accessibility rules

---

# 2. Design Tokens

## Color Tokens

### Background

| Token            | Usage                                    |
| ---------------- | ---------------------------------------- |
| color/bg/default | Main application background              |
| color/bg/subtle  | Secondary surfaces, cards, grouped areas |

### Text

| Token                | Usage                                |
| -------------------- | ------------------------------------ |
| color/text/primary   | Main readable content                |
| color/text/secondary | Supporting information, descriptions |

### Border

| Token                | Usage                     |
| -------------------- | ------------------------- |
| color/border/default | Default component borders |

### Action

| Token                | Usage                       |
| -------------------- | --------------------------- |
| color/action/primary | Primary interactive actions |

---

## Spacing Tokens

Use only predefined spacing values.

```
space/4
space/8
space/12
space/16
space/24
space/32
```

Rules:

* Small internal gaps:

  * space/4
  * space/8

* Component padding:

  * space/12
  * space/16

* Section spacing:

  * space/24
  * space/32

---

## Radius Tokens

```
radius/sm
radius/md
radius/lg
```

Usage:

| Token     | Usage                            |
| --------- | -------------------------------- |
| radius/sm | Small controls, badges           |
| radius/md | Default components               |
| radius/lg | Cards, dialogs, large containers |

---

# 3. Component System

## Button

Purpose:
Primary user actions.

Variants:

```
primary
secondary
ghost
danger
```

Sizes:

```
sm
md
lg
```

States:

```
default
hover
active
disabled
loading
```

Rules:

* Use primary only for the main action.
* Do not create custom button styles.
* Use color/action/primary token.

---

## Input

Purpose:
Text entry.

Variants:

```
default
error
disabled
readonly
```

States:

```
default
focus
filled
error
disabled
```

Dependencies:

```
color/border/default
color/text/primary
radius/md
```

---

## Select

Purpose:
Single option selection.

States:

```
default
open
selected
disabled
error
```

---

## Checkbox

Purpose:
Boolean selection.

States:

```
unchecked
checked
indeterminate
disabled
```

---

## Tabs

Purpose:
Switch between related views.

Variants:

```
line
boxed
```

States:

```
default
active
disabled
```

---

## Table

Purpose:
Display structured data.

Features:

```
sorting
pagination
selection
empty
loading
```

Rules:

* Always provide loading state.
* Always provide empty state.
* Avoid manually styled tables.

---

## Badge

Purpose:
Status indicator.

Variants:

```
default
success
warning
error
info
```

---

## Modal

Purpose:
Blocking dialog.

Properties:

```
title
description
primaryAction
secondaryAction
```

Rules:

* Use for important decisions.
* Avoid using modal for simple notifications.

---

## Drawer

Purpose:
Side panel interaction.

Variants:

```
left
right
```

Use cases:

* Detail view
* Editing forms
* Secondary workflows

---

## Toast

Purpose:
Temporary feedback.

Variants:

```
success
error
warning
info
```

Duration:

```
short
normal
persistent
```

---

## Pagination

Purpose:
Navigate large datasets.

Variants:

```
compact
default
```

---

## EmptyState

Purpose:
No-content scenarios.

Required:

```
icon
title
description
action(optional)
```

---

## Skeleton

Purpose:
Loading placeholders.

Variants:

```
text
avatar
card
table
```

---

# 4. Component Composition Rules

AI MUST:

* Compose pages using existing components.
* Use tokens instead of arbitrary values.
* Reuse patterns before creating new ones.

Example:

Good:

```
Card
 ├── Heading
 ├── Input
 └── Button
```

Bad:

```
Custom Rectangle
Custom Text
Custom Button
```

---

# 5. Figma Mapping

Variables:

```
color/*
space/*
radius/*
```

must map directly to:

```
Figma Variables
        ↓
Code Tokens
        ↓
Component Properties
```

Component names must remain identical:

```
Figma:
Button

Code:
<Button />

AI:
Button component
```

---

# 6. AI Generation Rules

When generating UI:

1. Search existing components first.
2. Select existing variants.
3. Apply existing tokens.
4. Avoid creating new colors.
5. Avoid creating new spacing values.
6. Ask before introducing a new component.

New component creation requires:

```
Name
Purpose
Variants
States
Tokens
Accessibility requirements
```

---

# 7. Future Expansion

Recommended additions:

```
Typography tokens

font/family
font/size/xs
font/size/sm
font/size/md
font/size/lg
font/weight/regular
font/weight/medium
font/weight/bold


Elevation tokens

shadow/sm
shadow/md
shadow/lg


Motion tokens

duration/fast
duration/normal
duration/slow
```
