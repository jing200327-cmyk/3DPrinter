# Dialog

## Registry contract

- Official registry item: `dialog`
- Runtime import after installation: `@/components/ui/dialog`
- Source snapshot: `dialog.tsx` from shadcn/ui's `new-york-v4` registry.
- Required runtime dependencies from the snapshot: `radix-ui`, `lucide-react`, the `cn` utility, and the installed `button` item.

## Required composition

```text
Dialog
├── DialogTrigger
└── DialogContent
    ├── DialogHeader
    │   ├── DialogTitle
    │   └── DialogDescription
    └── DialogFooter
        ├── Button variant="outline"  (cancel, when needed)
        └── Button variant="default"  (one primary action)
```

## Constraints

- Use a dialog for a focused confirmation, permission explanation, or password input—not as a replacement for a multi-step route.
- `DialogTitle` is required. Add `DialogDescription` when the title alone does not make the consequence clear.
- Keep one primary action. Pair it with a visible cancel or close route when cancellation is safe.
- Preserve the overlay, focus management, Escape dismissal, and close control unless the product decision explicitly makes the action non-dismissible.
- For mobile, maintain a 16px viewport gutter and do not place essential actions beneath system navigation.
- Use `BlueModal` in Figma as the visual source and map it to `AI/Dialog`; implementation remains the shadcn `Dialog` composition.
