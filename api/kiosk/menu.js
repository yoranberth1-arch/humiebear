const {sb}=require('./_lib');
const catalog=require('./catalog');
module.exports=async(req,res)=>{
 if(req.method!=='GET')return res.status(405).json({error:'Methode niet toegestaan'});
 res.setHeader('Cache-Control','no-store');
 try{
  const [settingsRows,dbProducts]=await Promise.all([
   sb('/rest/v1/hb_kiosk_settings?select=show_hot_chocolate,show_soft_drinks&id=eq.true'),
   sb('/rest/v1/hb_kiosk_products?select=id,name,category,price_cents,active,sort_order&active=eq.true&order=sort_order.asc')
  ]);
  const settings=settingsRows[0]||{show_hot_chocolate:false,show_soft_drinks:false};
  const extras=dbProducts.filter(p=>{
   if(p.category==='chocolademelk')return settings.show_hot_chocolate===true;
   if(p.category==='frisdrank')return settings.show_soft_drinks===true;
   return false;
  }).map(p=>({
   id:p.id,name:p.category==='chocolademelk'?'Chocolademelk · '+p.name:p.name,
   category:p.category,price_cents:Number(p.price_cents)||0,has_toppings:false,
   source:'database'
  }));
  return res.status(200).json({...catalog,products:[...catalog.products.map(p=>({...p,has_toppings:true})),...extras]});
 }catch(e){return res.status(503).json({error:'Assortiment kon niet worden geladen. Controleer de verbinding en probeer opnieuw.'})}
};