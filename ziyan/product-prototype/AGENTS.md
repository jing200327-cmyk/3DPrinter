# Prototype collaboration rules

## Sources of truth

- Figma is the source of truth for visual and information architecture.
- The prototype repository is the source of truth for runtime behavior.
- product/decisions.md records intentional human decisions.

## Figma rules

Before editing Figma:
1. Inspect the requested page/frame.
2. Inspect nearby components and variables.
3. Reuse existing components first.
4. Use variables instead of raw values.
5. Use Auto Layout whenever possible.
6. Preserve semantic layer names.

Never:
- recreate an existing design-system component
- change an unrelated frame
- overwrite a node marked LOCKED
- replace human edits merely to make the design more consistent

## Human-AI collaboration

Human edits take precedence over previous AI output.

If a human changed something after AI generation:
- treat the change as intentional unless evidence suggests otherwise
- preserve it
- extend the surrounding solution around it

## Change scope

For every Figma edit:
- inspect first
- state intended scope
- edit only that scope
- validate after editing

## Prototype rules

Do not implement production architecture.

Optimize for:
- speed
- interaction realism
- state coverage
- usability testing

Use mock data by default.