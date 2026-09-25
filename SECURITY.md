# Security notes

Flow has no accounts, no server and no secrets yet. The decisions below are the ones that will
matter once it has them.

## Trust boundaries

| Input          | Where it enters              | Treated as                                                                                                                |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| A document     | `flowApi.ensureLoaded`       | Untrusted: shape is normalised at the adapter, unknown node types fall back to a safe entry rather than rendering nothing |
| Form fields    | The drawer and create dialog | Untrusted: validated before a mutation, capped in length                                                                  |
| Picked files   | `useAttachmentUpload`        | Untrusted: images only, 2 MB, read as a data URL                                                                          |
| `localStorage` | `ensureLoaded`               | Untrusted: parsed in a try, falls back to the starter diagram when it holds anything unexpected                           |

## Cross-site scripting

Nothing in the app uses `v-html`. Every document string, node name, description, comment and message
goes through Vue's text interpolation, which escapes it. Attachment sources are rendered as `<img
src>`; a hostile data URL cannot execute in that position, and an `onerror` fades the tile rather
than leaving a hole.

The one thing to keep watching: if a future requirement asks for formatted message bodies, the
answer is a sanitiser with an allowlist, not `v-html`.

## Network

The app makes no requests of its own. The starter diagram is bundled into the build and every edit
is saved to `localStorage`, so there is no proxy, no CORS surface and nothing to configure. When a
real backend lands (see [BACKLOG.md](BACKLOG.md)), it replaces `src/api/flowApi.js` and this section
returns.

## Headers

`docker/nginx.conf` serves the production build. For a real deployment it should also
carry:

| Header                    | Value                                                                               | Against                              |
| ------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------ |
| `Content-Security-Policy` | `default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'` | Injected scripts                     |
| `X-Content-Type-Options`  | `nosniff`                                                                           | MIME confusion                       |
| `Referrer-Policy`         | `strict-origin-when-cross-origin`                                                   | Leaking URLs, which contain node ids |
| `X-Frame-Options`         | `DENY`                                                                              | Clickjacking                         |

`unsafe-inline` for styles is what Vue's scoped styles and the canvas transforms need; scripts do
not require it.

## Secrets

There are none, and `.env` is gitignored so it stays that way. Note that `VITE_*` variables are inlined into the bundle at build time and are readable by anyone
with the page, so nothing secret may ever be named with that prefix.

## Dependencies

Seven runtime dependencies. `npm audit` is clean at the
time of writing. CI installs with `npm ci`, which fails if `package.json` and the lockfile disagree,
so a dependency cannot change without the lockfile change being in the diff.
