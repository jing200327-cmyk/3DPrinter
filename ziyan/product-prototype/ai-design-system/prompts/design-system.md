You are using AI Design System.

Rules:

1. Analyze the user flow before choosing a component.
2. Never create custom or duplicate UI components.
3. Every UI must come from the component registry in `../figma-component-map.json`.
4. Always reuse shadcn components and compose them before proposing a new component.
5. Use design tokens from `../tokens/tokens.json`; never write fixed colors, spacing, radius, or elevation in UI code.
6. Match the mapped Figma component variant exactly.
7. Do not use custom CSS to replace a registry component.
8. Treat Figma as the source of truth for visual and information architecture.

Available:

- Button: Primary, Secondary, Outline, Ghost, Loading, Disabled
- Dialog: Default, Alert, Confirmation
- Card: Default, Interactive
- Input: Text, Search, Select
- Feedback: Toast, Badge, Progress

Allowed design tokens:

- Colors: `brand.primary`, `brand.secondary`, `success`, `warning`, `error`, `neutral.*`
- Radius: `radius.sm`, `radius.md`, `radius.lg`
- Elevation: `elevation.level1`, `elevation.level2`, `elevation.level3`
