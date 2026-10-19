# Button

## Registry contract

- Official registry item: `button`
- Runtime import after installation: `@/components/ui/button`
- Source snapshot: `button.tsx` from shadcn/ui's `new-york-v4` registry.
- Required runtime dependencies from the snapshot: `class-variance-authority`, `radix-ui`, and the project's `cn` utility.

## Allowed variants

| Figma variant | shadcn props | Intended use |
| --- | --- | --- |
| `Primary` | `variant="default"` | One primary action per screen or dialog |
| `Secondary` | `variant="secondary"` | Supporting action |
| `Outline` | `variant="outline"` | Low-emphasis alternative |
| `Destructive` | `variant="destructive"` | Irreversible or risky action |
| `Ghost` | `variant="ghost"` | Contextual, low-emphasis control |
| `Link` | `variant="link"` | Inline navigation only |

Use `xs`, `sm`, `default`, `lg`, or an `icon*` size from the component source. Do not invent additional variants or sizes.

## Product-specific rules

- Primary printer-flow actions use the existing Figma blue-to-purple gradient. Compose it on `Button variant="default"` with the `color.semantic.brand.start` and `color.semantic.brand.end` tokens; do not create another button component.
- Do not use a black primary button.
- Use `disabled` for unavailable actions and preserve the visible focus ring.
- Icon-only buttons need an accessible name and a touch target of at least 44×44 CSS pixels, even if the icon variant is visually smaller.
- Keep the label explicit: for example, `继续`, `连接打印机`, or `重试`; avoid generic labels such as `确定` when the action can be named.
