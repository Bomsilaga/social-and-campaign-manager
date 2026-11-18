import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
const equal=(a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
export default function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST")return res.status(405).json({error:"POST required"});
 const secret=process.env.EDITOR_ACCESS_TOKEN,client=process.env.META_APP_ID,appSecret=process.env.META_APP_SECRET;
 if(!secret||!equal(req.headers.authorization?.replace(/^Bearer /,""),secret))return res.status(401).json({error:"Studio access token required"});
 if(!client||!appSecret)return res.status(503).json({error:"Add META_APP_ID and META_APP_SECRET in Vercel"});
 if(!process.env.SUPABASE_URL||!(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY)||!process.env.META_TOKEN_ENCRYPTION_KEY)return res.status(503).json({error:"Configure Supabase project vault and META_TOKEN_ENCRYPTION_KEY first. See setup instructions."});
 const site=process.env.PUBLIC_APP_URL||"https://social-and-campaign-manager.vercel.app";
 if(site!=="https://social-and-campaign-manager.vercel.app")return res.status(500).json({error:"PUBLIC_APP_URL must match the approved production domain"});
 const state=randomBytes(32).toString("hex"),expires=Date.now()+600000;
 const payload=state+"."+expires;
 const sig=createHmac("sha256",appSecret).update(payload).digest("hex");
 res.setHeader("Set-Cookie","meta_oauth_state="+encodeURIComponent(payload+"."+sig)+"; Path=/api/meta; HttpOnly; Secure; SameSite=Lax; Max-Age=600");
 const uri=new URL("https://www.facebook.com/v25.0/dialog/oauth");
 uri.searchParams.set("client_id",client);
 uri.searchParams.set("redirect_uri",site+"/api/meta/callback");
 uri.searchParams.set("response_type","code");
 uri.searchParams.set("scope","pages_show_list,pages_read_engagement,pages_manage_posts");
 uri.searchParams.set("state",state);
 return res.status(200).json({authorizationUrl:uri.toString(),callbackUrl:site+"/api/meta/callback"});
}