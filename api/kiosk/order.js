const crypto=require('crypto');
const {sb}=require('./_lib');

module.exports=async(req,res)=>{
  if(req.method!=='POST')return res.status(405).json({error:'Methode niet toegestaan'});
  try{
    const b=req.body||{};
    const name=String(b.customer_name||'').trim().slice(0,60);
    const rid=String(b.request_id||'');
    if(!name||!Array.isArray(b.items)||!b.items.length||b.items.length>30||!/^[a-zA-Z0-9-]{12,90}$/.test(rid))
      return res.status(400).json({error:'Vul je naam in en kies minstens één product.'});

    const prior=await sb('/rest/v1/hb_kiosk_orders?select=id,order_number,payment_status,payment_method&request_id=eq.'+encodeURIComponent(rid));
    if(prior[0])return res.status(200).json({order_id:prior[0].id,order_number:prior[0].order_number,manual_payment:true,duplicate:true});

    const [ss,pp]=await Promise.all([
      sb('/rest/v1/hb_kiosk_settings?select=*&id=eq.true'),
      sb('/rest/v1/hb_kiosk_products?select=id,name,category,description,price_cents,image_path,active')
    ]);
    const settings=ss[0];
    if(!settings)throw Error('Bestelsysteem niet ingesteld');
    const map=new Map(pp.filter(p=>p.active).map(p=>[p.id,p]));
    let total=0;
    const lines=b.items.map(it=>{
      const p=map.get(String(it.product_id));
      const q=Math.max(1,Math.min(20,Math.floor(Number(it.quantity)||1)));
      if(!p)throw Error('Een product is intussen uitverkocht. Vernieuw je winkelmandje.');
      if(p.category==='chocolademelk'&&!settings.show_hot_chocolate)throw Error('Chocolademelk is tijdelijk niet beschikbaar.');
      if(p.category==='frisdrank'&&!settings.show_soft_drinks)throw Error('Frisdrank is tijdelijk niet beschikbaar.');
      const line=p.price_cents*q;
      total+=line;
      return {product_id:p.id,name:p.name,category:p.category,quantity:q,unit_price_cents:p.price_cents,line_total_cents:line};
    });

    const number='HB-'+new Date().toISOString().slice(2,10).replace(/-/g,'')+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();
    const row=(await sb('/rest/v1/hb_kiosk_orders',{
      method:'POST',
      headers:{Prefer:'return=representation'},
      body:JSON.stringify({
        order_number:number,
        request_id:rid,
        customer_name:name,
        items:lines,
        total_cents:total,
        payment_method:'manual',
        payment_status:'included',
        status:'new'
      })
    }))[0];
    if(!row?.id)throw Error('Bestelling opslaan mislukt');
    return res.status(200).json({order_id:row.id,order_number:number,manual_payment:true,total_cents:total});
  }catch(e){
    return res.status(400).json({
      error:/uitverkocht|niet beschikbaar|naam|product|winkelmandje/i.test(e.message)
        ?e.message
        :'Bestelling kon niet worden verwerkt. Probeer opnieuw of vraag hulp.'
    });
  }
};