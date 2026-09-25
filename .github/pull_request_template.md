## Proposed changes

> In your own words, write at least one paragraph explaining the why and how of the changes in this PR. An important note: if your PR has changed more than 500 lines, consider splitting it into smaller ones.

## Related ticket

> FL-XX in [BACKLOG.md](../BACKLOG.md).

## Tests

> Paste the run, not a claim that it passed.

```bash
npm test && npm run typecheck && npx eslint . && npm run build
```

```
paste output here
```

## Screenshots / video

> Any visible change, in both themes. A screenshot catches what a green test cannot: whether the thing reads well.

## How to test

> The steps a reviewer follows to see it working. Name the URL, the control, and what should happen.

## Review checklist

- [ ] Logic stayed out of the components: `src/domain` has no Vue imports
- [ ] Tests cover the failure path, including rollback, not only the happy path
- [ ] Opened in a browser, in both themes, including what the platform draws itself
- [ ] Keyboard reachable, with a visible focus state, an accessible name and a useful tooltip

## Left out

> What you chose not to do, and why. Naming it makes it a decision rather than something the reviewer discovers.
