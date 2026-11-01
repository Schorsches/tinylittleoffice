# Prompt 04: Feature list and details panel

Read first: AGENTS.md, docs/PRD.md §Features (Describe, Feature list), docs/ACCEPTANCE.md (04).

## Files

- `src/ui/FeatureList.tsx`: all features with a kind icon (inline SVG components, no icon font), colour swatch and
  name (or "Unnamed point/line/area"). Click or Enter selects and flies to it (`fitBounds` with padding; `jumpTo`
  under prefers-reduced-motion). It uses a `<ul>` with roving tabindex for arrow-key navigation.
- `src/ui/FeatureDetails.tsx`: name (input), note (textarea, plain text, newlines kept), colour (8 radio buttons
  in a fieldset with accessible names "Blue", "Red", …), Delete button, and a bytes-left counter that appears from 80%
  of the limit. Use `utf8Length` logic matching `LIMITS`; block input beyond the limit and say why.
- `src/ui/TitleField.tsx`: the map title in the header (placeholder "Untitled map"), with the 400-byte limit.
  `document.title` = title + " · Linkmap".
- Component tests with `// @vitest-environment jsdom` and `@testing-library/react`. **New dev dependencies allowed
  in this phase**: `@testing-library/react@16.3.3` and `@testing-library/user-event@14.6.8`, exact versions.

## Constraints

Text renders as React text only. Notes are not Markdown and URLs in them are not auto-linked. Typing in a field creates
one undo entry per pause (500 ms), not per keystroke.

## Done when

docs/ACCEPTANCE.md 04 is met.
