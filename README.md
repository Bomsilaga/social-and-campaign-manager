# Social and Campaign Manager

Independent Boma AI Social & Campaign Manager built for the `Bomsilaga/social-and-campaign-manager` repository and the Vercel project `social-and-campaign-manager`.

## Integration build v0.4

The unified dark studio offers: a provider readiness dashboard, YouTube seven-day short-video metadata discovery, OpenAI or Claude creative drafts, optional independent second-model reviews, OpenAI-generated scene images, ElevenLabs narration, licensed Pixabay-first and optional Pexels stock search, 9:16 timeline editor, timed captions, downloaded SRT files and storyboards, optional Supabase JSON manifest storage, and browser recording.

### Actual implementation status

| Provider | Implemented | Restrictions |
| --- | --- | --- |
| OpenAI | Image + original text generation via server routes | Paid calls disabled until `ALLOW_PAID_GENERATION=true`; must also have key and access token |
| Claude | Text drafting + second-model review | Needs ANTHROPIC_API_KEY + ANTHROPIC_MODEL; also gated by paid switch |
| ElevenLabs | Text-to-speech MP3 attached to editor | Needs voice ID + key; gated by paid switch |
| Pexels | Optional keyword search + browser import attempt for existing API-key holders | New keys paused as of November 2026; NOT required for this project |
| Pixabay | Keyword video search + browser import attempt | API key; inspect item usage rights |
| YouTube | Last-seven-days AU public video discovery, metadata | API key; public statistics are snapshots, no direct video downloads or publishing |
| Supabase | Protected POST/GET of storyboard JSON manifests | Needs secret key, project URL and `supabase/schema.sql` migration; no media binaries |
| Facebook / Instagram | Setup readiness only | OAuth app permissions and access review required before any publishing |
| TikTok | Setup readiness only | Developer access and posting approval required |
| MP4 rendering | Native browser MediaRecorder only if supported | WebM fallback. No server FFmpeg/Remotion deployment |
| Calendar / campaign scheduler | Not implemented | No automatic publishing |

## Vercel setup

1. In [Vercel project settings](https://vercel.com/ipaliboboma-3927s-projects/social-and-campaign-manager/settings/environment-variables), add `EDITOR_ACCESS_TOKEN` as a long random unique secret. It is the prototype owner access token, NOT your OpenAI/Claude/Pexels key.
2. Add required provider credentials from the official provider consoles. See `.env.example` for the complete names. Use sensitive/encrypted environment variables, never `NEXT_PUBLIC_*`.
3. Set `ALLOW_PAID_GENERATION=false` until you have checked provider billing and budgets; then change to `true` only with your explicit authorisation. Each paid request prompts for confirmation in the browser. The app's local A$ budget preference is NOT a provider-side hard cap.
4. Set `ANTHROPIC_MODEL` to a currently supported Claude model; set `ELEVENLABS_VOICE_ID` to an authorised voice ID.
5. For Supabase, create a project and run `supabase/schema.sql` in its SQL editor; then configure `SUPABASE_URL` and a server-only secret/service-role key. This single-owner prototype has no Supabase Auth or public RLS policy.
6. Redeploy from `main` so new env vars reach the server. In the app's Settings Centre, paste ONLY the `EDITOR_ACCESS_TOKEN` into the studio token input for this browser session and click `Refresh connections`.

## How to test without spending money

- Open the dashboard and verify the page loads.
- Add owned images or license-cleared video clips and demo title cards.
- Edit scene durations, captions and preferences; preview the timeline.
- Export storyboard JSON and SRT captions.
- With Pixabay configured, search licensed footage (Pexels optional for existing key holders), inspect provenance and import only approved footage.
- With YouTube API configured, search seven-day public-video metadata; this is not a footage downloader.
- Keep `ALLOW_PAID_GENERATION=false` and verify the creative, voice and image routes reject paid calls.

## Security and copyright

- The prototype uses a **shared access token** and no user-account authentication, job quota or distributed rate limiting. Do not make this a public multi-user SaaS before implementing OAuth/account sessions, workspace isolation, CSRF protection, rate limiting, persistent audit logs and server-side cost budgets.
- Third-party media rights must be checked before reuse. Changing overlays, crops, audio or captions does not itself give permission to republish.
- Rights marked unknown block export. Pexels and Pixabay may have content-specific usage restrictions; check the individual licence.
- The project vault stores **metadata only**. Cloud-saved storyboards do not restore local video/image bytes.
- The existing browser renderer has no guaranteed MP4 output; high-quality consistent H.264 rendering requires a dedicated worker.

## Architecture direction

Keep provider adapters independent. Introduce Supabase Auth, object storage and a durable job queue before platform OAuth. Add FFmpeg/Remotion as an isolated renderer worker, not inside the Vercel frontend request. Publishing adapters must use platform-authorised OAuth scopes and keep all publishing disabled until a human approves each content version.

All services remain optional. You do not need to pay for or connect every one to test the core workflow.
