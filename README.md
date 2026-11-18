# Social and Campaign Manager

Boma AI's standalone short-form social video production application.

## Current capabilities (v0.2)
- Add locally owned, permitted, licensed, or public-domain images and video clips.
- Enter rights provenance for each external clip; unknown rights block export.
- Create up to six scenes, with scene captions, durations, cover/contain framing.
- Preview a vertical 9:16 canvas composition.
- Optional uploaded audio track for a browser recording.
- Export WebM using the browser MediaRecorder API, SRT subtitle file, and JSON production manifest.
- No automatic publishing, scraping, licensed stock downloading, or AI image creation yet.

## Running locally
Open `index.html` in a current Chrome or Edge browser. No npm dependencies or API credentials are required for this foundation version. Audio recording support varies by browser. Browser media export is real time and may fail on unsupported devices. There is no persistent cloud storage: uploads remain in browser memory and will be lost on refresh.

## Roadmap
1. Replace static HTML with a modular Next.js/TypeScript application and persistent database/object storage.
2. Add AI image and script generation through server-only credentials.
3. Integrate licence-aware stock media providers; never infer that a publicly viewable social video may be reused merely because it can be edited.
4. Add a reliable server-side FFmpeg/Remotion worker and MP4 H.264 output, soundtrack mixing, subtitles, trim, transitions and voice-over sync.
5. Add trend APIs, campaign approvals, OAuth and social publishing only after testing.

## Security
Never commit keys. Configure server-side provider keys in Vercel Environment Variables when integrations are implemented. The current app has no server endpoints and deliberately does not use secrets.

## Deployment
The app has been deployed from the `Bomsilaga/social-and-campaign-manager` GitHub main commit to an existing Vercel project. Git push-to-deploy automation must be verified separately in Vercel Settings > Git.
