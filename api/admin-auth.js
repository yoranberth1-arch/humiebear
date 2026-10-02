import crypto from "node:crypto";

function b64url(value){return Buffer.from(value).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");}
function sign(payload,secret){return crypto.createHmac("sha256",secret).update(payload).digest("base64url");}

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","https://www.hummiebear.be");
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type,Accept");
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const pin=process.env.ADMIN_ORDERS_PIN;
  const secret=process.env.ADMIN_ORDERS_SECRET;
  if(!pin||!secret)return res.status(500).json({error:"Order dashboard is not configured."});
  const body=req.body&&typeof req.body==="object"?req.body:{};
  if(String(body.pin||"")!==String(pin))return res.status(401).json({error:"Onjuiste PIN."});
  const payload=b64url(JSON.stringify({sub:"orders-admin",exp:Date.now()+8*60*60*1000}));
  const token=payload+"."+sign(payload,secret);
  return res.status(200).json({token,expiresIn:8*60*60});
}