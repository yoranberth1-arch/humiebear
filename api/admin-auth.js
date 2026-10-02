import crypto from "node:crypto";
const SUPABASE_URL="https://yrcajvpstbyupohjbavm.supabase.co";
const API_ORIGIN="https://www.hummiebear.be";

function b64url(v){return Buffer.from(v).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");}
function sign(payload,secret){return crypto.createHmac("sha256",secret).update(payload).digest("base64url");}
function verifyPin(pin,saltB64,hashB64){
  const salt=Buffer.from(String(saltB64),"base64url"),expected=Buffer.from(String(hashB64),"base64url");
  const actual=crypto.pbkdf2Sync(String(pin),salt,200000,expected.length,"sha256");
  return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);
}
async function sb(path){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{headers:{apikey:key,Authorization:"Bearer "+key,Accept:"application/json"}});
  const text=await r.text();let body=null;try{body=text?JSON.parse(text):null}catch{}
  if(!r.ok)throw new Error(body?.message||text||"Supabase request failed.");
  return body;
}
export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin",API_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type,Accept");
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  try{
    const row=(await sb("web_admin_credentials?select=pin_salt,pin_hash,token_secret&id=eq.true&limit=1"))?.[0];
    if(!row)return res.status(500).json({error:"Beheerderslogin is niet geconfigureerd."});
    const pin=String(req.body?.pin||"").trim();
    if(!verifyPin(pin,row.pin_salt,row.pin_hash))return res.status(401).json({error:"Onjuiste PIN."});
    const payload=b64url(JSON.stringify({sub:"orders-admin",exp:Date.now()+8*60*60*1000}));
    return res.status(200).json({token:payload+"."+sign(payload,row.token_secret),expiresIn:8*60*60});
  }catch(error){
    console.error(error);
    return res.status(500).json({error:error.message||"Aanmelden mislukt."});
  }
}