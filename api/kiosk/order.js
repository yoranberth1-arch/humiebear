const crypto=require('crypto');
const {sb}=require('./_lib');
const catalog=require('./catalog');
module.exports=async(req,res)=>{
 if(req.method!=='POST')return res.status(405).json({error:'Methode niet toegestaan'});
 try{
  const b=req.body||{},name=String(b.customer_name||'').trim().slice(0,60),rid=String(b.request_id||'');
  if(!name)return res.status(400).json({error:'Vul de naam van de klant in.'});
  if(!Array.isArray(b.items)||!b.items.length||b.items.length>40||!/^[a-zA-Z0-9-]{12,90}$/.test(rid))return res.status(400).json({error:'Kies minstens één product.'});
  const prior=await sb('/rest/v1/hb_kiosk_orders?select=id,order_number&request_id=eq.'+encodeURIComponent(rid));
  if(prior[0])return res.status(200).json({order_id:prior[0].id,order_number:prior[0].order_number,duplicate:true});
  const [settingsRows,dbProducts]=await Promise.all([
   sb('/rest/v1/hb_kiosk_settings?select=show_hot_chocolate,show_soft_drinks&id=eq.true'),
   sb('/rest/v1/hb_kiosk_products?select=id,name,category,price_cents,price_with_toppings_cents,active')
  ]);
  const settings=settingsRows[0]||{},databaseProducts=new Map(dbProducts.map(p=>[String(p.id),p]));
  const toppings=new Map(catalog.toppings.map(t=>[t.id,t]));
  let total=0;
  const lines=b.items.map(it=>{
   const id=String(it.catalog_id),p=databaseProducts.get(id);
   if(!p||!p.active)throw Error('Product niet beschikbaar. Vernieuw de kassa.');
   if(p.category==='chocolademelk'&&settings.show_hot_chocolate!==true)throw Error('Chocolademelk is momenteel uitgeschakeld.');
   if(p.category==='frisdrank'&&settings.show_soft_drinks!==true)throw Error('Frisdrank is momenteel uitgeschakeld.');
   const ids=Array.isArray(it.toppings)?[...new Set(it.toppings.map(String))]:[];
   if(ids.length&&!['lollywafels','bubbelwafels','wafel-cups'].includes(p.category))throw Error('Dit product heeft geen toppings.');
   if(ids.length&&p.price_with_toppings_cents===null)throw Error('Prijs met toppings is niet ingesteld voor dit product.');
   const chosen=ids.map(tid=>{const t=toppings.get(tid);if(!t)throw Error('Onbekende topping geselecteerd.');return {id:t.id,name:t.name,price_cents:0}});
   const lineTotal=chosen.length?Number(p.price_with_toppings_cents):Number(p.price_cents);
   if(!Number.isInteger(lineTotal)||lineTotal<0)throw Error('Ongeldige productprijs.');
   total+=lineTotal;
   const category=({lollywafels:'Wafels',bubbelwafels:'Wafels','wafel-cups':'Wafels',snacks:'Snoep & snacks',chocolademelk:'chocolademelk',frisdrank:'frisdrank'})[p.category]||p.category;
   const lineName=p.category==='chocolademelk'?'Chocolademelk · '+p.name:p.name;
   return {product_id:id,name:lineName,category,quantity:1,unit_price_cents:lineTotal,toppings:chosen,line_total_cents:lineTotal};
  });
  const number='HB-'+new Date().toISOString().slice(2,10).replace(/-/g,'')+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();
  const row=(await sb('/rest/v1/hb_kiosk_orders',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({order_number:number,request_id:rid,customer_name:name,items:lines,total_cents:total,payment_method:'cash',payment_status:'included',status:'new'})}))[0];
  if(!row?.id)throw Error('Bestelling opslaan mislukt');
  return res.status(200).json({order_id:row.id,order_number:number,total_cents:total});
 }catch(e){return res.status(400).json({error:/product|topping|selecteer|vernieuw|uitgeschakeld|prijs|naam/i.test(e.message)?e.message:'Bestelling kon niet worden opgeslagen. Probeer opnieuw.'})}
};