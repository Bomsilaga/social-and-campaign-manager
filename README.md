# Boma Social and Campaign Manager

An independently deployed, GitHub-backed short-form video production studio for Boma AI.

## Live foundation (v0.3)

- Responsive dark production dashboard with local image/video uploads.
- Rights provenance for owned, licensed, permitted or public-domain clips. Unknown rights block export.
- Up to 12 editable scenes (configurable), on-canvas captions, font/colour/alignment, headline and CTA.
- Local playback and browser recording; WebM by default, native MP4 only where MediaRecorder reports support.
- Subtitles (.srt), production manifest (.json) and settings backup (.json).
- Settings & Preferences Centre: scene count/duration, video target, locale, design, approval policy and cost target.
- Optional server-side Pexels search and stock-video import (external CDN CORS may require manual licensed download and upload).
- Optional server-side OpenAI image generation, gated by EDITOR_ACCESS_TOKEN, API configuration, ALLOW_PAID_GENERATION=true and a per-request user confirmation.
- No automatic posting, voice synthesis, background rendering, source-video scraping or cloud persistence yet.

## Configure Vercel

Open the project Settings > Environment Variables. Add EDITOR_ACCESS_TOKEN (a long random string) and, optionally, PEXELS_API_KEY. Add OPENAI_API_KEY only when ready to generate original images. Keep ALLOW_PAID_GENERATION=false until you explicitly approve billable usage. Add OPENAI_IMAGE_MODEL if needed.

After a deployment with new settings, open Settings & Preferences in the studio, paste the matching access token for the current browser session only and click Check provider configuration. Do not insert API keys in this UI. It accepts only the studio access token, not raw provider keys.

This prototype uses a shared token rather than user accounts. It must remain access-controlled and should be upgraded to owner authentication, server-side usage metering and rate limiting before public or commercial deployment. The on-screen budget preference does not impose a provider billing cap.

## Local run

Open index.html directly to test offline editing. The /api routes require Vercel deployment or a compatible local server. Assets are not uploaded to a central database: refreshing the page discards the timeline. Browser media support and audio-capture limitations vary.

## Next milestones

1. Authentication, persistent project/asset storage, proper server-side budget enforcement.
2. Server-side FFmpeg/Remotion H.264 MP4 worker and reliable voiceover mixing.
3. Advanced AI scene generation, licensed footage import, clip trimming, transitions and 9:16 reframing.
4. Official trend discovery adapters, scheduled analysis and evidence-based scoring.
5. Human-review workflow and official publishing integrations.

Third-party online video is only imported when an appropriate licence, ownership or permission supports use. Minor edits, overlays or voiceovers alone do not make another creator's footage safe to reuse.
