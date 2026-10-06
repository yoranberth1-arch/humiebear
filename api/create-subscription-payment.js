export default async function handler(req,res){
  const allowedOrigins=new Set(["https://hummiebear.be","https://www.hummiebear.be"]);
  const origin=req.headers.origin;
  if(origin&&allowedOrigins.has(origin)){res.setHeader("Access-Control-Allow-Origin",origin);res.setHeader("Vary","Origin");}
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type,Accept");
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});

  const SUPABASE_URL="https://yrcajvpstbyupohjbavm.supabase.co";
  const clean=(v,max=500)=>String(v??"").trim().slice(0,max);
  const parseBody=v=>{if(v&&typeof v==="object")return v;try{return JSON.parse(v||"{}")}catch{return{}}};
  const sb=async(path,options={})=>{
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
    const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{...options,headers:{"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json","Accept":"application/json",...(options.headers||{})}});
    const t=await r.text();let b=null;try{b=t?JSON.parse(t):null}catch{}
    if(!r.ok)throw new Error(b?.message||b?.hint||t||"Supabase request failed.");return b;
  };

  try{
    const apiKey=process.env.MOLLIE_API_KEY;
    if(!apiKey)return res.status(500).json({error:"MOLLIE_API_KEY is not configured."});
    const body=parseBody(req.body),customer=body.customer||{},plan=clean(body.plan,20);
    const weights={
      "500":{name:"500 g",grams:500,amount:12.95},
      "1000":{name:"1 kg",grams:1000,amount:19.95},
      "1500":{name:"1,5 kg",grams:1500,amount:29.95}
    };
    const frequencies={
      weekly:{label:"Elke week",interval:"1 week"},
      biweekly:{label:"Elke 2 weken",interval:"2 weeks"},
      monthly:{label:"Elke maand",interval:"1 month"}
    };
    const weight=weights[String(customer.weight||"")],frequency=frequencies[clean(customer.frequency,20)];
    if(!weight)return res.status(400).json({error:"Kies een geldig gewicht."});
    if(!frequency)return res.status(400).json({error:"Kies een geldige leverfrequentie."});
    if(!["surprise","favorites","sour"].includes(customer.style))return res.status(400).json({error:"Kies een geldige boxvoorkeur."});

    const name=clean(customer.name,120),email=clean(customer.email,180).toLowerCase();
    if(!name)return res.status(400).json({error:"Vul je naam in."});
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:"Vul een geldig e-mailadres in."});
    if(!clean(customer.address,200)||!clean(customer.postalCode,20)||!clean(customer.city,100))return res.status(400).json({error:"Vul je volledige leveradres in."});

    const firstName=name.split(/\s+/)[0],lastName=name.split(/\s+/).slice(1).join(" ");
    const mollieCustomerResponse=await fetch("https://api.mollie.com/v2/customers",{
      method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json",Accept:"application/json"},
      body:JSON.stringify({name,email,locale:"nl_BE",metadata:{source:"hummiebear_subscription"}})
    });
    const mollieCustomer=await mollieCustomerResponse.json().catch(()=>({}));
    if(!mollieCustomerResponse.ok)throw new Error(mollieCustomer.detail||"Mollie kon de klant niet aanmaken.");

    const originSite=process.env.PUBLIC_SITE_URL||"https://www.hummiebear.be";
    const metadata={
      type:"hummiebear_subscription_first_payment",
      plan:weight.grams===1500?"plus":weight.grams===1000?"sweet":"custom",
      plan_name:"Hummie Bear Sweet Club",
      delivery_price:weight.amount.toFixed(2),
      weight_grams:String(weight.grams),
      frequency:clean(customer.frequency,20),
      frequency_label:frequency.label,
      mollie_interval:frequency.interval,
      minimum_deliveries:"3",
      customer_id:mollieCustomer.id,
      first_name:firstName,last_name:lastName,email,
      phone:clean(customer.phone,50),address:clean(customer.address,200),
      postal_code:clean(customer.postalCode,20),city:clean(customer.city,100),
      style:clean(customer.style,30),avoid:clean(customer.avoid,500)
    };

    const paymentResponse=await fetch("https://api.mollie.com/v2/payments",{
      method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json",Accept:"application/json"},
      body:JSON.stringify({
        amount:{currency:"EUR",value:weight.amount.toFixed(2)},
        customerId:mollieCustomer.id,sequenceType:"first",
        description:"Hummie Bear Sweet Club – "+weight.name+" – "+frequency.label,
        redirectUrl:originSite+"/subscription-success.html",
        cancelUrl:originSite+"/subscription-cancelled.html",
        webhookUrl:originSite+"/api/mollie-webhook",
        metadata
      })
    });
    const payment=await paymentResponse.json().catch(()=>({}));
    if(!paymentResponse.ok)throw new Error(payment.detail||"Mollie kon de eerste betaling niet aanmaken.");

    await sb("subscriptions",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({
      mollie_customer_id:mollieCustomer.id,
      mollie_payment_id:payment.id,
      plan:metadata.plan,
      plan_name:metadata.plan_name,
      monthly_price:weight.amount,
      frequency:clean(customer.frequency,20),
      frequency_label:frequency.label,
      mollie_interval:frequency.interval,
      weight_grams:weight.grams,
      delivery_price:weight.amount,
      minimum_deliveries:3,
      deliveries_completed:0,
      customer_first_name:firstName,customer_last_name:lastName,customer_email:email,
      customer_phone:clean(customer.phone,50),shipping_address:clean(customer.address,200),
      shipping_postal_code:clean(customer.postalCode,20),shipping_city:clean(customer.city,100),
      shipping_country:"BE",box_style:clean(customer.style,30),avoid:clean(customer.avoid,500),
      status:"pending",payment_status:"pending"
    })});

    return res.status(200).json({paymentId:payment.id,checkoutUrl:payment._links?.checkout?.href||null});
  }catch(error){
    console.error("Subscription payment error:",error);
    return res.status(500).json({error:error.message||"Er ging iets mis bij het starten van het abonnement."});
  }
}