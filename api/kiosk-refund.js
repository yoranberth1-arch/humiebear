const {sb,mollieFetch,admin}=require('../kiosk-lib');
module.exports=async function(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!admin(req))return res.status(401).json({error:'Geen toegang.'});
  try{
    const id=String(req.body?.order_id||'');
    if(!/^[0-9a-f-]{36}$/i.test(id))return res.status(400).json({error:'Ongeldige bestelling.'});
    const rows=await sb('/rest/v1/kiosk_orders?id=eq.'+encodeURIComponent(id)+'&select=id,mollie_payment_id,payment_method,payment_status,refund_id');
    const order=rows[0];
    if(!order||order.payment_method!=='mollie'||!order.mollie_payment_id||order.payment_status!=='paid')return res.status(400).json({error:'Deze online bestelling staat niet open voor terugbetaling.'});
    const result=await mollieFetch('/payments/'+encodeURIComponent(order.mollie_payment_id)+'/refunds',{method:'POST',headers:{'Idempotency-Key':id},body:JSON.stringify({description:'Terugbetaling Hummie Bear bestelling'})});
    await sb('/rest/v1/kiosk_orders?id=eq.'+encodeURIComponent(id)+'&payment_status=eq.paid',{method:'PATCH',body:JSON.stringify({payment_status:result.status==='refunded'?'refunded':'refund_pending',refund_id:result.id,updated_at:new Date().toISOString()})});
    return res.status(200).json({ok:true,refund_id:result.id,status:result.status});
  }catch(e){return res.status(400).json({error:'Terugbetaling kon niet worden gestart. Controleer de Mollie-status en probeer opnieuw.'})}
};