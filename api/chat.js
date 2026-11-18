import { timingSafeEqual } from "node:crypto";
const equal=(a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
const system="You are Boma Studio Director, a skilled Australian-English conversational creative producer inside Boma Social and Campaign Manager. The owner explains what they want made (social posts, campaign plans, promotional copy, documentary-style videos, video scripts, social ads and storyboards) and can refine it turn by turn. Be conversational, practical, specific and proactively help turn rough instructions into a production-ready brief. Maintain the user's objective and previous instructions across turns, including revision requests. If sufficient details are supplied, produce a useful first draft immediately; ask at most one essential question if necessary. Avoid lengthy generic checklists. User remains final approver. For videos, when requested write a concrete production outline including format/platform, target duration, opening hook, scene-by-scene visuals with realistic media sourcing notes, voiceover in natural Australian English, optional on-screen captions, audio/music approach, end card/call to action and export requirements. Write actual script and scenes, not just a promise. Keep narrated words proportionate to duration (~130-150 words per minute). For posts, write publication-ready original copy and a distinct visual brief. For campaigns, propose grounded objectives, platforms, audience, schedule, assets, budgets (only if supplied or asked), metrics and approval checkpoints. Do not fabricate sources or assert unverified statistics as fact. Label research needs and uncertainties, including political and historical claims. Do not appropriate copyrighted text, footage or music. Do not claim to have generated image/video/audio, posted content, researched live web or uploaded files merely because you wrote a plan. Clearly separate draft from actual production; no automation or publishing without specific approval. Respond in clear prose, headings when appropriate, and not as JSON.";
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST")return res.status(405).json({error:"POST required"});
 if(!process.env.EDITOR_ACCESS_TOKEN||!equal(req.headers.authorization?.replace(/^Bearer /,""),process.env.EDITOR_ACCESS_TOKEN))return res.status(401).json({error:"Provide the Studio access token in Settings."});
 if(process.env.ALLOW_PAID_GENERATION!=="true")return res.status(403).json({error:"AI chat is not enabled: ALLOW_PAID_GENERATION must be true in Vercel. You can still draft instructions locally without API charges."});
 const provider=String(req.body?.provider||"openai");
 if(!["openai","claude"].includes(provider))return res.status(400).json({error:"Select OpenAI or Claude"});
 const messages=req.body?.messages;
 if(!Array.isArray(messages)||messages.length===0||messages.length>24)return res.status(400).json({error:"Supply 1–24 conversation messages"});
 const clean=[];
 for(const msg of messages){
   if(!msg||!["user","assistant"].includes(msg.role)||typeof msg.content!=="string")return res.status(400).json({error:"Invalid chat message"});
   const content=msg.content.trim();
   if(content.length<1||content.length>12000)return res.status(400).json({error:"Each message must be between 1 and 12,000 characters"});
   clean.push({role:msg.role,content});
 }
 if(clean[clean.length-1].role!=="user")return res.status(400).json({error:"The last message must be a user instruction"});
 const total=clean.reduce((n,m)=>n+m.content.length,0);
 if(total>38000)return res.status(413).json({error:"Conversation too long. Start a new project or shorten older messages."});
 const kind=String(req.body?.kind||"video").slice(0,35);
 const context="Project type: "+kind+". Studio settings: "+JSON.stringify({format:String(req.body?.format||"9:16").slice(0,15),durationSeconds:Math.min(600,Math.max(5,Number(req.body?.duration)||30)),audience:String(req.body?.audience||"").slice(0,200)});
 try{
   if(provider==="openai"){
     if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"OPENAI_API_KEY is not configured"});
     const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:"Bearer "+process.env.OPENAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_TEXT_MODEL||"gpt-5-mini",instructions:system+"\n"+context,input:clean.map(m=>({role:m.role,content:m.content})),max_output_tokens:2400,store:false}),signal:AbortSignal.timeout(90000)});
     const d=await r.json().catch(()=>({}));
     if(!r.ok)return res.status(502).json({error:"OpenAI request failed",detail:String(d.error?.message||r.status).slice(0,180)});
     const reply=d.output_text||d.output?.flatMap(i=>i.content||[]).filter(v=>v.type==="output_text").map(v=>v.text).join("\n")||"";
     if(!reply)return res.status(502).json({error:"OpenAI returned no response"});
     return res.status(200).json({reply,provider,model:d.model,usage:d.usage||null});
   }
   if(!process.env.ANTHROPIC_API_KEY||!process.env.ANTHROPIC_MODEL)return res.status(503).json({error:"Claude API configuration is incomplete"});
   const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","Content-Type":"application/json"},body:JSON.stringify({model:process.env.ANTHROPIC_MODEL,max_tokens:2400,system:system+"\n"+context,messages:clean}),signal:AbortSignal.timeout(90000)});
   const d=await r.json().catch(()=>({}));
   if(!r.ok)return res.status(502).json({error:"Claude request failed",detail:String(d.error?.message||r.status).slice(0,180)});
   const reply=(d.content||[]).filter(v=>v.type==="text").map(v=>v.text).join("\n");
   if(!reply)return res.status(502).json({error:"Claude returned no response"});
   return res.status(200).json({reply,provider,model:d.model,usage:d.usage||null});
 }catch(e){return res.status(504).json({error:"AI chat timed out or network failed",detail:String(e.message||e).slice(0,160)})}
}