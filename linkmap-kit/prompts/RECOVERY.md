# Recovery prompts: paste when Bolt drifts

**Tests or lint failing after a phase**

> Run `npm run check`. Fix every failure without disabling rules, skipping tests or editing eslint.config.js,
> src/net/csp.ts or src/format/**. Show the final summary.

**Bolt changed protected files**

> You modified files that AGENTS.md protects (src/format/**, src/net/csp.ts, eslint.config.js, .github/**). Revert
> those changes, then solve the task within the allowed files. Explain why the change seemed necessary.

**Bolt added a dependency or CDN**

> Remove the dependency/CDN you added. AGENTS.md rules 2 and 8 forbid it. Implement it with the existing stack, or
> stop and explain why it is impossible.

**Something breaks only in production (CSP)**

> Run `npm run build && npm run preview`, open the browser console and list every CSP violation. Fix each one at its
> source (import CSS files, use same-origin workers, no inline styles or scripts). Don't change src/net/csp.ts.

**Scope creep**

> Stop. Undo everything not required by the current prompt file. Only prompts/<NN>-….md is in scope.

**Bolt stuck in an error loop (same error 3 times)**

> Stop changing code. Explain the root cause of the error in 5 lines, list 2 options, and wait for my choice.

**Context lost in a long session**

> Re-read AGENTS.md and docs/ARCHITECTURE.md. Summarise the current state of src/ in 10 bullets, list which phases
> (prompts/) are done according to docs/ACCEPTANCE.md, then continue with the current phase.
