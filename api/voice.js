import { timingSafeEqual } from "node:crypto";
const ok=(a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST")return res.status(405).json({error:"POST required"});
  if(!process.env.EDITOR_ACCESS_TOKEN||!ok(req.headers.authorization?.replace(/^Bearer /,""),process.env.EDITOR_ACCESS_TOKEN))return res.status(401).json({error:"Unauthorised"});
  if(process.env.ALLOW_PAID_GENERATION!=="true")return res.status(403).json({error:"Paid TTS is disabled; enable it deliberately in Vercel"});
  const text=String(req.body?.text||"").trim(),voice=String(req.body?.voice||process.env.ELEVENLABS_VOICE_ID||"");
  if(!process.env.ELEVENLABS_API_KEY)return res.status(503).json({error:"Configure ELEVENLABS_API_KEY"});
  if(!/^[A-Za-z0-9_-]{12,60}$/.test(voice))return res.status(400).json({error:"Set an available ELEVENLABS_VOICE_ID or provide a valid voice ID"});
  if(text.length<4||text.length>1600)return res.status(400).json({error:"Narration must contain 4–1600 characters"});
  try{
    const r=await fetch("https://api.elevenlabs.io/v1/text-to-speech/"+encodeURIComponent(voice),{method:"POST",headers:{"xi-api-key":process.env.ELEVENLABS_API_KEY,"Content-Type":"application/json","Accept":"audio/mpeg"},body:JSON.stringify({text,model_id:process.env.ELEVENLABS_MODEL_ID||"eleven_multilingual_v2",voice_settings:{stability:0.42,similarity_boost:0.78,style:0.28,use_speaker_boost:true}}),signal:AbortSignal.timeout(85000)});
    if(!r.ok){const err=await r.text();return res.status(502).json({error:"Narration provider rejected request",detail:err.slice(0,200)})}
    const audio=Buffer.from(await r.arrayBuffer());
    if(audio.length>7_000_000)return res.status(413).json({error:"Audio exceeds prototype response limit"});
    res.setHeader("Content-Type","audio/mpeg");
    return res.status(200).send(audio);
  }catch(e){return res.status(504).json({error:"Narration request failed",detail:String(e.message||e).slice(0,150)})}
}