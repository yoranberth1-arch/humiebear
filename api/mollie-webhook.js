export default async function handler(req,res){
  if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).send("Method not allowed");}
  const SUPABASE_URL="https://yrcajvpstbyupohjbavm.supabase.co";
  const clean=v=>String(v??"").trim();
  async function sb(path,options={}){
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
    const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{...options,headers:{"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json","Accept":"application/json",...(options.headers||{})}});
    const text=await r.text();let body=null;try{body=text?JSON.parse(text):null}catch{}
    if(!r.ok)throw new Error(body?.message||body?.hint||text||"Supabase request failed.");
    return body;
  }
  const parseBody=v=>{if(v&&typeof v==="object")return v;if(typeof v==="string"){try{return JSON.parse(v)}catch{}try{return Object.fromEntries(new URLSearchParams(v).entries())}catch{}}return{}};
  function addInterval(date,interval,times=1){
    const d=new Date(date);
    for(let i=0;i<times;i++){
      if(interval==="1 week")d.setDate(d.getDate()+7);
      else if(interval==="2 weeks")d.setDate(d.getDate()+14);
      else {const day=d.getDate();d.setMonth(d.getMonth()+1);if(d.getDate()<day)d.setDate(0);}
    }
    return d;
  }
  try{
    const apiKey=process.env.MOLLIE_API_KEY;if(!apiKey)return res.status(500).send("Server configuration error");
    const body=parseBody(req.body);
    if(body.type==="hook.ping"||body.eventType==="hook.ping")return res.status(200).send("OK");
    let paymentId=body.id;
    if(body.resource==="event"||String(body.id||"").startsWith("event_")||String(body.type||"").startsWith("payment."))paymentId=body.entityId||body._embedded?.entity?.id||body.data?.id||paymentId;
    paymentId=paymentId||req.query?.id;
    if(typeof paymentId!=="string"||!/^tr_[A-Za-z0-9]+$/.test(paymentId))return res.status(400).send("Missing or invalid payment ID");
    const response=await fetch("https://api.mollie.com/v2/payments/"+encodeURIComponent(paymentId),{headers:{Authorization:"Bearer "+apiKey,Accept:"application/json"}});
    if(!response.ok)return res.status(502).send("Could not verify payment");
    const payment=await response.json();
    let metadata=payment.metadata;
    if(typeof metadata==="string"){try{metadata=JSON.parse(metadata)}catch{metadata={}}}
    const status=String(payment.status||"");
    const isSubscriptionFirst=metadata?.type==="hummiebear_subscription_first_payment";

    // Subscription events are handled before ordinary webshop orders.
    if(isSubscriptionFirst){
      const subscriptions=await sb("subscriptions?select=*&mollie_payment_id=eq."+encodeURIComponent(payment.id)+"&limit=1");
      const row=Array.isArray(subscriptions)?subscriptions[0]:null;
      if(!row)return res.status(200).send("Subscription record not found");
      if(status==="paid"&&row.status!=="active"){
        if(row.mollie_subscription_id)return res.status(200).send("Already activated");
        const interval=String(metadata.mollie_interval||row.mollie_interval||"1 month");
        const price=Number(metadata.delivery_price||row.delivery_price||row.monthly_price);
        const start=addInterval(payment.paidAt||new Date(),interval,1);
        const subResponse=await fetch("https://api.mollie.com/v2/customers/"+encodeURIComponent(metadata.customer_id||row.mollie_customer_id)+"/subscriptions",{
          method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json",Accept:"application/json"},
          body:JSON.stringify({
            amount:{currency:"EUR",value:price.toFixed(2)},
            interval,
            startDate:start.toISOString().slice(0,10),
            description:"Hummie Bear Sweet Club – "+String(metadata.weight_grams||row.weight_grams)+" g – "+String(metadata.frequency_label||row.frequency_label||"periodiek"),
            webhookUrl:(process.env.PUBLIC_SITE_URL||"https://www.hummiebear.be")+"/api/mollie-webhook",
            metadata:{source:"hummiebear_subscription",subscription_row_id:String(row.id),frequency:String(metadata.frequency||row.frequency||""),weight_grams:String(metadata.weight_grams||row.weight_grams||""),email:String(metadata.email||row.customer_email||"")}
          })
        });
        const subscription=await subResponse.json().catch(()=>({}));
        if(!subResponse.ok)throw new Error(subscription.detail||"Mollie kon het terugkerende abonnement niet aanmaken.");
        const minEnd=addInterval(payment.paidAt||new Date(),interval,2);
        await sb("subscriptions?id=eq."+encodeURIComponent(row.id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({
          mollie_subscription_id:subscription.id,status:"active",payment_status:"paid",
          current_payment_id:payment.id,last_payment_status:"paid",last_payment_at:payment.paidAt||new Date().toISOString(),
          next_payment_at:subscription.nextPaymentDate||start.toISOString(),
          deliveries_completed:1,minimum_deliveries:3,minimum_end_at:minEnd.toISOString(),updated_at:new Date().toISOString()
        })});
      }else if(["failed","canceled","expired"].includes(status)){
        await sb("subscriptions?id=eq."+encodeURIComponent(row.id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({payment_status:"failed",status:"payment_failed",last_payment_status:status,updated_at:new Date().toISOString()})});
      }
      return res.status(200).send("OK");
    }

    if(payment.subscriptionId){
      const subscriptions=await sb("subscriptions?select=*&mollie_subscription_id=eq."+encodeURIComponent(payment.subscriptionId)+"&limit=1");
      const row=Array.isArray(subscriptions)?subscriptions[0]:null;
      if(row){
        let nextPaymentDate=null;
        const sr=await fetch("https://api.mollie.com/v2/customers/"+encodeURIComponent(row.mollie_customer_id)+"/subscriptions/"+encodeURIComponent(payment.subscriptionId),{headers:{Authorization:"Bearer "+apiKey,Accept:"application/json"}});
        if(sr.ok){const sub=await sr.json().catch(()=>({}));nextPaymentDate=sub.nextPaymentDate||null;}
        const update={current_payment_id:payment.id,last_payment_status:status,updated_at:new Date().toISOString()};
        if(nextPaymentDate)update.next_payment_at=nextPaymentDate;
        if(status==="paid"){
          update.payment_status="paid";
          update.last_payment_at=payment.paidAt||new Date().toISOString();
          update.deliveries_completed=Number(row.deliveries_completed||0)+1;
        }else if(["failed","canceled","expired"].includes(status)){
          update.payment_status="failed";
          update.status="payment_failed";
        }
        await sb("subscriptions?id=eq."+encodeURIComponent(row.id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify(update)});
      }
      return res.status(200).send("OK");
    }

    const orderNumber=clean(metadata?.order_number);
    if(!orderNumber)return res.status(200).send("OK");
    const rows=await sb("orders?select=*&order_number=eq."+encodeURIComponent(orderNumber)+"&limit=1");
    const order=Array.isArray(rows)?rows[0]:null;
    if(!order)return res.status(404).send("Order not found");
    const update={payment_reference:payment.id,mollie_status:status,updated_at:new Date().toISOString()};
    if(status==="paid"){update.payment_status="paid";update.status="new";update.paid_at=payment.paidAt||new Date().toISOString();}
    else if(["failed","canceled","expired"].includes(status)){update.payment_status="failed";update.status="cancelled";}
    else update.payment_status="pending";
    await sb("orders?id=eq."+encodeURIComponent(order.id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify(update)});
    return res.status(200).send("OK");
  }catch(error){
    console.error("Mollie webhook error:",error);
    return res.status(500).send("Webhook error");
  }
}