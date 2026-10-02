import crypto from "node:crypto";

const SUPABASE_URL="https://yrcajvpstbyupohjbavm.supabase.co";
const ALLOWED=["new","processing","shipped","completed","cancelled"];

function sign(payload,secret){return crypto.createHmac("sha256",secret).update(payload).digest("base64url");}
function verifyToken(token,secret){
  const parts=String(token||"").split(".");
  if(parts.length!==2)return false;
  const [payload,sig]=parts;
  if(sign(payload,secret)!==sig)return false;
  try{const data=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));return data.sub==="orders-admin"&&Number(data.exp)>Date.now()}catch{return false}
}
async function sb(path,options={}){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{...options,headers:{"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json","Accept":"application/json",...(options.headers||{})}});
  const text=await r.text();let body=null;try{body=text?JSON.parse(text):null}catch{}
  if(!r.ok)throw new Error(body?.message||body?.hint||text||"Supabase request failed.");
  return body;
}
function auth(req){
  const secret=process.env.ADMIN_ORDERS_SECRET;
  if(!secret)return false;
  const header=String(req.headers?.authorization||"");
  return header.startsWith("Bearer ")&&verifyToken(header.slice(7),secret);
}
export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","https://www.hummiebear.be");
  res.setHeader("Access-Control-Allow-Methods","GET,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Authorization,Content-Type,Accept");
  if(req.method==="OPTIONS")return res.status(204).end();
  if(!auth(req))return res.status(401).json({error:"Niet ingelogd."});
  try{
    if(req.method==="GET"){
      const limit=Math.min(Math.max(Number(req.query?.limit||100),1),200);
      const data=await sb("orders?select=*&order=created_at.desc&limit="+limit);
      return res.status(200).json({orders:data||[]});
    }
    if(req.method==="PATCH"){
      const body=req.body&&typeof req.body==="object"?req.body:{};
      const id=String(body.id||"").trim();const status=String(body.fulfillment_status||"").trim();
      if(!id||!ALLOWED.includes(status))return res.status(400).json({error:"Ongeldige bestelling of status."});
      const data=await sb("orders?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=representation"},body:JSON.stringify({fulfillment_status:status,updated_at:new Date().toISOString()})});
      return res.status(200).json({order:data?.[0]||null});
    }
    return res.status(405).json({error:"Method not allowed"});
  }catch(error){console.error(error);return res.status(500).json({error:error.message||"Er ging iets mis."});}
}