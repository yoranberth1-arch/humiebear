const {sb}=require('../kiosk-lib');
module.exports=async function(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const id=String(req.query?.id||'');
  if(!/^[0-9a-f-]{36}$/i.test(id))return res.status(400).json({error:'Ongeldige bestelling.'});
  try{
    const rows=await sb('/rest/v1/kiosk_orders?id=eq.'+encodeURIComponent(id)+'&select=id,order_number,customer_name,items,total_cents,payment_status,payment_method,status,created_at');
    const o=rows[0];if(!o)return res.status(404).json({error:'Bestelling niet gevonden.'});
    const out={order_number:o.order_number,payment_status:o.payment_status,payment_method:o.payment_method,status:o.status};
    if(['paid','included','refund_pending','refunded'].includes(o.payment_status)||(o.payment_method==='cash'&&o.payment_status==='pending')){
      out.customer_name=o.customer_name;out.items=o.items;out.total_cents=o.total_cents;out.created_at=o.created_at;
    }
    return res.status(200).json(out);
  }catch(e){return res.status(500).json({error:'Status niet beschikbaar.'})}
};