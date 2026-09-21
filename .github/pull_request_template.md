## FL-XX · <title>

<!-- What this changes, in a sentence or two. The what is visible in the diff;
     say the why, and anything you decided against. -->

### Why this way

<!-- The decision worth recording, if there is one. For example: why the state
     lives where it does, why a rule is data rather than a branch, why a library
     was or was not used. Delete the section if the change has no such decision. -->

### Checks

- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] `npx eslint .` is clean
- [ ] `npm run build` passes

### Where relevant

- [ ] Tests cover the failure path, not only the happy path
- [ ] Domain logic stays free of Vue imports
- [ ] New per-type behaviour is a registry entry, not a new branch in a component
- [ ] Checked in the browser, not only in tests
- [ ] Works in light and dark, including anything the platform draws (native
      dropdowns, the date picker, the canvas)
- [ ] Keyboard reachable, with a visible focus state
- [ ] Every new control has an accessible name and a tooltip that says something
      its label does not
- [ ] Documentation updated: README, `plan.md`, or `task-chunks.md`

### Screenshots

<!-- For any visible change, both themes. A screenshot catches what a passing
     test cannot: whether the thing actually reads well. -->

### Notes for review

<!-- Anything you are unsure about, deliberately left out, or want a second
     opinion on. Say what you did not do and why, so it reads as a decision
     rather than an omission. -->
