export default async function handler(req,res){
  if(req.method!=="POST"){
    res.setHeader("Allow","POST");
    return res.status(405).json({error:"Method not allowed"});
  }

  const allowedOrigin=new Set(["https://hummiebear.be","https://www.hummiebear.be"]);
  const origin=req.headers.origin;
  if(origin&&allowedOrigin.has(origin)){
    res.setHeader("Access-Control-Allow-Origin",origin);
    res.setHeader("Vary","Origin");
  }

  const clean=(v,max=5000)=>String(v??"").trim().slice(0,max);
  const body=typeof req.body==="object"&&req.body?req.body:{};

  const type=clean(body.type,40);
  if(type!=="quote"&&type!=="order"){
    return res.status(400).json({error:"Invalid notification type"});
  }

  const payload=body.data&&typeof body.data==="object"?body.data:{};
  const subject=type==="quote"
    ? "Nieuwe offerteaanvraag – Hummie Bear"
    : "Nieuwe betaalde webshopbestelling – Hummie Bear";

  const lines=[];
  lines.push(type==="quote"?"NIEUWE OFFERTEAANVRAAG":"NIEUWE WEBSHOPBESTELLING");
  lines.push("");
  for(const [key,value] of Object.entries(payload)){
    if(value===null||value===undefined||value==="")continue;
    if(Array.isArray(value)){
      lines.push(key+": "+value.map(v=>typeof v==="object"?JSON.stringify(v):String(v)).join(", "));
    }else if(typeof value==="object"){
      lines.push(key+": "+JSON.stringify(value,null,2));
    }else{
      lines.push(key+": "+String(value));
    }
  }

  try{
    const response=await fetch("https://formsubmit.co/ajax/hummiebearbusiness@gmail.com",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Accept":"application/json"
      },
      body:JSON.stringify({
        _subject:subject,
        _template:"table",
        name:clean(payload.customer_name||payload.name||"Hummie Bear",200),
        email:clean(payload.customer_email||payload.email||"",200),
        message:lines.join("\n")
      })
    });

    const text=await response.text();
    let result={};
    try{result=text?JSON.parse(text):{}}catch{}

    if(!response.ok||result.success===false){
      console.error("Email notification failed:",response.status,text);
      return res.status(502).json({error:"Email could not be sent"});
    }

    return res.status(200).json({success:true});
  }catch(error){
    console.error("Email notification error:",error);
    return res.status(500).json({error:"Email service unavailable"});
  }
}
