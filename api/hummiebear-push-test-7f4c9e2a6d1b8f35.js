export default async function handler(req,res){
  if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
  const topic=process.env.NTFY_TOPIC||"hummiebear-orders-7f4c9e2a6d1b8f35";
  try{
    const headers={"Title":"Hummie Bear TEST","Priority":"max","Tags":"bell","Click":"https://www.hummiebear.be/bestellingen.html","Content-Type":"text/plain; charset=utf-8"};
    if(process.env.NTFY_TOKEN)headers.Authorization="Bearer "+process.env.NTFY_TOKEN;
    const r=await fetch("https://ntfy.sh/"+encodeURIComponent(topic),{method:"POST",headers,body:"Dit is een testmelding van Hummie Bear. Als je deze melding ziet, werkt de pushkoppeling."});
    const body=await r.text();
    if(!r.ok)return res.status(502).json({success:false,status:r.status,response:body});
    return res.status(200).json({success:true,message:"Test push verstuurd naar ntfy."});
  }catch(error){
    console.error(error);
    return res.status(500).json({success:false,error:String(error?.message||error)});
  }
}
