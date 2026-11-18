# Boma Social and Campaign Manager — Rendering Worker (initial scaffold)

Infrastructure **only**. This is a safe deployable HTTP process with FFmpeg and a public health endpoint, but **it does not render video yet**. `POST /render` currently returns 501, including when correctly authorised; do not connect the studio's Render button to this scaffold.

### Railway service configuration (when ready)

- Connect GitHub repository `Bomsilaga/social-and-campaign-manager`.
- Service **Root Directory**: `/render-worker` (critical: do not deploy the Vercel root as a worker).
- Builder: Dockerfile (located within the service root).
- Health check: `/health`.
- Port: Railway supplies `PORT`, default 3000 in local development.
- Secret: `RENDER_WORKER_SHARED_SECRET` must be a long randomly generated value; never include it in client-side JS.
- Render requests: not implemented; no render jobs or media storage yet.
- Do not point main app `RENDER_WORKER_URL` to this service until render/job and media storage endpoints are complete and tested.

### Build roadmap

1. Add Remotion compositions for 9:16, 16:9 and 4:5, aligned with editor timeline schema.
2. Implement signed, short-lived asset input URLs and reject unsafe origins/SSRF.
3. Implement a capped queue with max duration, resolution, concurrency and cost limits.
4. Export MP4 H.264/AAC with captions and narration; upload finished file to private object storage.
5. Wire server-only Vercel proxy routes; never expose the shared secret to the browser.

The repository root stays dedicated to the Vercel studio. Avoid automatic worker deployment until Railway service/root settings and billing have been reviewed.
