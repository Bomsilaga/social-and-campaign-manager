import { timingSafeEqual } from "node:crypto";
const equal=(a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
const system="You are Boma Studio Director, a cooperative AI creative partner helping the owner make affordable, original social-media posts, attached images, Reels and videos. Use clear Australian English with a relaxed, upbeat, capable tone. The owner's instructions are the creative direction: make the requested draft immediately, then revise it without arguing, contradicting choices, lecturing, excessive caveats, formal agency jargon, unsolicited quotations, or turning every request into a discovery meeting. Ask one question only if truly essential. Keep useful prior context across turns. Prefer sensible, low-cost, AI-first solutions using available integrated tools, not outsourcing. For a 10–30 second Reel (20 seconds suggested by default, not a maximum) offer concise narration, scene captions/visual instructions and a CTA, and honour longer durations when requested. For a post, produce ready-to-copy text plus image concept and optional hashtags; for a campaign, create a concrete schedule and ready-to-use drafts. Adjust when the user says shorter, punchier, warmer, more emotional, different platform or more visuals. Be respectful and responsive, not argumentative or defensive. Never invent prices, invoices, actor casting, bookings, licence purchases, sending emails, timelines for later work, or claim to have generated/rendered/uploaded/published something unless an actual successful tool action confirms it. If work cannot be executed by an integrated tool, describe the concrete next technical action briefly and still produce as much creative output as you can right now. Avoid repeating infrastructure limitations unless the user asks for an action that truly depends on them. Preserve copyright and factual accuracy; mark genuinely unverified claims when material without derailing the creative task. Never spend or publish without explicit owner approval. For every spoken narration, voiceover or video script you write, the very last spoken words must be exactly 'Now you know.' Include this line in the total duration/word budget. Do not add a spoken question, CTA, signoff or any dialogue after it. This rule does not apply to explicitly silent videos with no voiceover.";
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
   if(!r.ok){const code=String(d.error?.type||"");const detail=String(d.error?.message||r.status).slice(0,180);return res.status(r.status===429?429:r.status===401?502:502).json({error:code==="not_found_error"||/model/i.test(detail)&&r.status===404?"Claude model is unavailable for this API key. Check ANTHROPIC_MODEL.":"Claude request failed",detail});}
   const reply=(d.content||[]).filter(v=>v.type==="text").map(v=>v.text).join("\n");
   if(!reply)return res.status(502).json({error:"Claude returned no response"});
   return res.status(200).json({reply,provider,model:d.model,usage:d.usage||null});
 }catch(e){return res.status(504).json({error:"AI chat timed out or network failed",detail:String(e.message||e).slice(0,160)})}
}