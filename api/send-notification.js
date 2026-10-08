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


  async function sendPush(title,message,priority="high",tags="incoming_envelope"){
    const topic=process.env.NTFY_TOPIC||"hummiebear-orders-7f4c9e2a6d1b8f35";
    try{
      const headers={"Title":title,"Priority":priority,"Tags":tags,"Click":"https://www.hummiebear.be/bestellingen.html","Content-Type":"text/plain; charset=utf-8"};
      if(process.env.NTFY_TOKEN)headers.Authorization="Bearer "+process.env.NTFY_TOKEN;
      const r=await fetch("https://ntfy.sh/"+encodeURIComponent(topic),{method:"POST",headers,body:message});
      if(!r.ok)console.error("ntfy push failed:",r.status,await r.text());
    }catch(error){console.error("ntfy push error:",error);}
  }

  const clean=(v,max=5000)=>String(v??"").trim().slice(0,max);
  const body=typeof req.body==="object"&&req.body?req.body:{};
  const type=clean(body.type,40);
  if(type!=="quote"&&type!=="order"){
    return res.status(400).json({error:"Invalid notification type"});
  }

  const payload=body.data&&typeof body.data==="object"?body.data:{};
  const key=process.env.RESEND_API_KEY;
  const from=process.env.RESEND_FROM_EMAIL||"Hummie Bear <info@hummiebear.be>";
  const notificationRecipients=(process.env.HUMMIEBEAR_NOTIFICATION_EMAILS||"info@berthsammy.be,yoran.berth1@gmail.com").split(",").map(v=>v.trim()).filter(Boolean);

  if(!key||!from){
    console.error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL");
    return res.status(500).json({error:"Email service is not configured"});
  }

  const subject=type==="quote"
    ? "Nieuwe offerteaanvraag – Hummie Bear"
    : "Nieuwe betaalde webshopbestelling – Hummie Bear";

  const lines=[type==="quote"?"NIEUWE OFFERTEAANVRAAG":"NIEUWE WEBSHOPBESTELLING",""];
  for(const [keyName,value] of Object.entries(payload)){
    if(value===null||value===undefined||value==="")continue;
    if(Array.isArray(value)){
      lines.push(keyName+": "+value.map(v=>typeof v==="object"?JSON.stringify(v):String(v)).join(", "));
    }else if(typeof value==="object"){
      lines.push(keyName+": "+JSON.stringify(value,null,2));
    }else{
      lines.push(keyName+": "+String(value));
    }
  }

  try{
    const pushTitle=type==="quote"?"Nieuwe offerteaanvraag":"Nieuwe betaalde webshopbestelling";
    const pushMessage=type==="quote"
      ? "Er is een nieuwe offerteaanvraag binnengekomen. Open het dashboard voor de details."
      : "Er is een nieuwe betaalde webshopbestelling binnengekomen. Open het dashboard voor de details.";
    await sendPush(pushTitle,pushMessage,"high",type==="quote"?"memo":"money_with_wings");

    const response=await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{
        "Authorization":"Bearer "+key,
        "Content-Type":"application/json",
        "Accept":"application/json"
      },
      body:JSON.stringify({
        from,
        to:notificationRecipients,
        subject,
        text:lines.join("\n"),
        reply_to:clean(payload.customer_email||payload.email||"")
      })
    });

    const result=await response.json().catch(()=>({}));
    if(!response.ok){
      console.error("Resend notification failed:",response.status,result);
      return res.status(502).json({error:"Email could not be sent"});
    }

    return res.status(200).json({success:true,id:result.id||null});
  }catch(error){
    console.error("Resend notification error:",error);
    return res.status(500).json({error:"Email service unavailable"});
  }
}
