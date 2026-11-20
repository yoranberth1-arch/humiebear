export default async function handler(req,res){
  if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({ok:false});}
  const key=String(process.env.MOLLIE_API_KEY||"")
    .replace(/^\uFEFF/,"").trim()
    .replace(/^Bearer\s+/i,"")
    .replace(/^(['"])(.*)\1$/s,"$2")
    .replace(/\s+/g,"");
  if(!key)return res.status(503).json({ok:false,reason:"missing_key"});
  try{
    const r=await fetch("https://api.mollie.com/v2/methods?locale=nl_BE",{
      headers:{Authorization:"Bearer "+key,Accept:"application/json"}
    });
    if(!r.ok)return res.status(502).json({ok:false,mollieStatus:r.status});
    const data=await r.json().catch(()=>({}));
    return res.status(200).json({ok:true,enabledMethods:Number(data.count)||0});
  }catch(error){
    return res.status(502).json({ok:false,reason:"mollie_unreachable"});
  }
}