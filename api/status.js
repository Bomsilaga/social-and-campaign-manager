export default function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET")return res.status(405).json({error:"GET required"});
  const p=process.env;
  return res.status(200).json({
    mode:"protected optional APIs",
    accessTokenConfigured:Boolean(p.EDITOR_ACCESS_TOKEN),
    stockSearchConfigured:Boolean(p.PEXELS_API_KEY),
    imageGenerationConfigured:Boolean(p.OPENAI_API_KEY),
    creativeOpenAIConfigured:Boolean(p.OPENAI_API_KEY),
    creativeClaudeConfigured:Boolean(p.ANTHROPIC_API_KEY&&p.ANTHROPIC_MODEL),
    elevenLabsConfigured:Boolean(p.ELEVENLABS_API_KEY&&p.ELEVENLABS_VOICE_ID),
    pixabayConfigured:Boolean(p.PIXABAY_API_KEY),
    youtubeDiscoveryConfigured:Boolean(p.YOUTUBE_API_KEY),
    supabaseConfigured:Boolean(p.SUPABASE_URL&&(p.SUPABASE_SECRET_KEY||p.SUPABASE_SERVICE_ROLE_KEY)),
    metaAppConfigured:Boolean(p.META_APP_ID&&p.META_APP_SECRET),
    tiktokAppConfigured:Boolean(p.TIKTOK_CLIENT_KEY&&p.TIKTOK_CLIENT_SECRET),
    paidGenerationEnabled:p.ALLOW_PAID_GENERATION==="true",
    mp4Export:"Browser MediaRecorder with native MP4 only where supported; otherwise WebM",
    socialPublishingEnabled:false,
    disclaimer:"Configured means keys are present; it does not verify login, billing, permission or provider connectivity."
  })
}