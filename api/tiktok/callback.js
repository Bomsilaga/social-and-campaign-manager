import {createHmac,timingSafeEqual,randomBytes,createCipheriv} from "node:crypto";
const eq=(a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
const esc=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const render=(res,status,title,message)=>{
 res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","text/html; charset=utf-8");
 return res.status(status).send('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><body style="background:#081527;color:#eff7ff;font-family:system-ui;padding:45px 20px;max-width:690px;margin:auto"><h1>'+esc(title)+'</h1><p>'+esc(message)+'</p><a style="color:#54dcfa" href="/#tiktok">Return to TikTok Connection Centre</a></body></html>')
};
export default async function handler(req,res){
 res.setHeader("Set-Cookie","tiktok_oauth_state=; Path=/api/tiktok; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
 if(req.method!=="GET")return render(res,405,"TikTok connection","GET required.");
 if(req.query?.error)return render(res,400,"TikTok connection","Authorisation was cancelled or declined. You can retry from the studio.");
 const secret=process.env.TIKTOK_CLIENT_SECRET,client=process.env.TIKTOK_CLIENT_KEY,encoded=process.env.TIKTOK_TOKEN_ENCRYPTION_KEY;
 const dbkey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,base=process.env.SUPABASE_URL;
 const raw=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("tiktok_oauth_state="))?.slice("tiktok_oauth_state=".length);
 let cookie="";try{cookie=decodeURIComponent(raw||"")}catch{return render(res,400,"Session error","Invalid authorisation session. Restart from the studio.")}
 const [state,deadline,sig]=cookie.split(".");
 if(!secret||!state||!deadline||!sig||!eq(sig,createHmac("sha256",secret).update(state+"."+deadline).digest("hex"))||Number(deadline)<Date.now()||String(req.query?.state||"")!==state)return render(res,400,"Session error","OAuth state is missing, expired or invalid. Restart from the studio.");
 if(!client||!encoded||!base||!dbkey)return render(res,503,"TikTok setup incomplete","The encrypted token vault or TikTok settings are not configured.");
 let key;try{key=Buffer.from(encoded,"base64");if(key.length!==32)throw Error("length")}catch{return render(res,500,"Encryption setup error","TIKTOK_TOKEN_ENCRYPTION_KEY must be base64 for exactly 32 random bytes.")}
 const code=String(req.query?.code||"");if(!code||code.length>2500)return render(res,400,"TikTok connection","TikTok did not supply a valid code.");
 try{
 const body=new URLSearchParams({client_key:client,client_secret:secret,code,grant_type:"authorization_code",redirect_uri:"https://social-and-campaign-manager.vercel.app/api/tiktok/callback"});
 const r=await fetch("https://open.tiktokapis.com/v2/oauth/token/",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body,signal:AbortSignal.timeout(18000)});
 const d=await r.json().catch(()=>({}));
 if(!r.ok||!d.access_token||!d.open_id)return render(res,502,"TikTok connection failed","TikTok declined token exchange. Confirm the Sandbox credentials, exact redirect URI and target-user permissions.");
 // Store both access and rotating refresh tokens encrypted at rest; never return them to the browser.
 const tokenData={access_token:d.access_token,refresh_token:d.refresh_token,expires_at:new Date(Date.now()+Number(d.expires_in||7200)*1000).toISOString(),refresh_expires_at:new Date(Date.now()+Number(d.refresh_expires_in||15552000)*1000).toISOString(),scope:d.scope||"",open_id:d.open_id};
 const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key,iv);
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(tokenData),"utf8"),cipher.final()]);
 const ciphertext=Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString("base64");
 const u=new URL("/rest/v1/tiktok_connections?on_conflict=id",base);
 const rr=await fetch(u,{method:"POST",headers:{apikey:dbkey,Authorization:"Bearer "+dbkey,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({id:"sandbox-primary",encrypted_credentials:ciphertext,open_id:d.open_id,scopes:d.scope||"",connected_at:new Date().toISOString()}),signal:AbortSignal.timeout(15000)});
 if(!rr.ok)return render(res,502,"TikTok vault error","TikTok authorised your account but secure storage failed. Run the TikTok migration and try again.");
 return render(res,200,"TikTok Sandbox connected","Your authorisation was saved securely. Return to the application and click Check TikTok connection. Nothing has been uploaded or published.");
 }catch(e){return render(res,504,"TikTok connection failed","A network or provider error interrupted the process. Try again after checking configuration.")}
}