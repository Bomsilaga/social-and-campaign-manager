import {timingSafeEqual} from "node:crypto";
const ok=(a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET")return res.status(405).json({error:"GET required"});
 if(!process.env.EDITOR_ACCESS_TOKEN||!ok(req.headers.authorization?.replace(/^Bearer /,""),process.env.EDITOR_ACCESS_TOKEN))return res.status(401).json({error:"Unauthorised"});
 if(!process.env.PIXABAY_API_KEY)return res.status(503).json({error:"Configure PIXABAY_API_KEY"});
 const q=String(req.query?.q||"").trim().slice(0,90);
 if(q.length<2)return res.status(400).json({error:"Enter a search term"});
 try{
  const u=new URL("https://pixabay.com/api/videos/");u.searchParams.set("key",process.env.PIXABAY_API_KEY);u.searchParams.set("q",q);u.searchParams.set("per_page","8");
  const r=await fetch(u,{signal:AbortSignal.timeout(12000)}),d=await r.json().catch(()=>({}));
  if(!r.ok)return res.status(502).json({error:"Pixabay returned "+r.status});
  return res.status(200).json({provider:"Pixabay",licence:"https://pixabay.com/service/license-summary/",videos:(d.hits||[]).map(x=>({id:x.id,url:x.pageURL,thumbnail:x.videos?.tiny?.thumbnail||null,creator:x.user||"Pixabay contributor",duration:x.duration,clipUrl:x.videos?.medium?.url||x.videos?.small?.url||null}))});
 }catch(e){return res.status(504).json({error:"Pixabay lookup failed",detail:String(e.message||e).slice(0,150)})}
}