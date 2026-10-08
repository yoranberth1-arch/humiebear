export default async function handler(req,res){
  if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).send("Method not allowed");}
  const SUPABASE_URL="https://yrcajvpstbyupohjbavm.supabase.co";
  const clean=v=>String(v??"").trim();

  async function sb(path,options={}){
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!key)throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
    const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{...options,headers:{"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json","Accept":"application/json",...(options.headers||{})}});
    const text=await r.text();let body=null;try{body=text?JSON.parse(text):null}catch{}
    if(!r.ok)throw new Error(body?.message||body?.hint||text||"Supabase request failed.");
    return body;
  }

  function parseBody(v){
    if(v&&typeof v==="object")return v;
    if(typeof v==="string"){
      try{return JSON.parse(v)}catch{}
      try{return Object.fromEntries(new URLSearchParams(v).entries())}catch{}
    }
    return{};
  }


  async function sendPush(title,message,priority="max",tags="money_with_wings"){
    const topic=process.env.NTFY_TOPIC||"hummiebear-orders-7f4c9e2a6d1b8f35";
    try{
      const headers={"Title":title,"Priority":priority,"Tags":tags,"Click":"https://www.hummiebear.be/bestellingen.html","Content-Type":"text/plain; charset=utf-8"};
      if(process.env.NTFY_TOKEN)headers.Authorization="Bearer "+process.env.NTFY_TOKEN;
      const r=await fetch("https://ntfy.sh/"+encodeURIComponent(topic),{method:"POST",headers,body:message});
      if(!r.ok)console.error("ntfy push failed:",r.status,await r.text());
    }catch(error){console.error("ntfy push error:",error);}
  }

  async function sendConfirmation(order,items){
    const key=process.env.RESEND_API_KEY;
    const from=process.env.RESEND_FROM_EMAIL;
    if(!key||!from)throw new Error("RESEND_API_KEY or RESEND_FROM_EMAIL is not configured.");

    const rows=(items||[]).map(i=>`<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${String(i.product_name||"Artikel")} × ${Number(i.quantity||1)}${i.meta?.grams?" · "+String(i.meta.grams)+" g":""}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${new Intl.NumberFormat("nl-BE",{style:"currency",currency:"EUR"}).format(Number(i.line_total)||0)}</td></tr>`).join("");
    const total=new Intl.NumberFormat("nl-BE",{style:"currency",currency:"EUR"}).format(Number(order.total)||0);
    const discount=Number(order.discount_amount||0)>0?`<p style="margin:6px 0;color:#27744a">Korting ${clean(order.discount_code)}: − ${new Intl.NumberFormat("nl-BE",{style:"currency",currency:"EUR"}).format(Number(order.discount_amount))}</p>`:"";
    const fullName=[order.customer_first_name,order.customer_last_name].filter(Boolean).join(" ");
    const html=`<!doctype html><html><body style="margin:0;background:#fbf3ea;font-family:Arial,sans-serif;color:#38261f"><div style="max-width:620px;margin:30px auto;background:#fff;border:1px solid #eaded5;border-radius:22px;overflow:hidden"><div style="padding:30px;text-align:center;background:linear-gradient(180deg,#fff7fb,#fff)"><div style="font-weight:900;letter-spacing:.14em;font-size:11px;color:#d86092">HUMMIE BEAR</div><h1 style="font-size:30px;margin:10px 0">Bedankt voor je bestelling!</h1><p style="color:#786f68;margin:0">Dag ${clean(fullName)}, je bestelling <strong>${clean(order.order_number)}</strong> is ontvangen.</p></div><div style="padding:26px"><h2 style="font-size:18px">Bestellingsoverzicht</h2><table style="width:100%;border-collapse:collapse;font-size:13px"><tbody>${rows}</tbody></table>${discount}<div style="display:flex;justify-content:space-between;margin-top:14px;font-weight:900;font-size:17px"><span>Totaal</span><strong>${total}</strong></div><h2 style="font-size:18px;margin-top:28px">Leveradres</h2><p style="color:#786f68;line-height:1.6">${clean(order.shipping_street)} ${clean(order.shipping_house_number)}<br>${clean(order.shipping_postal_code)} ${clean(order.shipping_city)}<br>${clean(order.shipping_country||"BE")}</p><p style="margin-top:24px;color:#786f68;font-size:12px">We houden je op de hoogte wanneer je bestelling wordt verwerkt.</p></div></div></body></html>`;

    const notificationRecipients=(process.env.HUMMIEBEAR_NOTIFICATION_EMAILS||"info@berthsammy.be,yoran.berth1@gmail.com").split(",").map(v=>v.trim()).filter(Boolean);
    const r=await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{
        "Authorization":"Bearer "+key,
        "Content-Type":"application/json",
        "Accept":"application/json",
        "Idempotency-Key":"hummie-order-"+order.order_number
      },
      body:JSON.stringify({
        from,
        to:[order.customer_email],
        bcc:notificationRecipients,
        subject:"Hummie Bear – bestelling "+order.order_number+" ontvangen",
        html
      })
    });
    const body=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(body?.message||"Bevestigingsmail kon niet worden verzonden.");
    return body;
  }

  try{
    const apiKey=process.env.MOLLIE_API_KEY;
    if(!apiKey)return res.status(500).send("Server configuration error");

    const body=parseBody(req.body);
    if(body.type==="hook.ping"||body.eventType==="hook.ping")return res.status(200).send("OK");

    let paymentId=body.id;
    if(body.resource==="event"||String(body.id||"").startsWith("event_")||String(body.type||"").startsWith("payment.")){
      paymentId=body.entityId||body._embedded?.entity?.id||body.data?.id||paymentId;
    }
    paymentId=paymentId||req.query?.id;
    if(typeof paymentId!=="string"||!/^tr_[A-Za-z0-9]+$/.test(paymentId))return res.status(400).send("Missing or invalid payment ID");

    const response=await fetch("https://api.mollie.com/v2/payments/"+encodeURIComponent(paymentId),{headers:{Authorization:"Bearer "+apiKey,Accept:"application/json"}});
    if(!response.ok)return res.status(502).send("Could not verify payment");

    const payment=await response.json();
    let metadata=payment.metadata;
    if(typeof metadata==="string"){try{metadata=JSON.parse(metadata)}catch{metadata={}}}
    const orderNumber=clean(metadata?.order_number);
    if(!orderNumber)return res.status(200).send("OK");

    const rows=await sb("orders?select=*&order_number=eq."+encodeURIComponent(orderNumber)+"&limit=1");
    const order=Array.isArray(rows)?rows[0]:null;
    if(!order)return res.status(404).send("Order not found");

    const status=String(payment.status||"");
    const update={payment_reference:payment.id,mollie_status:status,updated_at:new Date().toISOString()};
    if(status==="paid"){update.payment_status="paid";update.status="new";update.paid_at=payment.paidAt||new Date().toISOString();}
    else if(["failed","canceled","expired"].includes(status)){update.payment_status="failed";update.status="cancelled";}
    else update.payment_status="pending";
    await sb("orders?id=eq."+encodeURIComponent(order.id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify(update)});

    if(status==="paid"&&!order.confirmation_email_sent_at){
      const items=await sb("order_items?select=*&order_id=eq."+encodeURIComponent(order.id)+"&order=created_at.asc");
      try{
        await sendConfirmation({...order,...update,payment_status:"paid"},items||[]);
      await sendPush(
        "Bestelling betaald",
        "Bestelling "+order.order_number+" is betaald: €"+Number(order.total||0).toFixed(2)+". Open het dashboard voor de details.",
        "max",
        "money_with_wings"
      );

        await sb("orders?id=eq."+encodeURIComponent(order.id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({confirmation_email_sent_at:new Date().toISOString(),confirmation_email_status:"sent",email_error:null,updated_at:new Date().toISOString()})});
      }catch(emailError){
        console.error("Confirmation email failed:",emailError);
        await sb("orders?id=eq."+encodeURIComponent(order.id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({confirmation_email_status:"failed",email_error:String(emailError.message||emailError).slice(0,500),updated_at:new Date().toISOString()})}).catch(()=>{});
      }
    }
    return res.status(200).send("OK");
  }catch(error){
    console.error("Mollie webhook error:",error);
    return res.status(500).send("Webhook error");
  }
}