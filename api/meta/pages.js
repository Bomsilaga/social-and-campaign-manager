import {createDecipheriv,timingSafeEqual} from "node:crypto";
const eq=(a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET")return res.status(405).json({error:"GET required"});
 if(!process.env.EDITOR_ACCESS_TOKEN||!eq(req.headers.authorization?.replace(/^Bearer /,""),process.env.EDITOR_ACCESS_TOKEN))return res.status(401).json({error:"Studio access token required"});
 const dbkey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,base=process.env.SUPABASE_URL,encoded=process.env.META_TOKEN_ENCRYPTION_KEY;
 if(!dbkey||!base||!encoded)return res.status(503).json({error:"Meta token vault is not configured"});
 try{
 const u=new URL("/rest/v1/meta_connections?id=eq.primary&select=encrypted_user_token,connected_at",base);
 const r=await fetch(u,{headers:{apikey:dbkey,Authorization:"Bearer "+dbkey},signal:AbortSignal.timeout(12000)});
 if(!r.ok)return res.status(503).json({error:"Meta vault unavailable; run Supabase schema"});
 const data=await r.json();if(!data.length)return res.status(200).json({connected:false,pages:[]});
 const raw=Buffer.from(data[0].encrypted_user_token,"base64"),key=Buffer.from(encoded,"base64");
 if(key.length!==32||raw.length<29)throw Error("Invalid encrypted token");
 const decipher=createDecipheriv("aes-256-gcm",key,raw.subarray(0,12));decipher.setAuthTag(raw.subarray(12,28));const token=Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]).toString("utf8");
 const api=new URL("https://graph.facebook.com/v25.0/me/accounts");api.searchParams.set("fields","id,name,tasks,category");api.searchParams.set("limit","100");
 const rr=await fetch(api,{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(12000)}),resp=await rr.json();
 if(!rr.ok)return res.status(502).json({error:"Meta Pages request failed; reconnect if the token is expired or Page access changed",detail:String(resp.error?.message||"").slice(0,140)});
 return res.status(200).json({connected:true,connectedAt:data[0].connected_at,pages:(resp.data||[]).map(p=>({id:p.id,name:p.name,category:p.category,tasks:p.tasks||[]})),notice:"Read-only Page selection. Publishing is disabled."});
 }catch(e){return res.status(503).json({error:"Could not retrieve Facebook Pages; check Meta credentials and encrypted vault"})}
}