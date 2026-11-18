import { timingSafeEqual } from "node:crypto";
const ok = (a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST")return res.status(405).json({error:"POST required"});
  if(!process.env.EDITOR_ACCESS_TOKEN)return res.status(503).json({error:"Configure EDITOR_ACCESS_TOKEN first"});
  if(!ok(req.headers.authorization?.replace(/^Bearer /,""),process.env.EDITOR_ACCESS_TOKEN))return res.status(401).json({error:"Unauthorised"});
  if(process.env.ALLOW_PAID_GENERATION!=="true")return res.status(403).json({error:"Paid model calls are disabled. Keep ALLOW_PAID_GENERATION=false until you approve costs."});
  const prompt=String(req.body?.prompt||"").trim().slice(0,4000);
  const provider=String(req.body?.provider||"openai");
  const mode=String(req.body?.mode||"concept");
  if(prompt.length<12)return res.status(400).json({error:"Provide at least 12 characters of creative direction"});
  if(!["openai","claude"].includes(provider))return res.status(400).json({error:"Unsupported model provider"});
  if(!["concept","script","review","storyboard"].includes(mode))return res.status(400).json({error:"Unsupported task"});
  const system="You are the research-conscious producer of Boma Social and Campaign Manager. Produce original creative material; do not reproduce a third-party script or copyrighted footage. Be accurate, label uncertainty and do not invent sources or engagement numbers. Australian English. For a 30-second short, prefer 60–75 spoken words. Return clearly structured sections labelled HOOK, SCRIPT, SCENES, CAPTIONS, FACT-CHECK and RIGHTS. A creative idea is not verified fact.";
  try{
    if(provider==="openai"){
      if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"Configure OPENAI_API_KEY"});
      const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:"Bearer "+process.env.OPENAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_TEXT_MODEL||"gpt-5-mini",instructions:system,input:"Task: "+mode+"\nBrief: "+prompt,max_output_tokens:1600,store:false}),signal:AbortSignal.timeout(90000)});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)return res.status(502).json({error:"OpenAI request rejected",detail:String(d.error?.message||r.status).slice(0,200)});
      const content=d.output_text||d.output?.flatMap(i=>i.content||[]).filter(v=>v.type==="output_text").map(v=>v.text).join("\n")||"";
      return res.status(200).json({provider:"openai",model:d.model,mode,text:content,usage:d.usage||null});
    }
    if(!process.env.ANTHROPIC_API_KEY)return res.status(503).json({error:"Configure ANTHROPIC_API_KEY"});
    if(!process.env.ANTHROPIC_MODEL)return res.status(503).json({error:"Set ANTHROPIC_MODEL to an available Claude model in your account"});
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","Content-Type":"application/json"},body:JSON.stringify({model:process.env.ANTHROPIC_MODEL,max_tokens:1600,system,messages:[{role:"user",content:"Task: "+mode+"\nBrief: "+prompt}]}),signal:AbortSignal.timeout(90000)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)return res.status(502).json({error:"Claude request rejected",detail:String(d.error?.message||r.status).slice(0,200)});
    return res.status(200).json({provider:"claude",model:d.model,mode,text:(d.content||[]).filter(c=>c.type==="text").map(c=>c.text).join("\n"),usage:d.usage||null});
  }catch(e){return res.status(504).json({error:"Provider timeout or network error",detail:String(e.message||e).slice(0,180)})}
}