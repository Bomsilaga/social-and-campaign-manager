# Boma AI — Social & Campaign Manager

**Product status:** single-owner creative-studio prototype, with a functioning UI and protected provider endpoints. **Not yet a self-running content agency or social auto-publisher.** As-built and target-state specification updated 18 November 2026.

- **Studio:** https://social-and-campaign-manager.vercel.app
- **Source:** https://github.com/Bomsilaga/social-and-campaign-manager
- **Hosting:** Vercel (web/API), Railway (worker scaffold), Supabase (JSON manifest database), GitHub
- **Goal:** turn natural-language creative direction into an original, editable, multi-format content package, then (after review and account authorisation) publish and optimise it.


## Chat-to-video automatic production (prototype, 18 November 2026)

The AI Director now includes **Create Reel Now**, not only text replies. With a valid studio token, `ALLOW_PAID_GENERATION=true`, valid OpenAI/Claude settings, OpenAI image model and ElevenLabs voice settings, the user can describe a Reel in chat and click the production action. Short chat instructions such as **“create now”** and **“do all”** (for video mode) are redirected to the production action using the previous user brief; confirmation is requested once before paid calls.

Actual execution path:
1. `POST /api/reel-plan` invokes the selected language model and requests a validated 3-scene JSON plan and correctly timed narration.
2. `POST /api/image` runs for each of the three scene prompts, returning actual generated PNGs attached to the browser scene editor. An image failure becomes an explicit labelled original placeholder, not a false success.
3. `POST /api/voice` invokes ElevenLabs and attaches a returned MP3 to the video editor, or reports the provider's real error.
4. Browser Canvas/MediaRecorder automatically attempts a full timeline render and downloads MP4 if natively supported, otherwise WebM. Rendering proceeds at real-time speed; keep tab open. Media generated in the browser is **not persisted to cloud storage** and local files are lost on reload unless downloaded. No automatic posting.
5. Output reports generated assets and errors honestly. A production plan without images/MP3 or render is not marked as a finished video.

**Limitations:** Three original generated stills make a **slideshow-style Reel**, not AI-animated footage. This is a first functional end-to-end pathway, not a replacement for Remotion/FFmpeg MP4 production. Narration timing is approximate and not yet automatically aligned by word-level timestamps. No music provider or post-upload API is executed. Browser rendering and downloads need manual acceptance testing on Windows Chrome/Edge; actual paid-provider calls have not yet been independently tested from this assistant's session.

## Narration branding rule

**Every narrated video, Reel, Short, and AI Studio Director voiceover ends with the exact spoken phrase “Now you know.”** It must be the final words of the narration, including when the script is revised, shortened, regenerated or converted to ElevenLabs speech. Include the sign-off inside the requested video duration and word budget. An on-screen CTA is allowed after or alongside the sign-off, but do not speak anything afterward. Silent videos without narration are exempt.

The `/api/reel-plan` endpoint also normalises the generated narration so this phrase is always the exact final sentence.

## 1. Product promise and guiding principles

A user should be able to say **“Create a 20-second Facebook Reel about an Australian engineering fact and a matching image post; show me drafts before publishing”** and receive a realistic concept, researched/scripted content, finished media once rendering is available, platform-ready captions and an editable publication plan.

**Chat-first, output-flexible**: no separate mandatory workflow for every post type. One conversation can yield text-only posts, single-image posts, carousels, Reels, short/long videos, promotional ads, scripts, business documents, campaign plans, thumbnails and platform-specific variants. User can say **“Keep the same voice and visual style, change the ending, and turn it into five posts”** and the system should retain decisions.

**Autonomous execution is the target, not a present claim.** Agents should do actual work with real providers and persisted artefacts, report completion honestly, track costs/licences, and propose publication. Publishing externally, spending advertising budget or buying assets requires clear owner permission and platform-approved access. Allow configurable pre-approved automation later, with stop controls and audit trails.

**Reel/video duration policy:** Suggested default range **10–30 seconds** with initial editor target **20 seconds**. This is a **creative starting point, not a hard requirement**. User may choose 5, 45, 60, 90, 180 seconds or longer. Current prototype UI offers 5–600 seconds target and a browser export cap of 600 seconds, subject to browser/device performance. Platform upload constraints must be checked independently before publication. Individual scene duration is adjustable; scene count preferences offer 6–24 scenes. Long-form server rendering is not yet implemented.

## 2. Content types and deliverables

| Type | Required content | Media |
| --- | --- | --- |
| Text-only post | Hook, body, call to action, optional hashtags | None; suitable where platform supports text posts |
| Image post | Post copy, creative brief, accessibility alt text | One original/owned/licensed image |
| Carousel | Ordered cards with captions and coherent narrative | Multiple licensed/owned images, platform limit enforced before publishing |
| Video post | Hook, screenplay, captions, voice/music if requested, posting text | One rendered/uploaded video plus thumbnail |
| Reel / Short / TikTok | Adaptable length, compelling first seconds, pacing, vertical framing, end card | 9:16 MP4 H.264/AAC **target**, once renderer is built |
| Long-form video | Chapters/scenes, narration, research citations, YouTube metadata | 16:9 MP4 plus chapters, thumbnail, caption file |
| Advertising creative | Offer, targeting idea, variations, legal review, disclosure | Image/video ad variants; paid spend requires separate approval |
| Content campaign | Objectives, calendar, platform adaptations, creative bundle, metrics | Reusable assets + scheduled packages, once scheduling is built |
| Business document | Purpose, written copy, brand-appropriate layout | Exportable document generation is a future deliverable |

Posts and attached media should be **one saved entity** with content type, source/licence, platform, draft/approved state, versions and asset references. The **current** composer is a browser-local implementation; full cloud asset persistence is a future milestone.

## 3. User experience: expected end-to-end flow

1. **Converse**: user explains subject, tone, audience, format, platform, desired outcome and any constraints, then adjusts them through follow-up messages. Voice input/attachment-based prompts are future capabilities.
2. **Interpret**: studio identifies whether this is a text post, image post, carousel, Reel, longer video or a campaign bundle. Asks only essential questions; defaults sensibly.
3. **Research and plan**: find useful public source metadata and relevant licensed assets; do **not** assert that search was actually performed when it was not. Present sources, uncertainties, originality review and claims needing verification.
4. **Produce**: AI prepares finished copy, hooks, scripts, shot list/storyboard, narration text, images, captions, thumbnail, voice and music where licensed and required.
5. **Render**: actual asynchronous Remotion/FFmpeg video rendering to MP4 (future). Maintain 9:16, 16:9, 4:5 and 1:1 presets; optional image-to-video and scene animation through approved providers.
6. **Package**: preserve all assets, rights, captions, hashtags, suggested time slots, language/localisation, alt text, approval history, platform-specific variations and export files together.
7. **Preview and review**: playable video or accurate post+media preview, side-by-side variants, revisions from conversation, factual and brand checks. Approval required.
8. **Distribute**: upload/draft/post via official platform APIs only after authorisation, scope and review; respect current platform restrictions, posting limits and consent.
9. **Measure**: authorised engagement metrics, delivery status, error handling, notifications and recommendations. Automate improvement only within approved boundaries.

**Definition of autonomous:** a user can provide a brief, leave the studio to generate and persist complete deliverables with progress/retry/cost tracking, then approve a ready-to-publish asset package. Background execution requires a real job queue and worker, **not just a chatbot that describes tasks**.

## 4. As-built features (verified from current source)

| Component | Actual implementation | Current limits |
| --- | --- | --- |
| Responsive studio | Single-page HTML/CSS/JS dashboard, editor and settings | UX is being refined; no full user authentication |
| AI Director Chat | Multi-turn OpenAI/Claude chat via `POST /api/chat`, conversation locally saved and exportable | Needs studio token + `ALLOW_PAID_GENERATION=true`; calls are billable; no long-lived cloud chat archive |
| AI Creative Desk | OpenAI or Claude concepts, script, storyboard, independent second-model review | AI outputs need fact checking; no actual web browsing by creative endpoint |
| Post & Media Composer | Text/image/carousel/video/Reel post selection; caption, alt text, multiple local image/video previews, rights checks, local approval, copy and JSON export | **No platform upload or persistent media storage**; local approval only. Original post images can be generated/attached via protected OpenAI image API when paid switch is enabled. |
| Reels timeline | Import images/videos, create demo card, edit captions/scene length, preview, make SRT and storyboard JSON | Max 24 scenes by preference; local files vanish on refresh; practical device limits |
| Browser video export | Canvas/MediaRecorder rendering, WebM or native MP4 if browser supports | 600-second prototype limit; H.264 MP4 not guaranteed; playback and audio vary by browser |
| AI images | Protected OpenAI image-generation route and import to timeline | Billable when enabled; cannot guarantee scene consistency |
| ElevenLabs narration | Protected text-to-speech route, audio preview and attach to browser editor | Billable when enabled; requires valid configured voice |
| Licensed footage | Pixabay video search, optional Pexels, manual rights/provenance | Search/import dependent on provider and CORS; licences require human review |
| YouTube discovery | Seven-day public-video metadata search | API key only; no download, watch-time analytics or live video analysis |
| Supabase manifest vault | Protected list/create video-project JSON manifests | `supabase/schema.sql` migration required; **stores metadata, not image/video bytes** |
| Meta Facebook OAuth | Login/start/callback/Page listing code | Requires token encryption key/migration and approval; no posting |
| TikTok Sandbox OAuth | Login/start/callback/profile routes and encrypted token design | Requires encryption key/migration and live sandbox testing; no publishing |
| Google OAuth | Client credentials saved/configured externally | **No Google OAuth callback, authorisation session or upload implementation** |
| Railway worker | Docker, FFmpeg, authenticated `/render` placeholder, public `/health` | `renderingEnabled:false`; `/render` returns 501, no Remotion renderer |
| Scheduler and analytics | Product intent and early configuration UI | **Not implemented** |
| Automatic publishing | Not implemented | Always disabled |
| Paid-generation safeguard | Server checks `ALLOW_PAID_GENERATION`; browser confirms billable actions | Browser dialogs are not multi-user spend ceilings; enforce hard budgets server-side in later release |

## 5. Operating modes and permissions

- **Draft / preview mode (current):** local post drafts, media attachment, storyboard, SRT and WebM without paid calls. No live publishing.
- **AI creative mode (conditional):** authenticated calls to OpenAI/Claude/ElevenLabs or image provider when paid generation is switched on; provider may bill, regardless of content quality.
- **Assist mode (target):** workers make editable asset bundles; user approves final render/post.
- **Auto-production mode (target):** background jobs execute approved creative briefs with budgets, media provenance, resumability and clear progress.
- **Autopublishing mode (target, opt-in):** pre-authorised platforms, schedules, exact content versions and budgets; pause/kill switch; human review for sensitive or high-impact material.

Never conflate “API key configured” with successful authenticated production. Never post on a user's behalf just because a draft was created. Do not invent views, conversion rates or public-source citations.

## 6. Planned agent architecture

**Chief Orchestrator** owns project state, prioritisation, task breakdown and approval boundaries. Specialist workers:
- **Brief Interpreter / Creative Director**: multi-turn direction, brand profile, reference-style memory, target channel and formatting.
- **Trend & Research Analyst**: search, source capture, evidence confidence, deduplicate themes, avoid plagiarism.
- **Copywriter / Scriptwriter**: posts, hooks, voiceovers, storyboards and adapted variants.
- **Art Director / Asset Producer**: image and clip generation, licences, prompts and consistency.
- **Voice & Audio Producer**: ElevenLabs, sound/music licences, timing, transcript, captions.
- **Editor / Renderer**: Remotion templates, FFmpeg MP4, durations and sizes, thumbnails.
- **Quality Reviewer**: language, originality, claims, media-rights, audio/captions, accessibility and platform checks; optional independent model review.
- **Campaign Manager**: calendars, per-channel versions, posting queue, permissions and delivery.
- **Analytics Analyst**: authorised metrics, recommendation/iteration and attribution.
- **Cost/Security Controller**: token spending, concurrency quotas, audit log, privacy, rate limits, secret management.

Implement as durable states **IDEA → BRIEF → RESEARCH → DRAFT → ASSETS → RENDER → QA → REVIEW → APPROVED → SCHEDULED → PUBLISHED → MEASURED**, with retry/failure branches. Each transition must store actual output references and actor/action, not just a status label.

Suggested tables: users/workspaces, projects, chats, content_items, creative_versions, assets, asset_rights, renditions, tasks/jobs, approvals, channels, oauth_connections, scheduled_posts, published_posts, usage_costs, metrics, audit_events. Supabase Auth + row-level policies needed for multi-user release. Store binaries in private object storage with signed links, never in JSON manifests or browser localStorage.

**Media pipeline:** signed uploads → asset validation/transcode → original-image/stock/voice generation → Remotion composition → FFmpeg H.264/AAC → object storage → preview → optional approved platform uploader. Avoid arbitrary server-side URL downloads and SSRF. Workers should have resource/timeout caps, deduplication, progress and idempotency.

## 7. Integration responsibilities

| Integration | Intended function | Stage |
| --- | --- | --- |
| OpenAI | conversational planning, script generation, image asset generation, critique | Endpoints present, paid switch + access required |
| Anthropic Claude | alternative generation and independent review | Endpoints present, paid switch + access required |
| ElevenLabs | voice synthesis and later voice consistency presets | TTS endpoint present |
| Pixabay / Pexels | authorised stock discovery | Search integration present; usage rights must be checked |
| YouTube Data API | topic metadata; later account uploading and analytics with OAuth | Discovery present; upload not implemented |
| Meta | Facebook Pages first, then Instagram after account/policy review | OAuth/read-stage code only |
| TikTok | Sandbox Login Kit, draft upload then direct post after approval | OAuth scaffolding, uploads not implemented |
| Google OAuth | authorised YouTube channel account | Credentials configured, callback not implemented |
| Supabase | SQL persistence, token vault, future file storage and job queue | JSON manifests and token schema files |
| Railway + FFmpeg / Remotion | deterministic professional video renderer | FFmpeg health working, renderer NOT implemented |

**Deployment separation:** repository root on Vercel for web routes; `/render-worker` on Railway for resource-heavy video work. Railway build root `/render-worker`, Dockerfile within that directory. Worker health is public; requests requiring shared secret must be server-to-server. Never put `RENDER_WORKER_SHARED_SECRET` or provider secrets in frontend JavaScript.

## 8. Key environment variables

**Vercel:** `EDITOR_ACCESS_TOKEN`, `ALLOW_PAID_GENERATION`, `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`, `OPENAI_IMAGE_MODEL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID`, `PIXABAY_API_KEY`, optional `PEXELS_API_KEY`, `YOUTUBE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`), `META_APP_ID`, `META_APP_SECRET`, `META_TOKEN_ENCRYPTION_KEY`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_TOKEN_ENCRYPTION_KEY`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `RENDER_WORKER_URL`, `RENDER_WORKER_SHARED_SECRET`.

**Railway:** `RENDER_WORKER_SHARED_SECRET` = same as server-side Vercel setting; `PORT` supplied by Railway.

Keys must be in host secret variables, not committed to GitHub or pasted into chats. Rotate any key that was disclosed. Use separate 32-byte Base64 encryption keys for each provider token vault. Variable presence does not validate billing, access rights or provider approval.

**Supabase migrations:** `supabase/schema.sql`, `supabase/meta_connections.sql`, `supabase/tiktok_connections.sql`. Check that each has actually been executed; presence in repo is not evidence of database installation.

## 9. Test and acceptance plan

### Current prototype checks
- [ ] Live site loads over HTTPS; desktop/mobile visual QA.
- [ ] Post composer supports text-only and caption+image; allows multiple images; previews locally and blocks incompatible/unknown-rights media approval.
- [ ] When billable image generation is enabled, **Generate & attach image** creates an actual original image, shows it in the post preview and allows saving its file locally.
- [ ] Local media never uploads without a specific action; export post manifest contains filenames/rights but not file bytes.
- [ ] Chat preserves user/assistant exchanges and allows continuation, export and handoff to Creative Desk.
- [ ] Signed-in studio token accepted; unauthorised requests rejected.
- [ ] With paid flag **false**, OpenAI/Claude/ElevenLabs/image endpoints reject charges.
- [ ] With temporarily enabled paid flag and owner authorisation, one small request per provider succeeds; report usage and reset flag.
- [ ] Scene total and target can differ; a 45–90 second Reel draft is not blocked just for exceeding 30 seconds.
- [ ] SRT, storyboard JSON and browser WebM export work on a supported browser.
- [ ] `/api/status` reports only configuration presence, not operational health.
- [ ] Railway `/health` returns FFmpeg-ready and `renderingEnabled:false`; `/render` remains inactive with 501 for authorised calls.
- [ ] Posting endpoints do not publish; no unapproved auto-posting.
- [ ] Supabase manifest save/load succeeds *after* migrations; media bytes not falsely claimed to be stored.

### Future autonomous end-to-end acceptance
A. **Post-only:** user briefs a 200-word Facebook post → final post text + accurate attached image + alt text → reviewed package saved → optional authorised post publishes once; record URL and metrics.  
B. **Reel:** user requests 20 seconds → AI plans original scenes, generates/attaches usable assets + ElevenLabs narration → MP4 9:16 H.264/AAC + captions → plays and passes audio QC → user can adjust to 45/90 seconds → approved upload.  
C. **Campaign:** user requests 7 days of mixed posts/videos → real queue generates and stores all creative → preview/approve → scheduled per platform → retries failures with notifications and no duplicate posts.  
D. **Rights:** unknown media triggers block; original and licensed media contain provenance, licence and permitted use.  
E. **Cost:** per-project budget cap is enforced on server, not just a dashboard number.  
F. **Resilience:** browser refresh does not lose completed server-side jobs or cloud media; workflow resumes and clearly reports errors.  
G. **Security:** encrypted OAuth tokens, least-privilege scopes, no public service key, logging without credential exposure.

## 10. Remaining engineering roadmap (in recommended order)

1. **Finish UX and post/reel separation**: bubble-styled chat-first home, post composer, asset preview and flexible duration. Preserve existing workflows.
2. **Durable projects & assets**: Supabase Auth, media buckets, uploaded file records, saved chats and version history.
3. **Real Remotion rendering**: compositions, audio mixing, export presets, secure asset flow, queue and progress; do not claim done until actual MP4 tested.
4. **Production-agent orchestration**: tools that genuinely call media, voice, research and rendering, with intermediate outputs and progress.
5. **Structured QA and approvals**: reusable brand voice/profile, rights/citation checks, subtitle correctness, optional cross-model review.
6. **Platform upload and distribution**: Facebook Page post/Reel, TikTok sandbox draft, YouTube upload; production permissions and compliance.
7. **Campaign scheduling and metrics**: durable jobs, retry protection, multi-platform adaptation, approval controls, analytics.
8. **Reliability, security, billing and scale**: rate limits, spend caps, quotas, observability, tests, multi-user architecture.

## 11. Known limitations / honest operating rules

- The chatbot **drafts** media plans; a textual chat response is **not** an image/video file or completed rendering.
- Attaching a file in the new post composer currently creates a browser preview only. Exported JSON does not contain file bytes and opening the app on another device will not restore those files.
- The Railway worker is deployed with FFmpeg and a health endpoint but does not yet generate MP4. **Remotion is not installed and the render API responds 501.**
- Full Google OAuth, direct YouTube upload, TikTok upload, Meta publishing, background scheduling, live analytics and unattended campaign execution are outstanding.
- The existing studio is a **single-owner prototype** with an access token in sessionStorage, not a secure multi-tenant SaaS.
- Paid generation must be intentionally enabled. User's budget preference is advisory only until a real server-enforced ledger is built.
- Media with unclear copyright cannot be used just by changing captions or adding voiceover; source rights apply.
- Platform constraints, developer-app reviews and OAuth scope permissions can change. Check official platform documentation at implementation and at release.

## 12. Practical start

1. Open https://social-and-campaign-manager.vercel.app/#director, enter your Studio access token in Settings.
2. Describe the content; choose **OpenAI** or **Claude**. Real AI replies require `ALLOW_PAID_GENERATION=true` and can incur charges.
3. For static content open **Post & Media Composer**; write/copy a caption, attach media or use the **Generate & attach image** action with OpenAI (billable if enabled), preview, approve locally, export the package. Download media files separately.
4. For videos, use the scene editor, caption and narration tools; choose 10–30 seconds as an idea, not a constraint. Export locally on a supported browser.
5. Review everything manually. There is **no automatic posting** at this stage.

### Project links

- [Railway worker scaffold](render-worker/README.md)
- [Supabase manifest migration](supabase/schema.sql)
- [TikTok token vault migration](supabase/tiktok_connections.sql)
- [Meta token vault migration](supabase/meta_connections.sql)
- [Renderer implementation task](https://github.com/Bomsilaga/social-and-campaign-manager/issues/1)
