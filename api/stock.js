export default async function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET") return res.status(405).json({error:"GET required"});
  const configured=process.env.EDITOR_ACCESS_TOKEN;
  if(!configured) return res.status(503).json({error:"Set EDITOR_ACCESS_TOKEN in Vercel environment variables to enable protected stock search."});
  if(req.headers.authorization !== "Bearer "+configured) return res.status(401).json({error:"Invalid studio access token."});
  const key=process.env.PEXELS_API_KEY;
  if(!key) return res.status(503).json({error:"Add PEXELS_API_KEY in Vercel to enable stock-video discovery."});
  const q=String(req.query?.q||"").trim().slice(0,90);
  if(q.length<2) return res.status(400).json({error:"Enter a search term of at least 2 characters."});
  try {
    const u=new URL("https://api.pexels.com/videos/search");
    u.searchParams.set("query",q);u.searchParams.set("per_page","8");u.searchParams.set("size","medium");
    const p=await fetch(u,{headers:{Authorization:key},signal:AbortSignal.timeout(12000)});
    if(!p.ok) return res.status(502).json({error:"Stock provider returned "+p.status});
    const data=await p.json();
    const videos=(data.videos||[]).map(v=>{
      const candidates=(v.video_files||[]).filter(f=>f.file_type==="video/mp4"&&f.link);
      candidates.sort((a,b)=>Math.abs((a.width||1000)-720)-Math.abs((b.width||1000)-720));
      return {id:v.id,url:v.url,thumbnail:v.image,duration:v.duration,creator:v.user?.name||"Pexels contributor",width:v.width,height:v.height,clipUrl:candidates[0]?.link||null};
    });
    return res.status(200).json({provider:"Pexels",query:q,licence:"https://www.pexels.com/license/",videos});
  } catch(e){return res.status(502).json({error:"Stock lookup unavailable",detail:String(e?.message||e).slice(0,150)})}
}