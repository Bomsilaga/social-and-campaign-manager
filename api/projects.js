import { timingSafeEqual } from "node:crypto";
const ok=(a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
const respond=(res,code,error,detail)=>res.status(code).json({error, ...(detail?{detail}: {})});
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(!process.env.EDITOR_ACCESS_TOKEN||!ok(req.headers.authorization?.replace(/^Bearer /,""),process.env.EDITOR_ACCESS_TOKEN))return respond(res,401,"Unauthorised");
 const root=process.env.SUPABASE_URL,secret=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
 if(!root||!secret)return respond(res,503,"Supabase project storage is not configured");
 let base;
 try{base=new URL(root);if(base.protocol!=="https:"||!base.hostname.endsWith(".supabase.co"))throw Error("Invalid Supabase project URL")}catch{return respond(res,500,"Invalid SUPABASE_URL. Use your project's https://*.supabase.co address")}
 const target=new URL("/rest/v1/video_projects",base);
 const headers={apikey:secret,Authorization:"Bearer "+secret,"Content-Type":"application/json"};
 try{
 if(req.method==="GET"){
  target.searchParams.set("select","id,title,created_at,updated_at,payload");target.searchParams.set("order","updated_at.desc");target.searchParams.set("limit","30");
  const r=await fetch(target,{headers,signal:AbortSignal.timeout(12000)});const d=await r.json().catch(()=>({}));
  if(!r.ok)return respond(res,502,"Supabase read failed","Ensure the provided migration has been run.");
  return res.status(200).json({projects:d});
 }
 if(req.method==="POST"){
  const title=String(req.body?.title||"Untitled draft").slice(0,120),payload=req.body?.payload;
  if(!payload||typeof payload!=="object"||Array.isArray(payload))return respond(res,400,"Provide a valid manifest object");
  if(JSON.stringify(payload).length>90000)return respond(res,413,"Manifest too large");
  headers.Prefer="return=representation";
  const r=await fetch(target,{method:"POST",headers,body:JSON.stringify({title,payload}),signal:AbortSignal.timeout(12000)});const d=await r.json().catch(()=>({}));
  if(!r.ok)return respond(res,502,"Supabase write failed",String(d.message||"Run the migration and verify server-side credentials").slice(0,180));
  return res.status(201).json({project:d[0]||null});
 }
 return respond(res,405,"GET or POST required");
 }catch(e){return respond(res,504,"Project storage request failed",String(e.message||e).slice(0,150))}
}