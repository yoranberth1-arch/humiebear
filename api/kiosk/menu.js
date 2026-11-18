const {sb}=require('./_lib');
const catalog=require('./catalog');
const ids=['lollywafel','bubbelwafel','wafel-cup','zakje-snoep','geroosterde-nootjes','zakje-mallows'];
module.exports=async(req,res)=>{
 if(req.method!=='GET')return res.status(405).json({error:'Methode niet toegestaan'});
 res.setHeader('Cache-Control','no-store');
 try{
  const [settingsRows,dbProducts]=await Promise.all([
   sb('/rest/v1/hb_kiosk_settings?select=show_hot_chocolate,show_soft_drinks&id=eq.true'),
   sb('/rest/v1/hb_kiosk_products?select=id,name,category,price_cents,price_with_toppings_cents,active,sort_order&active=eq.true&order=sort_order.asc')
  ]);
  const settings=settingsRows[0]||{};
  const products=dbProducts.filter(p=>{
   if(ids.includes(p.id))return true;
   if(p.category==='chocolademelk')return settings.show_hot_chocolate===true;
   if(p.category==='frisdrank')return settings.show_soft_drinks===true;
   return false;
  }).map(p=>({
   id:p.id,name:p.name,category:({lollywafels:'Wafels',bubbelwafels:'Wafels','wafel-cups':'Wafels',snacks:'Snoep & snacks',chocolademelk:'chocolademelk',frisdrank:'frisdrank'})[p.category]||p.category,
   price_cents:Number(p.price_cents)||0,
   ...(p.price_with_toppings_cents!==null&&p.price_with_toppings_cents!==undefined?{price_with_toppings_cents:Number(p.price_with_toppings_cents)}:{}),
   has_toppings:p.price_with_toppings_cents!==null&&p.price_with_toppings_cents!==undefined,
   source:'database'
  }));
  return res.status(200).json({...catalog,products});
 }catch(e){return res.status(503).json({error:'Assortiment kon niet worden geladen. Controleer de verbinding en probeer opnieuw.'})}
};