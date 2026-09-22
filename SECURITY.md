# Security notes

A take-home has no users and no secrets, but the decisions below are the ones that would matter if
it had both.

## Trust boundaries

| Input          | Where it enters              | Treated as                                                                                                                |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| The payload    | `flowApi.ensureLoaded`       | Untrusted: shape is normalised at the adapter, unknown node types fall back to a safe entry rather than rendering nothing |
| Form fields    | The drawer and create dialog | Untrusted: validated before a mutation, capped in length                                                                  |
| Picked files   | `useAttachmentUpload`        | Untrusted: images only, 2 MB, read as a data URL                                                                          |
| `localStorage` | `ensureLoaded`               | Untrusted: parsed in a try, falls back to a refetch when it holds anything unexpected                                     |

## Cross-site scripting

Nothing in the app uses `v-html`. Every payload string, node name, description, comment and message
goes through Vue's text interpolation, which escapes it. Attachment sources are rendered as `<img
src>`; a hostile data URL cannot execute in that position, and an `onerror` fades the tile rather
than leaving a hole.

The one thing to keep watching: if a future requirement asks for formatted message bodies, the
answer is a sanitiser with an allowlist, not `v-html`.

## CORS, and why there is a proxy

The payload bucket sends no `Access-Control-Allow-Origin`, so a browser blocks the response before
the app sees it. The app therefore fetches a same-origin path, `/api/payload`, which the dev server,
`vite preview` and nginx each proxy to the bucket.

Worth being precise about what that does and does not mean:

- CORS is enforced by the **browser**, not by the bucket. curl and any server-side fetch were never
  affected.
- A proxy does not defeat a security control. It moves the request to a trusted server, which is
  what the mechanism is designed to allow.
- The proxy is a read-only passthrough to one fixed path. It does not take a target from the
  request, which is what would turn it into an open proxy.

## Headers

`docker/nginx.conf.template` serves the production build. For a real deployment it should also
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

There are none, and `.env` is gitignored so it stays that way. `.env.example` carries placeholders.
Note that `VITE_*` variables are inlined into the bundle at build time and are readable by anyone
with the page, so nothing secret may ever be named with that prefix.

## Dependencies

Seven runtime dependencies, each named in the brief or allowed by it. `npm audit` is clean at the
time of writing. CI installs with `npm ci`, which fails if `package.json` and the lockfile disagree,
so a dependency cannot change without the lockfile change being in the diff.
