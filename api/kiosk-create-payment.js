const crypto=require('crypto');
const {sb,mollieFetch}=require('../kiosk-lib');
module.exports=async function(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  let orderId=null;
  try{
    const body=req.body||{};
    const name=String(body.customer_name||'').trim().slice(0,60);
    const items=body.items;
    if(name.length<1||!Array.isArray(items)||items.length<1||items.length>20)return res.status(400).json({error:'Vul je naam in en kies 1 tot 20 wafels.'});
    const settings=(await sb('/rest/v1/kiosk_settings?select=*&id=eq.true'))[0];
    if(!settings)throw new Error('Kiosk is niet ingesteld.');
    const opts=await sb('/rest/v1/kiosk_options?select=id,name,kind&active=eq.true');
    const byId=new Map(opts.map(o=>[o.id,o]));
    let total=0;
    const lines=items.map(raw=>{
      const chocolate=byId.get(raw.chocolate_id),sauce=byId.get(raw.sauce_id),toppingIds=Array.isArray(raw.topping_ids)?[...new Set(raw.topping_ids)]:[];
      if(!chocolate||chocolate.kind!=='chocolate'||!sauce||sauce.kind!=='sauce'||toppingIds.some(id=>byId.get(id)?.kind!=='topping'))throw new Error('Een gekozen optie is niet meer beschikbaar.');
      const toppings=toppingIds.map(id=>byId.get(id));
      const price=settings.base_price_cents+toppings.length*settings.extra_topping_price_cents;
      total+=price;
      return {chocolate_id:chocolate.id,chocolate:chocolate.name,sauce_id:sauce.id,sauce:sauce.name,topping_ids:toppingIds,toppings:toppings.map(t=>t.name),price_cents:price};
    });
    if(!Number.isSafeInteger(total)||total<0)throw new Error('De berekende prijs is ongeldig.');
    const number='HB-'+new Date().toISOString().slice(2,10).replace(/-/g,'')+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();
    const mode=settings.mode==='included'?'included':'paid';
    const requested=String(body.payment_method||'mollie');
    const paymentMethod=mode==='included'?'included':requested;
    if(!['mollie','cash','included'].includes(paymentMethod))return res.status(400).json({error:'Kies online betalen of cash in de truck.'});
    const order=(await sb('/rest/v1/kiosk_orders',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({
      order_number:number,customer_name:name,items:lines,total_cents:mode==='included'?0:total,price_mode:mode,
      payment_status:mode==='included'?'included':'pending',payment_method:paymentMethod,status:'new'
    })}))[0];
    if(!order?.id)throw new Error('De bestelling kon niet worden opgeslagen.');
    orderId=order.id;
    if(mode==='included')return res.status(200).json({order_number:number,order_id:order.id,included:true,payment_method:'included'});
    if(paymentMethod==='cash')return res.status(200).json({order_number:number,order_id:order.id,payment_method:'cash',payment_status:'pending'});
    const origin=(process.env.KIOSK_PUBLIC_URL||'https://www.hummiebear.be').replace(/\/$/,'');
    const payment=await mollieFetch('/payments',{method:'POST',body:JSON.stringify({
      amount:{currency:'EUR',value:(total/100).toFixed(2)},
      description:'Hummie Bear bestelling '+number,
      redirectUrl:origin+'/kiosk-result.html?order='+encodeURIComponent(order.id),
      cancelUrl:origin+'/self-order.html',
      webhookUrl:origin+'/api/kiosk-webhook.js',
      metadata:{order_id:order.id,order_number:number}
    })});
    if(!payment?.id||!payment?._links?.checkout?.href)throw new Error('Mollie heeft geen betaallink teruggegeven.');
    await sb('/rest/v1/kiosk_orders?id=eq.'+encodeURIComponent(order.id),{method:'PATCH',body:JSON.stringify({mollie_payment_id:payment.id,updated_at:new Date().toISOString()})});
    return res.status(200).json({order_number:number,order_id:order.id,checkout_url:payment._links.checkout.href,payment_method:'mollie'});
  }catch(e){
    if(orderId){
      try{
        await sb('/rest/v1/kiosk_orders?id=eq.'+encodeURIComponent(orderId)+'&payment_status=eq.pending',{method:'PATCH',body:JSON.stringify({payment_status:'failed',updated_at:new Date().toISOString()})});
      }catch{}
    }
    const message=String(e?.message||'');
    const safeMessage=/beschikbaar|niet meer|naam|wafels|prijs|kiezen/i.test(message)?message:'De bestelling kon niet worden aangemaakt. Controleer de verbinding en probeer opnieuw.';
    return res.status(400).json({error:safeMessage});
  }
};