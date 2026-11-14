# Azure Windows deployment diagnosis

## Evidence and scope

Base revision: `d246fdad883be4eeedde87cd6cfbc5449fa2449f` on `main`.

The committed `web.config` begins with byte `0a`, followed by an XML declaration.
Parsing that revision produces `XML or text declaration not at start of entity:
line 2, column 0`. IIS reads this configuration before invoking its handler.
Removing the initial newline produces valid XML. This is a confirmed configuration
defect consistent with HTTP 500.19, and explains why starting Node manually can
succeed while requests through IIS fail. The actual Azure substatus, HRESULT and
deployed file contents have **not** been retrieved; it is not established that
this is the only production problem.

There is a separate confirmed UI defect: `frontend/src/main.tsx` imported only
`Dashboard.tsx`, leaving `App.tsx` and its simulator, scientific search and working
assistant form inaccessible. The full application now occupies `/`, and the
existing dashboard remains available at `/dashboard`, with links in both views.

## Audit conclusions

- The IIS handler and rewrite both target `run.cjs`, present at artifact root.
- `run.cjs` is CommonJS despite the package's `type: module`. Dynamic import of
  `dist/server.js` bridges to the compiled ESM server. No conversion to CommonJS
  or alternative hosting strategy is justified by the observed evidence.
- The upstream IISNode interceptor loads the entry point with `require`; a `.cjs`
  bridge is appropriate. Actual module availability and execution under Azure
  IIS remain unverified.
- The backend preserves `process.env.PORT` as a string. This supports both numeric
  ports and Windows named pipes. Converting it unconditionally with `Number`
  would break IISNode. No such change was made.
- `dist/server.js` resolves `../public`, matching the artifact's `public` folder.
  Express 5's `/{*path}` serves the SPA, while unknown `/api` paths return JSON 404.
- Frontend production requests use the same origin when `VITE_API_URL` is empty.
- Both lockfiles install and both TypeScript builds pass with Node 22.23.5.
  No dependency, lockfile, database, firmware or integration code was changed.
- There are no Azure credentials/identities available to this task. Existing
  GitHub Actions OIDC secret references are retained without exposing values.
  Git read access works; GitHub API requests are denied by the environment proxy.

## Reproducible validation

From a clean checkout with Node 22:

```sh
cd frontend
npm ci
npm run build
cd ../backend
npm ci
npm run build
cd ..
node scripts/prepare-deploy.mjs
```

`deploy` must not already exist: packaging refuses to mix stale and new files.
The production artifact includes the two package files, production dependencies,
`dist`, `public`, `web.config` and `run.cjs`. It excludes sources, credentials and
firmware. The preparation script tests the actual artifact over TCP and over a
pipe/socket. Windows CI additionally parses XML with `XmlDocument.Load` before
packaging, and runs the pipe test as an actual Windows named pipe.

Current Linux validation passed:

- Clean `npm ci` for both projects; backend TypeScript and React/Vite production builds.
- Production-only dependency installation in the isolated deployment artifact.
- `run.cjs` startup, health JSON, real built HTML, JS/CSS content types and contents,
  SPA fallback for `/dashboard` and `/simulacion`, API 400/404 and expected
  unconfigured-Supabase 503, over TCP and Unix socket.
- Chromium loaded the production bundle and WebGL canvas, changed gravity and
  oxygen, submitted an AI request and displayed its missing-configuration response,
  navigated to the dashboard, filtered records and returned to the simulator.
  No uncaught page exceptions occurred.
- The official upstream IISNode JavaScript interceptor successfully loaded
  `run.cjs` through `require` with Node 22 and health returned HTTP 200. This
  validates the JavaScript bridge, not the native Windows IIS module.
- The artifact smoke test rejected the original malformed `web.config`.
- Frontend lint exits successfully with three pre-existing React warnings. Vite
  reports large chunks; neither warning was suppressed.

Windows/IIS tests and the updated GitHub Actions workflow have not run here.
An open socket is not evidence of successful IIS execution. The backend's existing
`npm test` is an explicit failing placeholder, not a real test suite.

## Controlled deployment and acceptance

Pull requests build and validate the artifact without production credentials.
Only `main` push/manual runs deploy. Deployment retains existing OIDC login,
resource and Free F1 plan, and serializes production jobs. No paid resources or
hosting-plan changes are introduced.

After deployment, the workflow requires public health, actual SPA HTML, frontend
routes, JS/CSS assets and API status checks to pass. A green upload alone no longer
marks a successful application deployment. On failure it queries non-secret App Service state and runtime metadata. Raw
application logs are not uploaded as artifacts, because they may contain secrets.
Log downloads require existing Azure RBAC permission and should be inspected
locally and redacted before sharing.

To repeat public validation:

```sh
node scripts/smoke.mjs https://nasa-llamalab-2026-app-dccwa9gqg7eqhmgp.brazilsouth-01.azurewebsites.net
```

If it still fails, the minimal missing evidence is the corresponding
`LogFiles` detailed error/FREB record with status, substatus, HRESULT, module,
configuration source/line and startup stderr. In an authenticated Azure CLI:

```sh
az webapp log download --resource-group rg_nasa_llamalab --name nasa-llamalab-2026-app --log-file appservice-logs.zip
```

For 500.19 inspect the configuration source and HRESULT before modifying handlers.
For a missing-module error verify IISNode registration in Kudu/IIS configuration.
For 500.1001 or process failures inspect IISNode stderr and its Node command/runtime.
Check App Service's configured Node 22 runtime and `WEBSITE_NODE_DEFAULT_VERSION`
without dumping other application settings. Do not print secret values.

## Access and integration limitations

The environment proxy returns CONNECT 403 for the public Azure host and denies
`api.github.com`. These are not responses from the application. Network grants
for the public host, its SCM host and the GitHub API were saved in the environment
draft, preserving the previously requested NASA grant; they are not yet applied.
The Azure identity manifest has no connections. No live Azure logs, deployment
result or public HTTP 200 can currently be claimed.

Supabase and AI credentials are absent. Their live telemetry read/write and model
responses were not tested; expected missing-configuration responses were tested.
NASA NTRS remains blocked by network policy. Wokwi/ESP32 was inspected but not run;
its firmware and integration remain unchanged. Do not use example credentials.
Do not publish `.env`, the ingestion token or backend API keys in the frontend.
