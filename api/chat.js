import { timingSafeEqual } from "node:crypto";
const equal=(a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
const system=[
 "You are Boma Studio Director, the creative producer inside Boma Social and Campaign Manager. You write in natural Australian English and you get things made.",
 "ACT, DO NOT STALL. When the owner asks you to make, create, build, produce or 'carry on' with a reel, video, short or image post, call the build_production tool straight away with a complete plan. Choose sensible defaults for anything unspecified (platform, tone, handle, music) and state them in one line. Never ask permission to start, never end with a menu of options, and ask a question only if the request cannot be attempted at all.",
 "WHAT HAPPENS WHEN YOU CALL build_production: the studio itself generates the ElevenLabs voiceover from your narration, finds licensed stock clips for 'stock' scenes, generates original AI images for 'image' scenes, lays every scene on the timeline with your captions and durations, and attaches the audio. The owner then previews it and presses Render. So do not tell the owner to record audio, run commands, call an API, or use CapCut, Canva or any outside editor, and do not paste code, SVG, SRT files or curl commands.",
 "PLAN QUALITY: narration is spoken words only, about 2.3 words per second of total duration. Scene durations must add up to the target duration. Captions are short on-screen lines (under 90 characters). Use 'stock' for real-world footage with a plain 2-4 word search query (e.g. 'tram wheels rails'); use 'image' with a detailed prompt for diagrams, concepts or anything stock is unlikely to have; use 'card' only for the end card. Keep facts accurate and generic rather than inventing statistics, names or sources.",
 "YOUR TEXT REPLY alongside a build must be brief: at most five short lines saying what is being built and any assumption or fact the owner should check. Do not repeat the script or scene list; the studio shows them.",
 "If the owner asks for a revision after a build ('change the ending', 'make it 30 seconds'), call build_production again with the full updated plan.",
 "For work that is text only (post copy, campaign plans, scripts explicitly requested as text), write the finished copy directly and concisely without calling the tool.",
 "Be honest about limits in one sentence at most, and only when relevant: you cannot publish to social platforms, and the final video file is rendered in the owner's browser when they press Render. Never discuss servers, workers, environment settings or internal infrastructure."
].join("\n");
const buildTool={name:"build_production",description:"Build the reel/video/image post now in the studio: generates voiceover, sources or generates visuals, and assembles the editable timeline. Call this whenever the owner wants something made.",parameters:{type:"object",properties:{
 title:{type:"string",description:"Short project title"},
 headline:{type:"string",description:"Small persistent overlay line at the top of the video, max 58 characters"},
 cta:{type:"string",description:"Closing call to action, max 55 characters"},
 narration:{type:"string",description:"Complete voiceover, spoken words only, no timecodes or stage directions. Max 1500 characters."},
 post_caption:{type:"string",description:"Ready-to-post caption with hashtags for the platform"},
 scenes:{type:"array",minItems:1,maxItems:24,items:{type:"object",properties:{
  caption:{type:"string",description:"On-screen caption for this scene"},
  seconds:{type:"number",description:"Scene length in seconds"},
  visual:{type:"string",enum:["stock","image","card"]},
  stock_query:{type:"string",description:"2-4 word stock video search, required for visual=stock"},
  image_prompt:{type:"string",description:"Detailed prompt for an original image; required for visual=image, and recommended as a fallback for visual=stock"}
 },required:["caption","seconds","visual"]}}
},required:["title","narration","scenes"]}};
const str=(v,n)=>String(v??"").trim().slice(0,n);
function cleanPlan(raw){
 if(!raw||typeof raw!=="object"||!Array.isArray(raw.scenes))return null;
 const scenes=raw.scenes.slice(0,24).map(x=>({caption:str(x?.caption,250),seconds:Math.min(120,Math.max(1,Math.round((Number(x?.seconds)||4)*2)/2)),visual:["stock","image","card"].includes(x?.visual)?x.visual:"card",stock_query:str(x?.stock_query,90),image_prompt:str(x?.image_prompt,1500)})).filter(x=>x.caption||x.stock_query||x.image_prompt);
 const narration=str(raw.narration,1600);
 if(!scenes.length)return null;
 return {title:str(raw.title,120)||"Untitled production",headline:str(raw.headline,58),cta:str(raw.cta,55),narration,post_caption:str(raw.post_caption,10000),scenes};
}
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
 const context="Project type: "+kind+". Studio settings: "+JSON.stringify({format:String(req.body?.format||"9:16").slice(0,15),targetDurationSeconds:Math.min(600,Math.max(5,Number(req.body?.duration)||30)),audience:String(req.body?.audience||"").slice(0,200)});
 try{
   if(provider==="openai"){
     if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"OPENAI_API_KEY is not configured"});
     const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:"Bearer "+process.env.OPENAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_TEXT_MODEL||"gpt-5-mini",instructions:system+"\n"+context,input:clean.map(m=>({role:m.role,content:m.content})),tools:[{type:"function",strict:false,...buildTool}],max_output_tokens:9000,store:false}),signal:AbortSignal.timeout(110000)});
     const d=await r.json().catch(()=>({}));
     if(!r.ok)return res.status(502).json({error:"OpenAI request failed",detail:String(d.error?.message||r.status).slice(0,180)});
     const reply=d.output_text||d.output?.flatMap(i=>i.content||[]).filter(v=>v.type==="output_text").map(v=>v.text).join("\n")||"";
     let plan=null;
     const call=(d.output||[]).find(i=>i.type==="function_call"&&i.name==="build_production");
     if(call){try{plan=cleanPlan(JSON.parse(call.arguments))}catch{}}
     if(!reply&&!plan)return res.status(502).json({error:d.status==="incomplete"?"The AI ran out of room before finishing. Try again or shorten the request.":"OpenAI returned no response"});
     return res.status(200).json({reply,plan,provider,model:d.model,usage:d.usage||null});
   }
   if(!process.env.ANTHROPIC_API_KEY||!process.env.ANTHROPIC_MODEL)return res.status(503).json({error:"Claude API configuration is incomplete"});
   const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","Content-Type":"application/json"},body:JSON.stringify({model:process.env.ANTHROPIC_MODEL,max_tokens:6000,system:system+"\n"+context,messages:clean,tools:[{name:buildTool.name,description:buildTool.description,input_schema:buildTool.parameters}]}),signal:AbortSignal.timeout(110000)});
   const d=await r.json().catch(()=>({}));
   if(!r.ok)return res.status(502).json({error:"Claude request failed",detail:String(d.error?.message||r.status).slice(0,180)});
   const reply=(d.content||[]).filter(v=>v.type==="text").map(v=>v.text).join("\n");
   const plan=cleanPlan((d.content||[]).find(v=>v.type==="tool_use"&&v.name==="build_production")?.input);
   if(!reply&&!plan)return res.status(502).json({error:"Claude returned no response"});
   return res.status(200).json({reply,plan,provider,model:d.model,usage:d.usage||null});
 }catch(e){return res.status(504).json({error:"AI chat timed out or network failed",detail:String(e.message||e).slice(0,160)})}
}