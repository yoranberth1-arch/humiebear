import crypto from "node:crypto";
const SUPABASE_URL="https://yrcajvpstbyupohjbavm.supabase.co";
const API_ORIGIN="https://www.hummiebear.be";
const ALLOWED=["new","preparing","ready","shipped","completed","cancelled"];
function sign(payload,secret){return crypto.createHmac("sha256",secret).update(payload).digest("base64url");}
function verifyToken(token,secret){
  const [payload,sig]=String(token||"").split(".");
  if(!payload||!sig||sign(payload,secret)!==sig)return false;
  try{const data=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));return data.sub==="orders-admin"&&Number(data.exp)>Date.now()}catch{return false}
}
async function sb(path,options={}){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{...options,headers:{apikey:key,Authorization:"Bearer "+key,Content-Type:"application/json",Accept:"application/json",...(options.headers||{})}});
  const text=await r.text();let body=null;try{body=text?JSON.parse(text):null}catch{}
  if(!r.ok)throw new Error(body?.message||body?.hint||text||"Supabase request failed.");
  return body;
}
async function getSecret(){return (await sb("web_admin_credentials?select=token_secret&id=eq.true&limit=1"))?.[0]?.token_secret||""}
export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin",API_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods","GET,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Authorization,Content-Type,Accept");
  if(req.method==="OPTIONS")return res.status(204).end();
  try{
    const secret=await getSecret(),header=String(req.headers?.authorization||"");
    if(!secret||!header.startsWith("Bearer ")||!verifyToken(header.slice(7),secret))return res.status(401).json({error:"Niet ingelogd."});
    if(req.method==="GET"){
      const limit=Math.min(Math.max(Number(req.query?.limit||200),1),200);
      const orders=await sb("orders?select=*&order=created_at.desc&limit="+limit);
      const ids=(orders||[]).map(o=>o.id).filter(Boolean);
      let items=[];
      if(ids.length)items=await sb("order_items?select=*&order_id=in.("+ids.map(encodeURIComponent).join(",")+")&order=created_at.asc");
      const grouped=new Map();
      for(const item of items||[]){if(!grouped.has(item.order_id))grouped.set(item.order_id,[]);grouped.get(item.order_id).push(item)}
      return res.status(200).json({orders:(orders||[]).map(o=>({...o,items:grouped.get(o.id)||[]}))});
    }
    if(req.method==="PATCH"){
      const id=String(req.body?.id||"").trim(),status=String(req.body?.status||"").trim();
      if(!id||!ALLOWED.includes(status))return res.status(400).json({error:"Ongeldige bestelling of status."});
      const data=await sb("orders?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=representation"},body:JSON.stringify({status,updated_at:new Date().toISOString()})});
      return res.status(200).json({order:data?.[0]||null});
    }
    return res.status(405).json({error:"Method not allowed"});
  }catch(error){console.error(error);return res.status(500).json({error:error.message||"Er ging iets mis."})}
}