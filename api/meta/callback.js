import { createHmac, timingSafeEqual, createCipheriv, randomBytes } from "node:crypto";
const eq=(a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
function html(res,status,msg){
 res.setHeader("Content-Type","text/html; charset=utf-8");
 res.setHeader("Cache-Control","no-store");
 const esc=String(msg).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 return res.status(status).send('<!doctype html><html><meta charset="utf-8"><title>Facebook connection</title><body style="font:16px system-ui;background:#0b1426;color:#edf5ff;max-width:620px;margin:80px auto;padding:20px"><h1>Facebook Pages connection</h1><p>'+esc+'</p><p><a style="color:#67dfff" href="/">Return to Social and Campaign Manager</a></p></body></html>');
}
export default async function handler(req,res){
 res.setHeader("Set-Cookie","meta_oauth_state=; Path=/api/meta; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
 if(req.method!=="GET")return html(res,405,"GET required.");
 if(req.query?.error)return html(res,400,"Facebook connection was cancelled or denied.");
 const {META_APP_ID:client,META_APP_SECRET:secret,META_TOKEN_ENCRYPTION_KEY:encoded,SUPABASE_URL:base}=process.env;
 const dbkey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 const raw=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("meta_oauth_state="))?.split("=").slice(1).join("=");
 let cookie;try{cookie=decodeURIComponent(raw||"")}catch{return html(res,400,"Invalid authorisation session. Restart from the studio.")}
 const [state,time,sig]=cookie.split(".");
 if(!state||!time||!sig||!secret||!eq(sig,createHmac("sha256",secret).update(state+"."+time).digest("hex"))||Date.now()>Number(time)||req.query?.state!==state)return html(res,400,"The connection session expired or could not be verified. Restart from the studio.");
 if(!client||!encoded||!dbkey||!base)return html(res,503,"A secure server configuration is missing; no token has been saved.");
 let key;try{key=Buffer.from(encoded,"base64");if(key.length!==32)throw Error("wrong length")}catch{return html(res,500,"META_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.")}
 const code=String(req.query?.code||"");
 if(!code||code.length>2048)return html(res,400,"Facebook did not supply a valid authorisation code.");
 try{
 const redirect="https://social-and-campaign-manager.vercel.app/api/meta/callback";
 const exchange=new URL("https://graph.facebook.com/v25.0/oauth/access_token");
 for(const [k,v] of Object.entries({client_id:client,client_secret:secret,redirect_uri:redirect,code}))exchange.searchParams.set(k,v);
 const response=await fetch(exchange,{signal:AbortSignal.timeout(15000)}),data=await response.json();
 if(!response.ok||!data.access_token)return html(res,502,"Facebook token exchange failed. Check the exact callback URL, app credentials and developer permissions.");
 let token=data.access_token;
 const long=new URL("https://graph.facebook.com/v25.0/oauth/access_token");
 for(const [k,v] of Object.entries({grant_type:"fb_exchange_token",client_id:client,client_secret:secret,fb_exchange_token:token}))long.searchParams.set(k,v);
 const r2=await fetch(long,{signal:AbortSignal.timeout(15000)});const d2=await r2.json().catch(()=>({}));
 if(r2.ok&&d2.access_token)token=d2.access_token;
 const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key,iv);
 const encrypted=Buffer.concat([cipher.update(token,"utf8"),cipher.final()]);
 const payload={id:"primary",encrypted_user_token:Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString("base64"),connected_at:new Date().toISOString()};
 const u=new URL("/rest/v1/meta_connections?on_conflict=id",base);
 const sr=await fetch(u,{method:"POST",headers:{"Content-Type":"application/json",apikey:dbkey,Authorization:"Bearer "+dbkey,Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
 if(!sr.ok)return html(res,502,"Facebook authorised your account, but the encrypted connection could not be saved. Run the Supabase Meta schema and retry.");
 return html(res,200,"Facebook authorised successfully. Your access token was encrypted and saved on the server. Return to the studio and select Refresh Facebook Pages. No content has been published.");
 }catch(e){return html(res,504,"Facebook connection failed. Check the app configuration and try again.")}
}