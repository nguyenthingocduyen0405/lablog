<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Local bug detection and verification

After every code change:

1. Run `npm run lint`.
2. Run `npm run build`.
3. Start or reuse the local Next.js development server.
4. Test every affected user flow in a real browser.
5. Inspect `.next/dev/logs/next-development.log` when it exists.
6. Check desktop and mobile viewports for UI changes.
7. Fix reproducible bugs within the requested scope before completion.
8. Do not claim completion if interactive testing was unavailable.
9. Report exactly which flows were tested.

For UI changes, compilation alone is insufficient. Verify clicks, overlays,
disabled states, navigation, persistence after refresh, and error states.

Whenever a UI bug is fixed, add or update a regression test that reproduces it.
