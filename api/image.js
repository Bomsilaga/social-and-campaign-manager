export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST")return res.status(405).json({error:"POST required"});
  const secret=process.env.EDITOR_ACCESS_TOKEN;
  if(!secret)return res.status(503).json({error:"Add EDITOR_ACCESS_TOKEN to Vercel before enabling billable image generation."});
  if(req.headers.authorization!=="Bearer "+secret)return res.status(401).json({error:"Invalid studio access token."});
  if(process.env.ALLOW_PAID_GENERATION!=="true")return res.status(403).json({error:"Paid image generation is disabled. Set ALLOW_PAID_GENERATION=true only when you approve API usage."});
  const key=process.env.OPENAI_API_KEY;
  if(!key)return res.status(503).json({error:"OPENAI_API_KEY is not configured."});
  const prompt=typeof req.body?.prompt==="string"?req.body.prompt.trim():"";
  if(prompt.length<12||prompt.length>1800)return res.status(400).json({error:"Prompt must be 12–1800 characters."});
  try{
    const wrapped=prompt+"\nCinematic original visual asset, dramatic lighting, strong depth, single clear subject. No copyrighted characters, brand imitation, text or watermarks. Vertical scene.";
    const call=(model,size,extra)=>fetch("https://api.openai.com/v1/images/generations",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify({model,prompt:wrapped,size,n:1,...extra}),signal:AbortSignal.timeout(50000)});
    const primary=process.env.OPENAI_IMAGE_MODEL||"gpt-image-1";
    let usedModel=primary;
    let upstream=await call(primary,"1024x1536",{quality:"low"});
    let data=await upstream.json().catch(()=>({}));
    if(!upstream.ok&&upstream.status!==429&&primary!=="dall-e-3"){
      usedModel="dall-e-3";
      upstream=await call("dall-e-3","1024x1792",{response_format:"b64_json"});
      data=await upstream.json().catch(()=>({}));
    }
    if(!upstream.ok)return res.status(upstream.status===429?429:502).json({error:"Image provider error",detail:String(data?.error?.message||"Please verify model permissions and billing.").slice(0,250)});
    const b64=data?.data?.[0]?.b64_json;
    if(!b64)return res.status(502).json({error:"Provider did not return an image. Check image model and response format."});
    return res.status(200).json({image:"data:image/png;base64,"+b64,model:usedModel,billable:true});
  }catch(e){return res.status(504).json({error:"Image generation timed out or failed",detail:String(e?.message||e).slice(0,150)})}
}