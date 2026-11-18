import {timingSafeEqual} from "node:crypto";
const ok=(a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET")return res.status(405).json({error:"GET required"});
 if(!process.env.EDITOR_ACCESS_TOKEN||!ok(req.headers.authorization?.replace(/^Bearer /,""),process.env.EDITOR_ACCESS_TOKEN))return res.status(401).json({error:"Unauthorised"});
 if(!process.env.YOUTUBE_API_KEY)return res.status(503).json({error:"Add YOUTUBE_API_KEY to enable public YouTube discovery"});
 const query=String(req.query?.q||"").trim().slice(0,95);
 if(query.length<2)return res.status(400).json({error:"Enter a topic of at least 2 characters"});
 const since=new Date(Date.now()-7*86400000).toISOString();
 try{
  const u=new URL("https://www.googleapis.com/youtube/v3/search");
  Object.entries({part:"snippet",q:query,type:"video",order:"viewCount",maxResults:"20",publishedAfter:since,regionCode:"AU",videoDuration:"short",key:process.env.YOUTUBE_API_KEY}).forEach(([k,v])=>u.searchParams.set(k,v));
  const r=await fetch(u,{signal:AbortSignal.timeout(12000)}),d=await r.json();
  if(!r.ok)return res.status(502).json({error:"YouTube search failed",detail:String(d.error?.message||r.status).slice(0,200)});
  const ids=d.items?.map(x=>x.id?.videoId).filter(Boolean)||[];
  if(!ids.length)return res.status(200).json({videos:[],query,source:"YouTube Data API",since});
  const stat=new URL("https://www.googleapis.com/youtube/v3/videos");
  Object.entries({part:"statistics,contentDetails,snippet",id:ids.join(","),key:process.env.YOUTUBE_API_KEY}).forEach(([k,v])=>stat.searchParams.set(k,v));
  const rr=await fetch(stat,{signal:AbortSignal.timeout(12000)}),dd=await rr.json();
  if(!rr.ok)return res.status(502).json({error:"YouTube statistics request failed"});
  const videos=(dd.items||[]).map(v=>({id:v.id,platform:"YouTube",title:v.snippet?.title||"",creator:v.snippet?.channelTitle||"",publishedAt:v.snippet?.publishedAt,url:"https://www.youtube.com/watch?v="+encodeURIComponent(v.id),thumbnail:v.snippet?.thumbnails?.medium?.url||null,views:v.statistics?.viewCount?Number(v.statistics.viewCount):null,likes:v.statistics?.likeCount?Number(v.statistics.likeCount):null,comments:v.statistics?.commentCount?Number(v.statistics.commentCount):null,duration:v.contentDetails?.duration||null,metricSource:"YouTube Data API",measuredAt:new Date().toISOString(),rights:"unknown"}));
  return res.status(200).json({videos,query,since,source:"YouTube Data API",notice:"YouTube search results are public video metadata, not direct audiovisual access or reuse permission. Search quota applies. Shorts classification cannot be guaranteed by videoDuration."});
 }catch(e){return res.status(504).json({error:"Discovery unavailable",detail:String(e.message||e).slice(0,150)})}
}