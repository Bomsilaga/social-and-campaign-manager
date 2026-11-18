import {timingSafeEqual,createDecipheriv,createCipheriv,randomBytes} from "node:crypto";
const eq=(a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
function encrypt(key,data){const iv=randomBytes(12),c=createCipheriv("aes-256-gcm",key,iv);const enc=Buffer.concat([c.update(JSON.stringify(data),"utf8"),c.final()]);return Buffer.concat([iv,c.getAuthTag(),enc]).toString("base64")}
function decrypt(key,value){const raw=Buffer.from(value,"base64"),iv=raw.subarray(0,12),tag=raw.subarray(12,28),d=createDecipheriv("aes-256-gcm",key,iv);d.setAuthTag(tag);return JSON.parse(Buffer.concat([d.update(raw.subarray(28)),d.final()]).toString("utf8"))}
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET")return res.status(405).json({error:"GET required"});
 if(!process.env.EDITOR_ACCESS_TOKEN||!eq(req.headers.authorization?.replace(/^Bearer /,""),process.env.EDITOR_ACCESS_TOKEN))return res.status(401).json({error:"Studio access token required"});
 const base=process.env.SUPABASE_URL,dbkey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,encoded=process.env.TIKTOK_TOKEN_ENCRYPTION_KEY;
 if(!base||!dbkey||!encoded)return res.status(503).json({error:"TikTok vault is not configured"});
 try{
 const key=Buffer.from(encoded,"base64");if(key.length!==32)return res.status(500).json({error:"Invalid encryption-key length"});
 const u=new URL("/rest/v1/tiktok_connections?id=eq.sandbox-primary&select=encrypted_credentials,connected_at,scopes,open_id",base);
 const r=await fetch(u,{headers:{apikey:dbkey,Authorization:"Bearer "+dbkey},signal:AbortSignal.timeout(12000)});
 if(!r.ok)return res.status(503).json({error:"TikTok storage is unavailable. Run the TikTok SQL migration."});
 const rows=await r.json();if(!rows.length)return res.status(200).json({connected:false,notice:"No TikTok account has been authorised yet"});
 const row=rows[0],tokens=decrypt(key,row.encrypted_credentials);
 if(Date.now()>(new Date(tokens.expires_at).getTime()-120000)){
  if(!tokens.refresh_token)return res.status(401).json({error:"TikTok session expired. Reconnect your account."});
  const renew=await fetch("https://open.tiktokapis.com/v2/oauth/token/",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_key:process.env.TIKTOK_CLIENT_KEY||"",client_secret:process.env.TIKTOK_CLIENT_SECRET||"",grant_type:"refresh_token",refresh_token:tokens.refresh_token}),signal:AbortSignal.timeout(15000)});
  const next=await renew.json().catch(()=>({}));
  if(!renew.ok||!next.access_token)return res.status(401).json({error:"TikTok authorisation expired. Reconnect the sandbox account."});
  Object.assign(tokens,{access_token:next.access_token,refresh_token:next.refresh_token||tokens.refresh_token,expires_at:new Date(Date.now()+Number(next.expires_in||7200)*1000).toISOString(),refresh_expires_at:new Date(Date.now()+Number(next.refresh_expires_in||15552000)*1000).toISOString(),scope:next.scope||tokens.scope});
  const up=new URL("/rest/v1/tiktok_connections?id=eq.sandbox-primary",base);
  const saved=await fetch(up,{method:"PATCH",headers:{apikey:dbkey,Authorization:"Bearer "+dbkey,"Content-Type":"application/json"},body:JSON.stringify({encrypted_credentials:encrypt(key,tokens),scopes:tokens.scope})});
  if(!saved.ok)return res.status(503).json({error:"Token refreshed but could not be stored securely. Retry or reconnect."});
 }
 const url=new URL("https://open.tiktokapis.com/v2/user/info/");url.searchParams.set("fields","open_id,display_name,avatar_url");
 const rr=await fetch(url,{headers:{Authorization:"Bearer "+tokens.access_token},signal:AbortSignal.timeout(12000)});
 const info=await rr.json().catch(()=>({}));
 if(!rr.ok||info.error?.code&&info.error.code!=="ok")return res.status(502).json({error:"TikTok profile lookup failed. Check Sandbox access and granted scopes."});
 return res.status(200).json({connected:true,profile:{displayName:info.data?.user?.display_name||"TikTok user",avatarUrl:info.data?.user?.avatar_url||null,openId:info.data?.user?.open_id||row.open_id},scopes:tokens.scope.split(",").filter(Boolean),connectedAt:row.connected_at,uploadEnabled:false,publishingEnabled:false});
 }catch(e){return res.status(503).json({error:"Unable to read authorised TikTok account. Verify encrypted vault and credentials."})}
}