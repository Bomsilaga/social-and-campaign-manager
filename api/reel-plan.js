import {timingSafeEqual} from "node:crypto";
const equal=(a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
const instructions="You are a hands-on creative production planner for Boma AI. Return ONLY valid JSON matching the schema below, no markdown. Turn the supplied user brief into a practical original short social video. Never pretend work was performed. Write concise factually careful natural Australian English; no unverified statistics, special technical facts, or copyrighted media requests. Use 3 distinct visual scenes as original photorealistic image prompts, not requests to copy other creators. Respect provided theme and constraints. Duration must match user target; it is flexible, not fixed. Narration should be natural and fit within the target duration at approximately 125–150 words/minute. For a 20 second film use ~36–42 words, not 70. Output fields: title (string up to 70 chars), narration (string up to 1500 chars), headline (string up to 70 chars), cta (string up to 70 chars), scenes (array of precisely 3 objects, each with caption string up to 160 chars, imagePrompt string up to 800 chars). Each scene must describe an actual visible shot which could be rendered into a vertical documentary photograph; avoid creating text within the image.";
function check(plan){
 if(!plan||typeof plan!=="object"||!Array.isArray(plan.scenes)||plan.scenes.length!==3)throw Error("AI did not return a valid 3-scene plan");
 for(const s of plan.scenes){if(typeof s.caption!=="string"||typeof s.imagePrompt!=="string"||s.imagePrompt.length<20)throw Error("Scene instructions are incomplete")}
 if(typeof plan.narration!=="string"||plan.narration.length<20||plan.narration.length>1500)throw Error("Narration is invalid");
 return {title:String(plan.title||"Original social Reel").slice(0,70),headline:String(plan.headline||"Something worth knowing").slice(0,70),cta:String(plan.cta||"Follow for more").slice(0,70),narration:plan.narration.slice(0,1500),scenes:plan.scenes.map(s=>({caption:s.caption.slice(0,160),imagePrompt:s.imagePrompt.slice(0,800)}))};
}
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST")return res.status(405).json({error:"POST required"});
 if(!process.env.EDITOR_ACCESS_TOKEN||!equal(req.headers.authorization?.replace(/^Bearer /,""),process.env.EDITOR_ACCESS_TOKEN))return res.status(401).json({error:"Studio access token required"});
 if(process.env.ALLOW_PAID_GENERATION!=="true")return res.status(403).json({error:"Enable paid generation in Vercel before generating media"});
 const brief=String(req.body?.brief||"").trim().slice(0,3500);
 if(brief.length<10)return res.status(400).json({error:"Describe the Reel in at least 10 characters"});
 const seconds=Math.max(8,Math.min(180,Math.round(Number(req.body?.duration)||20)));
 const provider=req.body?.provider==="claude"?"claude":"openai";
 const prompt="Video duration: "+seconds+" seconds. Platform: "+String(req.body?.format||"9:16").slice(0,15)+". Brief: "+brief;
 try{
  let text="";
  if(provider==="openai"){
   if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"OpenAI API key missing"});
   const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:"Bearer "+process.env.OPENAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_TEXT_MODEL||"gpt-5-mini",instructions,input:prompt,max_output_tokens:1400,store:false}),signal:AbortSignal.timeout(60000)});
   const d=await r.json().catch(()=>({}));if(!r.ok)return res.status(502).json({error:"OpenAI planning failed",detail:String(d.error?.message||r.status).slice(0,180)});
   text=d.output_text||d.output?.flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("")||"";
  }else{
   if(!process.env.ANTHROPIC_API_KEY||!process.env.ANTHROPIC_MODEL)return res.status(503).json({error:"Claude API credentials missing"});
   const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","Content-Type":"application/json"},body:JSON.stringify({model:process.env.ANTHROPIC_MODEL,max_tokens:1400,system:instructions,messages:[{role:"user",content:prompt}]}),signal:AbortSignal.timeout(60000)});
   const d=await r.json().catch(()=>({}));if(!r.ok)return res.status(502).json({error:"Claude planning failed",detail:String(d.error?.message||r.status).slice(0,180)});
   text=(d.content||[]).filter(x=>x.type==="text").map(x=>x.text).join("");
  }
  let plan;try{plan=JSON.parse(text.replace(/^\s*```(?:json)?/i,"").replace(/```\s*$/,"").trim())}catch{return res.status(502).json({error:"AI returned a non-JSON Reel plan; retry using OpenAI or Claude"})}
  return res.status(200).json({plan:check(plan),duration:seconds,provider});
 }catch(e){return res.status(504).json({error:"Reel planning failed",detail:String(e.message||e).slice(0,150)})}
}
