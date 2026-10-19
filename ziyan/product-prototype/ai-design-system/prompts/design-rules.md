# AI design-system rules

Use this directory as the authoritative AI component registry for this prototype repository.

## Non-negotiable rules

1. Reuse a registered component first. Never create a duplicate Button, Modal/Dialog, Card, Input, Toast, Badge, or Progress component.
2. Every UI element must have an entry in `../figma-component-map.json`. If it is absent, stop and request a registry addition; do not approximate it with custom CSS.
3. Use token references from `../tokens/tokens.json` for every color, space, radius, elevation, and motion value. Raw values are allowed only inside the primitive-token definitions.
4. Match the mapped Figma component and variant exactly. Figma remains the visual and IA source of truth.
5. Prefer composition of registry components over a new component. For example, Search is `Input + Button`; Confirmation is `Dialog + Button` actions.
6. Do not use custom CSS as a substitute for a registry component.

## Approved registry

| Category | Figma variants | Code composition |
| --- | --- | --- |
| Button | Primary, Secondary, Outline, Ghost, Loading, Disabled | `Button`; Loading and Disabled are states, not new components |
| Dialog | Default, Alert, Confirmation | `Dialog` or `AlertDialog` plus existing `Button` actions |
| Card | Default, Interactive | `Card`; interactive behavior is composed with an existing action |
| Input | Text, Search, Select | `Input`, `Input + Button`, or `Select` |
| Feedback | Toast, Badge, Progress | `Sonner`, `Badge`, or `Progress` |

## Token entry points

- Colors: `brand.primary`, `brand.secondary`, `success`, `warning`, `error`, `neutral.*`
- Radius: `radius.sm`, `radius.md`, `radius.lg`
- Elevation: `elevation.level1`, `elevation.level2`, `elevation.level3`

## Required workflow

1. Analyze the user flow.
2. Select existing registry components.
3. Match the Figma component variant.
4. Generate the implementation with mapped components and tokens.

For the mobile printer prototype, primary actions retain the existing blue-to-purple treatment through `Button variant="default"` and brand tokens. Preserve safe areas, 44px minimum touch targets, focus visibility, and explicit loading/error/success feedback.
