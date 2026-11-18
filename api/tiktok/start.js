import {randomBytes,createHmac,timingSafeEqual} from "node:crypto";
function eq(a,b){if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
export default function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST")return res.status(405).json({error:"POST required"});
 const studio=process.env.EDITOR_ACCESS_TOKEN,client=process.env.TIKTOK_CLIENT_KEY,secret=process.env.TIKTOK_CLIENT_SECRET,enc=process.env.TIKTOK_TOKEN_ENCRYPTION_KEY;
 if(!studio||!eq(req.headers.authorization?.replace(/^Bearer /,""),studio))return res.status(401).json({error:"Studio access token required"});
 if(!client||!secret)return res.status(503).json({error:"Configure TikTok Sandbox Client Key and a NEW rotated Client Secret in Vercel"});
 if(!process.env.SUPABASE_URL||!(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY)||!enc)return res.status(503).json({error:"Configure Supabase and TIKTOK_TOKEN_ENCRYPTION_KEY before authorisation"});
 const state=randomBytes(32).toString("hex"),deadline=Date.now()+600000,payload=state+"."+deadline;
 const signature=createHmac("sha256",secret).update(payload).digest("hex");
 res.setHeader("Set-Cookie","tiktok_oauth_state="+encodeURIComponent(payload+"."+signature)+"; Path=/api/tiktok; HttpOnly; Secure; SameSite=Lax; Max-Age=600");
 const redirect="https://social-and-campaign-manager.vercel.app/api/tiktok/callback";
 const u=new URL("https://www.tiktok.com/v2/auth/authorize/");
 for(const [k,v] of Object.entries({client_key:client,response_type:"code",scope:"user.info.basic,video.upload",redirect_uri:redirect,state}))u.searchParams.set(k,v);
 return res.status(200).json({authorizationUrl:u.toString(),redirectUri:redirect,sandboxExpected:true,scopes:["user.info.basic","video.upload"]});
}