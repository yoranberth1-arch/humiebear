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
   sb('/rest/v1/hb_kiosk_products?select=id,name,category,price_cents,active&active=eq.true')
  ]);
  const settings=settingsRows[0]||{};
  const staticProducts=new Map(catalog.products.map(p=>[p.id,p]));
  const databaseProducts=new Map(dbProducts.map(p=>[String(p.id),p]));
  const toppings=new Map(catalog.toppings.map(t=>[t.id,t]));
  let total=0;
  const lines=b.items.map(it=>{
   const id=String(it.catalog_id),p=staticProducts.get(id),db=databaseProducts.get(id);
   if(!p&&!db)throw Error('Onbekend of niet beschikbaar product. Vernieuw het kassascherm.');
   let lineName,category,basePrice,lineTotal,chosen=[];
   if(p){
    const ids=Array.isArray(it.toppings)?[...new Set(it.toppings.map(String))]:[];
    if(ids.length&&!p.price_with_toppings_cents)throw Error('Dit product heeft geen toppings.');
    chosen=ids.map(tid=>{const t=toppings.get(tid);if(!t)throw Error('Onbekende topping geselecteerd.');return {id:t.id,name:t.name,price_cents:0}});
    lineName=p.name;category=p.category;basePrice=p.price_cents;
    lineTotal=chosen.length?p.price_with_toppings_cents:p.price_cents;
   }else{
    if(it.toppings&&it.toppings.length)throw Error('Dit product heeft geen toppings.');
    if(db.category==='chocolademelk'&&settings.show_hot_chocolate!==true)throw Error('Chocolademelk is momenteel uitgeschakeld.');
    if(db.category==='frisdrank'&&settings.show_soft_drinks!==true)throw Error('Frisdrank is momenteel uitgeschakeld.');
    if(!['chocolademelk','frisdrank'].includes(db.category))throw Error('Dit product kan niet via deze kassa besteld worden.');
    lineName=(db.category==='chocolademelk'?'Chocolademelk · ':'')+db.name;
    category=db.category;basePrice=Number(db.price_cents)||0;lineTotal=basePrice;
   }
   total+=lineTotal;
   return {product_id:id,name:lineName,category,quantity:1,unit_price_cents:lineTotal,toppings:chosen,line_total_cents:lineTotal};
  });
  const number='HB-'+new Date().toISOString().slice(2,10).replace(/-/g,'')+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();
  const row=(await sb('/rest/v1/hb_kiosk_orders',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({order_number:number,request_id:rid,customer_name:name,items:lines,total_cents:total,payment_method:'cash',payment_status:'included',status:'new'})}))[0];
  if(!row?.id)throw Error('Bestelling opslaan mislukt');
  return res.status(200).json({order_id:row.id,order_number:number,total_cents:total});
 }catch(e){return res.status(400).json({error:/product|topping|selecteer|vernieuw|uitgeschakeld|kassa/i.test(e.message)?e.message:'Bestelling kon niet worden opgeslagen. Probeer opnieuw.'})}
};