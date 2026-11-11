# Little Luxe PWA

`vite-plugin-pwa` generates the service worker using `generateSW` in prompt mode.
The application registers it directly so every open tab can finish draft saves
before reloading on controller change. No custom service worker is maintained.

## Cached files

All generated HTML (except the Pages 404 redirect), JavaScript route chunks, CSS,
and local font files are precached, along with the favicon, UI icon sprite and
installation icons. Product images, hero photography, APIs, auth requests, source
maps and `pwa-version.json` are not precached. There is no runtime API/data cache.
Essential chunks above the explicit 5 MiB limit produce a build warning: review
warnings before publishing. Browser storage can be evicted; offline availability
requires a successful first installation and does not imply offline business data.

## Installation and updates

The navigation offers installation when the browser supplies its install event.
Apple devices receive user-initiated Add to Home Screen guidance. No first-visit
install popup appears; installed standalone windows hide installation controls.

Update checks run on launch, foreground return, connectivity return and via
Check for updates in navigation. A successfully downloaded replacement prompts
Update now / Later. Updating saves active autosaved drafts, activates the waiting
worker, then reloads controlled tabs. Finish network submissions and save any forms
without draft support first. A first installation does not reload the application.
If all old clients close, the browser may activate a waiting update automatically.
The application cannot close/relaunch its OS process.

## Required releases

`src/pwa/version.ts` contains the numeric application release ID (initially 1).
`public/pwa-version.json` declares numeric latest/minimum-supported release IDs.
The policy is fetched from the network with `cache: no-store`, outside the worker
cache. A higher minimum displays a blocking update screen, including offline retry.
Failed network checks retain the last policy observed during that running session;
a fresh offline launch cannot discover a newly published minimum.

For a breaking release:

1. Increase `APP_VERSION` and `latestVersion`; build and publish the new client.
2. Verify the new client and service worker are available.
3. Raise `minimumSupportedVersion` only after the compatible client is available.

The latest field is informational; only the minimum blocks clients. Do not raise
it above an actually published application release ID. This UI check does not
reject backend operations: API compatibility enforcement must be implemented on
the server if required. No Supabase schema, permissions or RPC changes are included.

## Publishing and testing

`npm run deploy:prepare` copies the generated site into the branch root; the Pages
workflow commits the service worker, Workbox runtime, manifest, icons and policy
alongside the application assets. Avoid changing built files by hand.

Run `npm run build`, `npm run lint`, and `npm test`. For browser checks, serve the
production build over localhost or HTTPS at `/Little_Luxe_Sample/` (service workers
are disabled during ordinary Vite development). Test installation on Android and
iOS hardware. To test updates, keep release A open, publish a changed release B,
check for updates, then accept; repeat with two tabs and an autosaved draft.
