export default function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  res.status(200).json({
    mode:"protected optional APIs",
    accessTokenConfigured:Boolean(process.env.EDITOR_ACCESS_TOKEN),
    stockSearchConfigured:Boolean(process.env.PEXELS_API_KEY),
    imageGenerationConfigured:Boolean(process.env.OPENAI_API_KEY),
    paidGenerationEnabled:process.env.ALLOW_PAID_GENERATION==="true",
    mp4Export:"browser-supported native MediaRecorder only; WebM fallback",
    socialPublishingEnabled:false
  })
}