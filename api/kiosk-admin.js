const {sb,admin,mollieFetch}=require('../kiosk-lib');
module.exports=async function(req,res){
  if(!admin(req))return res.status(401).json({error:'Geen toegang. Controleer de beheertoken.'});
  try{
    if(req.method==='GET'){
      const [orders,settings,options]=await Promise.all([
        sb('/rest/v1/kiosk_orders?select=*&order=created_at.desc&limit=100'),
        sb('/rest/v1/kiosk_settings?select=*&id=eq.true'),
        sb('/rest/v1/kiosk_options?select=id,name,kind,active&order=sort_order.asc')
      ]);
      for(const order of orders.filter(o=>o.payment_status==='refund_pending'&&o.refund_id&&o.mollie_payment_id)){
        try{
          const refund=await mollieFetch('/payments/'+encodeURIComponent(order.mollie_payment_id)+'/refunds/'+encodeURIComponent(order.refund_id));
          if(refund.status==='refunded')await sb('/rest/v1/kiosk_orders?id=eq.'+encodeURIComponent(order.id)+'&payment_status=eq.refund_pending',{method:'PATCH',body:JSON.stringify({payment_status:'refunded',updated_at:new Date().toISOString()})});
        }catch{}
      }
      const currentOrders=orders;
      return res.status(200).json({orders:currentOrders,settings:settings[0],options});
    }
    if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
    const b=req.body||{};
    if(b.action==='status'){
      if(!['preparing','ready','completed'].includes(b.status))return res.status(400).json({error:'Ongeldige status.'});
      await sb('/rest/v1/kiosk_orders?id=eq.'+encodeURIComponent(b.order_id),{method:'PATCH',body:JSON.stringify({status:b.status,updated_at:new Date().toISOString()})});
      return res.status(200).json({ok:true});
    }
    if(b.action==='cash_received'){
      const id=String(b.order_id||'');
      if(!/^[0-9a-f-]{36}$/i.test(id))return res.status(400).json({error:'Ongeldige bestelling.'});
      const rows=await sb('/rest/v1/kiosk_orders?id=eq.'+encodeURIComponent(id)+'&select=id,payment_method,payment_status');
      const o=rows[0];
      if(!o||o.payment_method!=='cash'||o.payment_status!=='pending')return res.status(409).json({error:'Deze bestelling staat niet meer open voor cashbetaling.'});
      await sb('/rest/v1/kiosk_orders?id=eq.'+encodeURIComponent(id)+'&payment_method=eq.cash&payment_status=eq.pending',{
        method:'PATCH',headers:{Prefer:'return=representation'},
        body:JSON.stringify({payment_status:'paid',paid_at:new Date().toISOString(),updated_at:new Date().toISOString()})
      });
      return res.status(200).json({ok:true});
    }
    if(b.action==='option'){
      const optionId=String(b.option_id||'');
      if(!/^[a-z0-9-]{1,80}$/.test(optionId)||typeof b.active!=='boolean')return res.status(400).json({error:'Ongeldige voorraadwijziging.'});
      await sb('/rest/v1/kiosk_options?id=eq.'+encodeURIComponent(optionId),{method:'PATCH',body:JSON.stringify({active:b.active})});
      return res.status(200).json({ok:true});
    }
    if(b.action==='settings'){
      const price=Number(b.base_price_cents),extra=Number(b.extra_topping_price_cents);
      if(!Number.isInteger(price)||price<0||price>100000||!Number.isInteger(extra)||extra<0||extra>10000||!['paid','included'].includes(b.mode))return res.status(400).json({error:'Controleer prijs en modus.'});
      await sb('/rest/v1/kiosk_settings?id=eq.true',{method:'PATCH',body:JSON.stringify({event_name:String(b.event_name||'').slice(0,100),mode:b.mode,base_price_cents:price,extra_topping_price_cents:extra,updated_at:new Date().toISOString()})});
      return res.status(200).json({ok:true});
    }
    return res.status(400).json({error:'Onbekende actie.'});
  }catch(e){return res.status(500).json({error:'Kon gegevens niet opslaan of ophalen.'})}
};