import {timingSafeEqual} from "node:crypto";
const equal=(a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
const instructions=[
"You are a senior short-form video producer for Boma AI who engineers Reels, TikToks and Shorts for retention and shares. Return ONLY one valid JSON object, no markdown and no commentary. Write natural, punchy Australian English. Never invent statistics, quotes, names or technical claims; keep facts general and accurate.",
"VIRAL STRUCTURE (apply all of it):",
"1) HOOK IN THE FIRST 1-3 SECONDS. The narration's first sentence is the hook: 12 words or fewer, a surprising claim, a question or a curiosity gap that makes people stay for the answer (e.g. 'Trams have no steering wheel. So how do they turn?'). Never open with greetings, 'Did you know', the channel name or throat-clearing. Scene 1 must be the most striking, motion-implying image in the set and its caption repeats the hook in 6 words or fewer.",
"2) OPEN LOOP, THEN PAYOFF. Pose the question first, deliver the answer in the final third, so viewers watch to the end. Every sentence must earn its place; no filler, no dead air, no recap.",
"3) FAST PACING. Change the visual every 2.5-4 seconds. Use 4-8 scenes depending on duration (about one scene per 3 seconds, minimum 4, maximum 8). Vary the shot: wide, close-up, detail, unusual angle, cutaway.",
"4) SPOKEN WORDS FIT THE TIME. About 2.4 words per second of total duration, so 20 seconds is roughly 44-50 words. Short sentences, concrete nouns, active verbs, conversational tone.",
"5) CAPTIONS FOR MUTED VIEWERS. Most people watch on mute, so each scene caption is the key phrase of what is being said at that moment, 8 words or fewer, high contrast, no hashtags or emoji clutter.",
"6) LOOPABLE ENDING. The last line should land the payoff and flow back into the hook (a callback or 'now watch it again' feel) so replays add watch time. The cta is a SEND/SAVE prompt, not 'like', e.g. 'Send this to someone who drives a tram'. Under 55 characters.",
"7) POST COPY. postCaption is the post text: line one is a keyword-rich hook, then one short value line, then a comment-bait question, then 3-5 specific hashtags (mix of niche and broad), no more. Under 400 characters.",
"VISUALS: each scene imagePrompt describes one actual visible vertical 9:16 photorealistic shot (subject, framing, lighting, mood, camera angle) that could be rendered as a documentary photograph, with no text, logos, brands or copyrighted characters in the image. Keep the same palette and style across scenes so the video feels cohesive.",
"OUTPUT FIELDS: title (string up to 70 chars), headline (string up to 58 chars, the on-screen hook), narration (string up to 1500 chars, spoken words only, no stage directions), cta (string), postCaption (string), scenes (array of 4 to 8 objects each with caption string up to 90 chars, imagePrompt string up to 800 chars, seconds number). Scene seconds should add up to the video duration."
].join("\n");
function check(plan,duration,silent){
 if(!plan||typeof plan!=="object"||!Array.isArray(plan.scenes)||plan.scenes.length<3||plan.scenes.length>10)throw Error("AI did not return a valid set of 4-8 scenes");
 const list=plan.scenes.slice(0,8);
 for(const s of list){if(typeof s.caption!=="string"||typeof s.imagePrompt!=="string"||s.imagePrompt.length<20)throw Error("Scene instructions are incomplete")}
 if(silent)plan.narration="";else if(typeof plan.narration!=="string"||plan.narration.length<20||plan.narration.length>1500)throw Error("Narration is invalid");
 let secs=list.map(s=>Math.max(1.5,Number(s.seconds)||duration/list.length));
 const sum=secs.reduce((a,b)=>a+b,0);
 secs=secs.map(v=>Math.max(1,Math.round(v*duration/sum*2)/2));
 secs[secs.length-1]=Math.max(1,Math.round((duration-secs.slice(0,-1).reduce((a,b)=>a+b,0))*2)/2);
 return {title:String(plan.title||"Original social Reel").slice(0,70),headline:String(plan.headline||"Something worth knowing").slice(0,58),cta:String(plan.cta||"Send this to a mate").slice(0,70),postCaption:String(plan.postCaption||"").slice(0,1500),narration:String(plan.narration||"").slice(0,1500),scenes:list.map((s,i)=>({caption:s.caption.slice(0,90),imagePrompt:s.imagePrompt.slice(0,800),seconds:secs[i]}))};
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
 const silent=req.body?.noNarration===true;
 const prompt=(silent?"NO NARRATION: this is a silent captions-only video. Set narration to an empty string; the hook and payoff must be carried entirely by punchy on-screen captions (6 words or fewer each) and visuals. ":"")+"Video duration: "+seconds+" seconds. Platform: "+String(req.body?.format||"9:16").slice(0,15)+". Reply with the JSON object only. Brief: "+brief;
 try{
  let text="";
  if(provider==="openai"){
   if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"OpenAI API key missing"});
   const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:"Bearer "+process.env.OPENAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_TEXT_MODEL||"gpt-5-mini",instructions,input:prompt,max_output_tokens:10000,text:{format:{type:"json_object"}},store:false}),signal:AbortSignal.timeout(100000)});
   const d=await r.json().catch(()=>({}));if(!r.ok)return res.status(502).json({error:"OpenAI planning failed",detail:String(d.error?.message||r.status).slice(0,180)});
   text=d.output_text||d.output?.flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("")||"";
  }else{
   if(!process.env.ANTHROPIC_API_KEY||!process.env.ANTHROPIC_MODEL)return res.status(503).json({error:"Claude API credentials missing"});
   const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","Content-Type":"application/json"},body:JSON.stringify({model:process.env.ANTHROPIC_MODEL,max_tokens:4000,system:instructions,messages:[{role:"user",content:prompt}]}),signal:AbortSignal.timeout(100000)});
   const d=await r.json().catch(()=>({}));if(!r.ok)return res.status(502).json({error:"Claude planning failed",detail:String(d.error?.message||r.status).slice(0,180)});
   text=(d.content||[]).filter(x=>x.type==="text").map(x=>x.text).join("");
  }
  let plan;const from=text.indexOf("{"),to=text.lastIndexOf("}");
  try{if(from<0||to<=from)throw Error("no JSON");plan=JSON.parse(text.slice(from,to+1))}catch{return res.status(502).json({error:text.trim()?"AI returned a Reel plan that could not be read; press retry":"AI ran out of room before writing the Reel plan; press retry",detail:text.trim().slice(0,160)})}
  try{plan=check(plan,seconds,silent)}catch(e){return res.status(502).json({error:"AI Reel plan was incomplete; press retry",detail:String(e.message).slice(0,150)})}
  return res.status(200).json({plan,duration:seconds,provider});
 }catch(e){return res.status(504).json({error:"Reel planning failed",detail:String(e.message||e).slice(0,150)})}
}
