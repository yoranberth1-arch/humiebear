export default async function handler(req,res){
  if(req.method!=="GET")return res.status(405).json({ok:false,reason:"method_not_allowed"});
  const apiKey=String(process.env.MOLLIE_API_KEY||"")
    .replace(/^\uFEFF/,"").trim().replace(/^Bearer\s+/i,"")
    .replace(/^(['"])(.*)\1$/s,"$2").replace(/\s+/g,"");
  if(!apiKey)return res.status(503).json({ok:false,reason:"missing_key"});
  try{
    const response=await fetch("https://api.mollie.com/v2/methods?locale=nl_BE",{
      headers:{Authorization:"Bearer "+apiKey,Accept:"application/json"}
    });
    return res.status(response.ok?200:503).json({
      ok:response.ok,
      reason:response.ok?"accepted":"rejected",
      mollieStatus:response.status
    });
  }catch{
    return res.status(502).json({ok:false,reason:"connection_error"});
  }
}
