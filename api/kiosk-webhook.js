const {sb,mollieFetch}=require('../kiosk-lib');
module.exports=async function(req,res){
  if(req.method!=='POST'&&req.method!=='GET')return res.status(405).end();
  try{
    const id=String((req.body&&req.body.id)||req.query?.id||'');
    if(!/^tr_[A-Za-z0-9]+$/.test(id))return res.status(200).end();
    const payment=await mollieFetch('/payments/'+encodeURIComponent(id));
    const orderId=String(payment.metadata?.order_id||'');
    if(!/^[0-9a-f-]{36}$/i.test(orderId))return res.status(200).end();
    const rows=await sb('/rest/v1/kiosk_orders?id=eq.'+encodeURIComponent(orderId)+'&select=id,mollie_payment_id,payment_status,payment_method,total_cents');
    const order=rows[0];
    if(!order||order.payment_method!=='mollie')return res.status(200).end();
    if(payment.amount?.currency!=='EUR'||Math.round(Number(payment.amount?.value)*100)!==Number(order.total_cents))return res.status(200).end();
    if(order.mollie_payment_id&&order.mollie_payment_id!==id)return res.status(200).end();
    if(!order.mollie_payment_id){
      await sb('/rest/v1/kiosk_orders?id=eq.'+encodeURIComponent(orderId)+'&mollie_payment_id=is.null&payment_status=eq.pending',{
        method:'PATCH',headers:{Prefer:'return=representation'},
        body:JSON.stringify({mollie_payment_id:id,updated_at:new Date().toISOString()})
      });
      const current=(await sb('/rest/v1/kiosk_orders?id=eq.'+encodeURIComponent(orderId)+'&select=mollie_payment_id,payment_status,payment_method,total_cents'))[0];
      if(!current||current.mollie_payment_id!==id)return res.status(200).end();
    }
    if(payment.status==='paid'){
      await sb('/rest/v1/kiosk_orders?id=eq.'+encodeURIComponent(orderId)+'&mollie_payment_id=eq.'+encodeURIComponent(id)+'&payment_status=eq.pending',{
        method:'PATCH',body:JSON.stringify({payment_status:'paid',paid_at:new Date().toISOString(),updated_at:new Date().toISOString()})
      });
    }else if(['failed','expired','canceled'].includes(payment.status)){
      await sb('/rest/v1/kiosk_orders?id=eq.'+encodeURIComponent(orderId)+'&mollie_payment_id=eq.'+encodeURIComponent(id)+'&payment_status=eq.pending',{
        method:'PATCH',body:JSON.stringify({payment_status:payment.status,updated_at:new Date().toISOString()})
      });
    }
    return res.status(200).end();
  }catch(e){return res.status(500).end()}
};