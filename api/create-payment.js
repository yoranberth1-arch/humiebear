export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","https://www.hummiebear.be");
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type,Accept");
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const SUPABASE_URL="https://yrcajvpstbyupohjbavm.supabase.co";
  const clean=(v,max=255)=>String(v??"").trim().slice(0,max);
  const round=v=>Math.round((Number(v)+Number.EPSILON)*100)/100;
  const validGrams=v=>Number.isInteger(Number(v))&&Number(v)>=100&&Number(v)<=5000&&Number(v)%100===0;
  const DEAL_PRICES=new Map(Object.entries({"Zoete Snoepbox 500 g":7.95,"Zoete Snoepbox 1 kg":15.9,"Zoete Snoepbox 1,5 kg":23.75,"Zoete Snoepbox 2 kg":31.5,"Zure Snoepbox 500 g":7.95,"Zure Snoepbox 1 kg":15.9,"Zure Snoepbox 1,5 kg":23.75,"Zure Snoepbox 2 kg":31.5,"Zoet & Zuur Mix 500 g":7.95,"Zoet & Zuur Mix 1 kg":15.9,"Zoet & Zuur Mix 1,5 kg":23.75,"Zoet & Zuur Mix 2 kg":31.5}));
  async function sb(path,options={}){
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!key)throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
    const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{...options,headers:{"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json","Accept":"application/json",...(options.headers||{})}});
    const text=await r.text();let body=null;try{body=text?JSON.parse(text):null}catch{}
    if(!r.ok)throw new Error(body?.message||body?.hint||text||"Supabase request failed.");
    return body;
  }
  function parseBody(v){if(v&&typeof v==="object")return v;try{return JSON.parse(v||"{}")}catch{return{}}}
  function calcItem(item){
    const meta=item&&typeof item.meta==="object"&&item.meta?item.meta:null;
    const qty=Number(item?.quantity);
    if(!Number.isInteger(qty)||qty<1||qty>100)throw new Error("Ongeldige hoeveelheid in de bestelling.");
    if(meta?.type==="deal"){
      const name=clean(meta.dealName,120),price=DEAL_PRICES.get(name);
      if(price==null)throw new Error("Ongeldige voordeelbox.");
      return{name,quantity:qty,unit_price:price,line_total:round(price*qty),grams:validGrams(item?.grams)?Number(item.grams):null,meta:{type:"deal",dealName:name}};
    }
    if(meta?.type==="gift-box"){
      const size=Number(meta.size);if(!validGrams(size))throw new Error("Ongeldig snoepdoosformaat.");
      const price=round(3.5+(size/100)*1.70);
      return{name:"Gepersonaliseerde snoepdoos",quantity:qty,unit_price:price,line_total:round(price*qty),grams:size,meta:{type:"gift-box",size,sticker:clean(meta.sticker,120),note:clean(meta.note,500)}};
    }
    if(meta?.type==="personalized-bag"){
      const size=Number(meta.size);if(!validGrams(size))throw new Error("Ongeldig snoepzakformaat.");
      const price=round((size/100)*1.70);
      return{name:"Gepersonaliseerde snoepzak",quantity:qty,unit_price:price,line_total:round(price*qty),grams:size,meta:{type:"personalized-bag",size,sticker:clean(meta.sticker,120),note:clean(meta.note,500),selections:Array.isArray(item?.customMix)?item.customMix.slice(0,20).map(x=>({name:clean(x?.name,100),grams:validGrams(x?.grams)?Number(x.grams):0})):[]}};
    }
    const grams=Number(item?.grams);if(!validGrams(grams))throw new Error("Ongeldig snoepgewicht.");
    const price=round((grams/100)*1.70);
    return{name:clean(item?.name,120)||clean(item?.id,120)||"Schepsnoep",product_id:clean(item?.id,120),quantity:qty,unit_price:price,line_total:round(price*qty),grams,meta:null};
  }
  try{
    const apiKey=process.env.MOLLIE_API_KEY;
    if(!apiKey)return res.status(500).json({error:"MOLLIE_API_KEY is not configured."});
    const body=parseBody(req.body),customer=body.customer||{},inputItems=body.items;
    if(!Array.isArray(inputItems)||!inputItems.length||inputItems.length>50)return res.status(400).json({error:"De bestelling is ongeldig of leeg."});
    const name=clean(customer.name,120),email=clean(customer.email,180).toLowerCase(),phone=clean(customer.phone,50),street=clean(customer.street,120),number=clean(customer.houseNumber,30),postal=clean(customer.postalCode,20),city=clean(customer.city,100),country=clean(customer.country||"BE",10).toUpperCase();
    if(!name)return res.status(400).json({error:"Vul je naam in."});
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:"Vul een geldig e-mailadres in."});
    if(!phone)return res.status(400).json({error:"Vul je telefoonnummer in."});
    if(!street||!number||!postal||!city)return res.status(400).json({error:"Vul je volledige leveradres in."});
    const items=inputItems.map(calcItem),subtotal=round(items.reduce((sum,x)=>sum+x.line_total,0));
    let discount=0,discountCode="";
    const requested=clean(body.discountCode,40).toUpperCase();
    if(requested==="SWEET10"){
      const prior=await sb("orders?select=id&customer_email=eq."+encodeURIComponent(email)+"&payment_status=eq.paid&limit=1");
      if(prior?.length)return res.status(400).json({error:"SWEET10 is alleen geldig voor een eerste bestelling."});
      discount=round(subtotal*0.10);discountCode="SWEET10";
    }else if(requested){return res.status(400).json({error:"Deze promotiecode bestaat niet."})}
    const afterDiscount=round(subtotal-discount),shipping=afterDiscount>=55?0:5.95,total=round(afterDiscount+shipping);
    if(total<=0)return res.status(400).json({error:"Het bestelbedrag is ongeldig."});
    const origin=process.env.PUBLIC_SITE_URL||"https://www.hummiebear.be";
    const orderId="HB-"+Date.now()+"-"+Math.random().toString(36).slice(2,8).toUpperCase();
    const order={id:orderId,customer_name:name,customer_email:email,customer_phone:phone,delivery_street:street,delivery_number:number,delivery_postal_code:postal,delivery_city:city,delivery_country:country,items,subtotal,discount,discount_code:discountCode||null,shipping,total,payment_status:"open",fulfillment_status:"new",confirmation_email_status:"pending",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    await sb("orders",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(order)});
    let payment;
    try{
      payment=await fetch("https://api.mollie.com/v2/payments",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({amount:{currency:"EUR",value:total.toFixed(2)},description:"Hummie Bear bestelling "+orderId,redirectUrl:origin+"/payment-success.html?order="+encodeURIComponent(orderId),cancelUrl:origin+"/payment-cancelled.html?order="+encodeURIComponent(orderId),webhookUrl:origin+"/api/mollie-webhook",metadata:{order_id:orderId}})});
    }catch(error){
      await sb("orders?id=eq."+encodeURIComponent(orderId),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({payment_status:"creation_failed",updated_at:new Date().toISOString()})}).catch(()=>{});
      throw error;
    }
    const data=await payment.json().catch(()=>({}));
    if(!payment.ok){
      await sb("orders?id=eq."+encodeURIComponent(orderId),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({payment_status:"creation_failed",updated_at:new Date().toISOString()})}).catch(()=>{});
      return res.status(payment.status||500).json({error:data.detail||"Mollie kon de betaling niet aanmaken."});
    }
    await sb("orders?id=eq."+encodeURIComponent(orderId),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({payment_id:data.id,payment_status:data.status||"open",updated_at:new Date().toISOString()})});
    return res.status(200).json({orderId,paymentId:data.id,status:data.status,checkoutUrl:data._links?.checkout?.href||null,total});
  }catch(error){console.error(error);return res.status(500).json({error:error.message||"Er ging iets mis bij het starten van de betaling."});}
}