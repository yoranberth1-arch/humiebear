export default async function handler(req,res){
  const allowedOrigins=new Set(["https://hummiebear.be","https://www.hummiebear.be"]);
  const requestOrigin=req.headers.origin;
  if(requestOrigin&&allowedOrigins.has(requestOrigin)){
    res.setHeader("Access-Control-Allow-Origin",requestOrigin);
    res.setHeader("Vary","Origin");
  }
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type,Accept");
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});

  const SUPABASE_URL="https://yrcajvpstbyupohjbavm.supabase.co";
  const clean=(v,max=255)=>String(v??"").trim().slice(0,max);
  const round=v=>Math.round((Number(v)+Number.EPSILON)*100)/100;
  const validGrams=v=>Number.isInteger(Number(v))&&Number(v)>=100&&Number(v)<=5000&&Number(v)%100===0;
  const DEAL_PRICES=new Map(Object.entries({
    "Zoete Snoepbox 500 g":7.95,"Zoete Snoepbox 1 kg":15.90,"Zoete Snoepbox 1,5 kg":23.75,"Zoete Snoepbox 2 kg":31.50,
    "Zure Snoepbox 500 g":7.95,"Zure Snoepbox 1 kg":15.90,"Zure Snoepbox 1,5 kg":23.75,"Zure Snoepbox 2 kg":31.50,
    "Zoet & Zuur Mix 500 g":7.95,"Zoet & Zuur Mix 1 kg":15.90,"Zoet & Zuur Mix 1,5 kg":23.75,"Zoet & Zuur Mix 2 kg":31.50
  }));

  async function sb(path,options={}){
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!key)throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
    const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{...options,headers:{
      "apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json","Accept":"application/json",...(options.headers||{})
    }});
    const text=await r.text();let body=null;try{body=text?JSON.parse(text):null}catch{}
    if(!r.ok)throw new Error(body?.message||body?.hint||text||"Supabase request failed.");
    return body;
  }

  function parseBody(v){if(v&&typeof v==="object")return v;try{return JSON.parse(v||"{}")}catch{return{}}}
  function splitName(full){
    const parts=clean(full,120).split(/\\s+/).filter(Boolean);
    if(!parts.length)return{first:"Bestelling",last:""};
    if(parts.length===1)return{first:parts[0],last:""};
    return{first:parts.slice(0,-1).join(" "),last:parts.at(-1)};
  }

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
      return{
        name:"Gepersonaliseerde snoepzak",quantity:qty,unit_price:price,line_total:round(price*qty),grams:size,
        meta:{type:"personalized-bag",size,sticker:clean(meta.sticker,120),note:clean(meta.note,500),
          selections:Array.isArray(item?.customMix)?item.customMix.slice(0,20).map(x=>({name:clean(x?.name,100),grams:validGrams(x?.grams)?Number(x.grams):0})):[]}
      };
    }

    const grams=Number(item?.grams);if(!validGrams(grams))throw new Error("Ongeldig snoepgewicht.");
    const price=round((grams/100)*1.70);
    return{name:clean(item?.name,120)||clean(item?.id,120)||"Schepsnoep",product_id:(["cuberdon-box","live-box","live-box-xl","snoepmix-1000","snoepmix-500","sweet-gift-box"].includes(clean(item?.id,120))?clean(item?.id,120):null),quantity:qty,unit_price:price,line_total:round(price*qty),grams,meta:null};
  }

  try{
    const apiKey=process.env.MOLLIE_API_KEY;
    if(!apiKey)return res.status(500).json({error:"MOLLIE_API_KEY is not configured."});

    const body=parseBody(req.body),customer=body.customer||{},inputItems=body.items;
    if(!Array.isArray(inputItems)||!inputItems.length||inputItems.length>50)return res.status(400).json({error:"De bestelling is ongeldig of leeg."});

    const fulfillmentMethod=body.fulfillmentMethod==="pickup"?"pickup":"delivery";
    const fullName=clean(customer.name,120);
    const email=clean(customer.email,180).toLowerCase();
    const phone=clean(customer.phone,50);
    const street=clean(customer.street,120);
    const number=clean(customer.houseNumber,30);
    const postal=clean(customer.postalCode,20);
    const city=clean(customer.city,100);
    const country=clean(customer.country||"BE",10).toUpperCase();

    if(!fullName)return res.status(400).json({error:"Vul je naam in."});
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:"Vul een geldig e-mailadres in."});
    if(!phone)return res.status(400).json({error:"Vul je telefoonnummer in."});
    if(fulfillmentMethod==="pickup"){
      customer.street="Lendeleedsestraat";customer.houseNumber="191";customer.postalCode="8870";customer.city="Izegem";
    }else if(!street||!number||!postal||!city)return res.status(400).json({error:"Vul je volledige leveradres in."});

    const items=inputItems.map(calcItem);
    const subtotal=round(items.reduce((sum,x)=>sum+x.line_total,0));

    let discount=0,discountCode="";
    const requested=clean(body.discountCode,40).toUpperCase();
    if(requested==="SWEET10"){
      const prior=await sb("orders?select=id&customer_email=eq."+encodeURIComponent(email)+"&payment_status=eq.paid&limit=1");
      if(prior?.length)return res.status(400).json({error:"SWEET10 is alleen geldig voor een eerste bestelling."});
      discount=round(subtotal*0.10);discountCode="SWEET10";
    }else if(requested){
      return res.status(400).json({error:"Deze promotiecode bestaat niet."});
    }

    const afterDiscount=round(subtotal-discount);
    const shipping=fulfillmentMethod==="pickup"?0:(afterDiscount>=55?0:5.95);
    const total=round(afterDiscount+shipping);
    if(total<=0)return res.status(400).json({error:"Het bestelbedrag is ongeldig."});

    const {first,last}=splitName(fullName);
    const orderRows=await sb("orders",{
      method:"POST",
      headers:{"Prefer":"return=representation"},
      body:JSON.stringify({
        customer_first_name:first,
        customer_last_name:last,
        customer_email:email,
        customer_phone:phone,
        shipping_street:fulfillmentMethod==="pickup"?"Lendeleedsestraat":street,
        shipping_house_number:fulfillmentMethod==="pickup"?"191":number,
        shipping_postal_code:fulfillmentMethod==="pickup"?"8870":postal,
        shipping_city:fulfillmentMethod==="pickup"?"Izegem":city,
        shipping_country:country,
        fulfillment_method:fulfillmentMethod,
        pickup_address:fulfillmentMethod==="pickup"?"Lendeleedsestraat 191, 8870 Izegem":null,
        subtotal,
        discount_amount:discount,
        shipping_cost:shipping,
        total,
        discount_code:discountCode||null,
        source:"website",
        status:"new",
        payment_status:"pending",
        payment_provider:"mollie",
        confirmation_email_status:"pending"
      })
    });
    const order=Array.isArray(orderRows)?orderRows[0]:null;
    if(!order?.id||!order?.order_number)throw new Error("De bestelling kon niet worden opgeslagen.");

    const itemRows=items.map(item=>({
      order_id:order.id,
      product_id:item.product_id||null,
      product_name:item.name,
      unit_price:item.unit_price,
      quantity:item.quantity,
      line_total:item.line_total,
      meta:{...(item.meta||{}),grams:item.grams||null}
    }));

    await sb("order_items",{
      method:"POST",
      headers:{"Prefer":"return=minimal"},
      body:JSON.stringify(itemRows)
    });

    const origin=process.env.PUBLIC_SITE_URL||"https://www.hummiebear.be";
    let paymentResponse;
    try{
      paymentResponse=await fetch("https://api.mollie.com/v2/payments",{
        method:"POST",
        headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json","Accept":"application/json"},
        body:JSON.stringify({
          amount:{currency:"EUR",value:total.toFixed(2)},
          description:"Hummie Bear bestelling "+order.order_number,
          redirectUrl:origin+"/payment-success.html?order="+encodeURIComponent(order.order_number),
          cancelUrl:origin+"/payment-cancelled.html?order="+encodeURIComponent(order.order_number),
          webhookUrl:origin+"/api/mollie-webhook",
          metadata:{order_number:order.order_number}
        })
      });
    }catch(error){
      await sb("orders?id=eq."+encodeURIComponent(order.id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({payment_status:"failed",mollie_status:"creation_failed",status:"cancelled",updated_at:new Date().toISOString()})}).catch(()=>{});
      throw error;
    }

    const payment=await paymentResponse.json().catch(()=>({}));
    if(!paymentResponse.ok){
      await sb("orders?id=eq."+encodeURIComponent(order.id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({payment_status:"failed",mollie_status:"creation_failed",status:"cancelled",updated_at:new Date().toISOString()})}).catch(()=>{});
      return res.status(paymentResponse.status||500).json({error:payment.detail||"Mollie kon de betaling niet aanmaken."});
    }

    await sb("orders?id=eq."+encodeURIComponent(order.id),{
      method:"PATCH",
      headers:{"Prefer":"return=minimal"},
      body:JSON.stringify({
        payment_reference:payment.id,
        payment_provider:"mollie",
        payment_status:"pending",
        mollie_status:payment.status||"open",
        updated_at:new Date().toISOString()
      })
    });

    return res.status(200).json({orderNumber:order.order_number,paymentId:payment.id,status:payment.status,checkoutUrl:payment._links?.checkout?.href||null,total});
  }catch(error){
    console.error("Create payment error:",error);
    return res.status(500).json({error:error.message||"Er ging iets mis bij het starten van de betaling."});
  }
}