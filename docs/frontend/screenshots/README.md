# Actual browser screenshots

No application screenshots have been captured in this execution environment.

Starting Next.js was denied with `listen EPERM` on `127.0.0.1:3000`. Chromium launch was denied by macOS bootstrap/MachPortRendezvous permissions. There are no generated images substituting for browser evidence.

On a machine permitting a local server and Chromium:

```bash
cd frontend
npm run test:e2e
```

The suite captures each of the 14 routes at 1440, 1280, 1024, 768 and 390 pixels, plus French at 1440 pixels. It also checks page overflow, JavaScript errors and axe-core rules. Inspect screenshots manually for hierarchy, spacing, clipping, table behavior, responsive navigation and control alignment. Fix observed issues and rerun relevant checks before marking the interface VERIFIED.

## Monitoring enhancement

`tests/monitoring.spec.ts` adds monitoring/dashboard/detail/incident screenshots at all five widths, plus sidebar, event-feed, registry, wizard, live-error, workspace and French checks. The new attempt to start localhost still returned EPERM; Chromium still failed macOS MachPortRendezvous bootstrap with Permission denied (1100). In-app browser attachment and Chrome UI automation also timed out. No screenshot or axe execution is claimed.
