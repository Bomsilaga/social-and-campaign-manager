export default function handler(req,res){
 res.setHeader("Cache-Control","no-store");if(req.method!=="GET")return res.status(405).json({error:"GET required"});
 const p=process.env;
 const services=[
 {id:"openai",name:"OpenAI",key:"OPENAI_API_KEY",configured:!!p.OPENAI_API_KEY,implemented:true,capability:"Original images, scripts and creative analysis"},
 {id:"claude",name:"Claude",key:"ANTHROPIC_API_KEY",configured:!!p.ANTHROPIC_API_KEY,implemented:true,capability:"Second-model script review and concepts",needsModel:!p.ANTHROPIC_MODEL},
 {id:"elevenlabs",name:"ElevenLabs",key:"ELEVENLABS_API_KEY",configured:!!p.ELEVENLABS_API_KEY,implemented:true,capability:"Voiceover generation",needsVoice:!p.ELEVENLABS_VOICE_ID},
 {id:"pexels",name:"Pexels",key:"PEXELS_API_KEY",configured:!!p.PEXELS_API_KEY,implemented:true,capability:"Licensed stock footage"},
 {id:"pixabay",name:"Pixabay",key:"PIXABAY_API_KEY",configured:!!p.PIXABAY_API_KEY,implemented:true,capability:"Additional licensed stock footage"},
 {id:"youtube",name:"YouTube",key:"YOUTUBE_API_KEY",configured:!!p.YOUTUBE_API_KEY,implemented:true,capability:"Public video metadata discovery (7 days); not publishing"},
 {id:"supabase",name:"Supabase",key:"SUPABASE_URL",configured:!!(p.SUPABASE_URL&&(p.SUPABASE_SERVICE_ROLE_KEY||p.SUPABASE_SECRET_KEY)),implemented:false,capability:"Project storage needs schema and authentication"},
 {id:"meta",name:"Meta (Facebook / Instagram)",key:"META_APP_ID",configured:!!(p.META_APP_ID&&p.META_APP_SECRET),implemented:false,capability:"App registration and permissions required; not publishing"},
 {id:"tiktok",name:"TikTok",key:"TIKTOK_CLIENT_KEY",configured:!!(p.TIKTOK_CLIENT_KEY&&p.TIKTOK_CLIENT_SECRET),implemented:false,capability:"OAuth and posting review required; not publishing"}
 ];
 return res.status(200).json({services,editorProtected:!!p.EDITOR_ACCESS_TOKEN,paidRequestsEnabled:p.ALLOW_PAID_GENERATION==="true",publicationEnabled:false,rendering:"browser-based, MP4 depends on browser support",storage:"local browser session",notice:"Configured only means environment variables exist, not that provider authentication has been tested."})
}