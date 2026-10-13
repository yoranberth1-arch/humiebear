(() => {
"use strict";
const STORAGE_KEY="hummieBearShopCartV2";
const PRICE_PER_100G=1.60;
const roundMoney=v=>Math.round((Number(v||0)+Number.EPSILON)*100)/100;
const DEAL_PRICES=new Map([
["Zoete Snoepbox 500 g",7.95],["Zoete Snoepbox 1 kg",15.90],["Zoete Snoepbox 1,5 kg",23.75],["Zoete Snoepbox 2 kg",31.50],
["Zure Snoepbox 500 g",7.95],["Zure Snoepbox 1 kg",15.90],["Zure Snoepbox 1,5 kg",23.75],["Zure Snoepbox 2 kg",31.50],
["Zoet & Zuur Mix 500 g",7.95],["Zoet & Zuur Mix 1 kg",15.90],["Zoet & Zuur Mix 1,5 kg",23.75],["Zoet & Zuur Mix 2 kg",31.50]
]);
const PRODUCT_IMAGE_BY_ID={
  "aardbeien": "https://www.snoepzoet.be/cdn/shop/products/Zoet-Haribo-Aardbeien.jpg?v=1500372953",
  "spek-lardons": "https://snoepstore.nl/7312-large_default/ruitspek-120-stuks-haribo-.jpg",
  "bananen": "https://www.notesgourmandes.fr/assets/uploads/products/bananes-par-100g-68306a025df41.png",
  "berries": "https://cdn.webshopapp.com/shops/255156/files/475648445/haribo-berries-bestellen.jpg",
  "carensac": "https://candyparadis.org/cdn/shop/files/image-2.webp?v=1730838596",
  "frambooshartjes": "https://media.s-bol.com/my4pRYJE5k90/1200x1200.jpg",
  "fruitkogels": "https://www.snuffelstore.be/wp-content/uploads/2022/04/4001686575192-600x600.jpg",
  "gloeiwormen": "https://fladis.azureedge.net/erp/377f1430-f945-4926-b0b1-4c588b1b18b9.png",
  "goudbeertjes": "https://assets.haribo.com/image/upload/s--2uTBijQI--/ar_2637%3A4000%2Cc_fill%2Cf_auto%2Cq_60/w_814/v1/consumer-sites/nl-be/Products/Goudberen-250g-5996379305912.png",
  "grapefruit": "https://assets.sainsburys-groceries.co.uk/gol/8101539/1/640x640.jpg",
  "happy-cola-groot": "https://www.snoepaanhuis.be/68-large_default/happy-cola-groot-150-st-tubo-12kg-haribo.jpg",
  "happy-cola-klein": "https://www.bbi-kermesse.com/12698-large_default/SACHET-HAPPY-COLA-HARIBO-40-GR.jpg",
  "kersen": "https://snoepstore.nl/2817-large_default/haribo-kersen.jpg",
  "krokodillen": "https://www.ccandy.de/cdn/shop/files/Haribo-Krokodillen.jpg?v=1712503101",
  "letters": "https://static.delhaize.be/medias/sys_master/products/h4f/hf1/13815673946142.jpg?buildNumber=a5097186fcc7b2e134116bd7730052e9777de5e5ff015c6123247f5dc516df97&imwidth=320",
  "pasta-frutta": "https://www.snoepaanhuis.be/70-large_default/pasta-frutta-18-x-200g-haribo-veggie.jpg",
  "perziken": "https://fladis.azureedge.net/erp/934b82eb-b1b7-4edd-b958-1324d3a50c8c.jpeg",
  "pico-balla": "https://cdn.shopify.com/s/files/1/0369/3033/products/Zoet-Haribo-Pico-Balla_1024x1024%402x.jpg?v=1508500717",
  "reuze-aardbei": "https://cdn.webshopapp.com/shops/282420/files/287871219/64x44x2/amerikaans.jpg",
  "rotella-fruit": "https://www.grossiste-confiserie.com/images_catalogue/produits/images/37177B74C1A8EA094A5FFD1C2EA690B3.jpg",
  "rotella-zwart-jojo": "https://www.dropgigant.nl/cdn/shop/files/rotella-250gr.jpg?v=1787684849&width=450",
  "schuimaardbei-tacada": "https://media.s-bol.com/NGEZvzVlql7N/xBXJjr/550x630.jpg",
  "smurfen": "https://cdn.webshopapp.com/shops/255156/files/475692656/bestel-jouw-haribo-smurfen-snoep-hier.jpg",
  "tutters-spenen": "https://leschiques.be/752-large_default/tetines-colorees-haribo.jpg",
  "blue-dummies-sour": "https://media.s-bol.com/BpEkGrL6n90k/l1p3J1/550x550.jpg",
  "bubblegum-bottles": "https://i0.wp.com/www.online-snoep.nl/wp-content/uploads/2022/02/bubblegum-bottle.png?fit=580%2C500&ssl=1",
  "bubblegum-tutters": "https://www-static.snoeppotteke.be/wp-content/uploads/2023/09/MG_7135-scaled.jpg",
  "chery-cola": "https://media.s-bol.com/NOQxKkVloQpD/550x550.jpg",
  "cola-tutten-zuur": "https://ollebolle.net/shops/ollebolle/thumbs/colatutten-colatutten-red-band.jpg",
  "cola-klein-zuur": "https://media.s-bol.com/J8G625oVK2KD/550x550.jpg",
  "dropveters": "https://snoepstore.nl/6329-large_default/dropveters-23-stuks.jpg",
  "confetti": "https://lekkergoed.be/wp-content/uploads/2020/07/astra-frisia-confetti-lekkergoed-600x600.png",
  "eieren": "https://media.s-bol.com/NOQxKkVloQpD/550x550.jpg",
  "frieten": "http://despekke-lendelede.be/cdn/shop/products/AstraSweetsZureFrietjes.jpg?v=1638211165",
  "gesuikerde-aardbei": "https://cdn.webshopapp.com/shops/255156/files/493965779/gesuikerde-aardbei-snoep-in-huis-halen.jpg",
  "hearts": "https://www.astrasweets.com/wp-content/uploads/2020/01/heart_mallow.png",
  "hotlips": "https://media.s-bol.com/gpoZy79mRXvZ/1200x1200.jpg",
  "kersen-zuur": "https://www.mijnsnoepgoed.nl/cdn/shop/files/haribo-zure-kersen-1kg.jpg",
  "kikkers-astra": "https://cdn.webshopapp.com/shops/255156/files/494876718/kikker-snoep-van-astra-kopen-online.jpg",
  "manneke-pis-zuur": "https://lekkergoed.be/wp-content/uploads/2023/05/manneke-pis-lekkergoed.png",
  "manneke-pis-olie": "https://lekkergoed.be/wp-content/uploads/2023/05/manneke-pis-lekkergoed.png",
  "muizen": "https://www.bonbonz.be/4230-large_default/bonbon-astra-sweet-souris-gomme-enfant.jpg",
  "orka": "https://lekkergoed.be/wp-content/uploads/2020/07/astra-frisia-orka-lekkergoed.png",
  "poepekens": "https://cdn.webshopapp.com/shops/255156/files/461300478/400x400x2/astra-poepegatjes-bestellen.jpg",
  "unicones": "https://static.ah.nl/dam/product/AHI_4354523130323034303632?fileType=binary&rendition=800x800_JPG_Q90&revLabel=1",
  "violetten": "https://media.s-bol.com/gJ5LJLKx2rBk/550x550.jpg",
  "watermeloen-tutters": "https://confiserieblomme.be/site/data/images/product/thumb_954-Zure-watermeloen-spenen-Astra.gif",
  "winegums": "https://media.s-bol.com/BrlNygoOyOJW/550x550.jpg",
  "zure-appeltjes": "https://www.snoepzoet.be/cdn/shop/products/Zoet-Astra-Zure-Appels.jpg?v=1509707326&width=1206",
  "zure-beren": "https://cdn.webshopapp.com/shops/255156/files/494875785/heerlijke-zure-beertjes-van-belgische-snoepfabrika.jpg",
  "zure-gloeiewormen": "https://odoo.snoepcenterlingier.be/web/image/product.template/2210/image_1024?unique=5af6f44",
  "zure-ringen": "https://hurikan.hr/_next/image?q=75&url=https%3A%2F%2Fhurikan-back.azurewebsites.net%2Fuploads%2FIN_509_BURMAR_SAREN_KIS_b8aa58dafe.jpg&w=3840",
  "zwarte-muizen": "https://cdn.webshopapp.com/shops/255156/files/423062565/zwarte-muizen-snoepjes-bestellen-online.jpg",
  "cuberdons": "https://www.belices.be/web/image/product.product/2369/image_1024/GELDHOF%20snoep%20cuberdons%20200g?unique=ecfd91b",
  "zure-vliegers": "https://files.candyandmore.be/cache/products/images/1200x630/1dd28bf14741602b71edaef7a2bcafd5d26167e7_6ef7770a59bb4be17b99b6537466104dfd7a065a.jpg",
  "spaghetti-aardbei": "https://www.gosupps.com/media/catalog/product/cache/25/image/1500x/040ec09b1e35df139433887a97daa66f/5/1/51YVc-PRKYL.jpg",
  "spaghetti-appel": "https://www.rigato.net/media/catalog/product/cache/7de23bfdd4b609a04636e339059efb34/s/p/spaghetti_mela_gommosi_frizzanti_6g_king_regal_1.jpg",
  "spaghetti-cola": "https://www.rigato.net/media/catalog/product/cache/7de23bfdd4b609a04636e339059efb34/s/p/spaghetti_cola_gommosi_frizzanti_6g_king_regal_1.jpg",
  "matten-aardbei": "https://soyouz2.deindeal.ch/api/img?p=products%2F2024%2F6%2F0CBA3D70-16AA-4E5D-BD64-CD23DF6B5F08%2F20694219_1&st=11&v=1770656113",
  "matten-cola": "https://www.aligro.ch/media/cache/article_wide/uploads/articles/177/17798_FR_1.webp",
  "matten-appel": "https://www.aligro.ch/media/cache/article_wide/uploads/articles/177/17797_FR_1.webp",
  "creamrolls": "https://cbonbons.ch/cdn/shop/files/Histoire-2025-10-06T180112.735.png?v=1759766483&width=990",
  "dracula": "https://media.s-bol.com/3rxpGpz0VyDM/vLzyG5/1200x1012.jpg",
  "dracula-zuur": "https://www.shopbelgium.net/2925-large_default/lutti-dents-dracula-acidules-200g.jpg",
  "tropical-fish": "https://static.delhaize.be/medias/sys_master/products/hcd/h21/12757888204830.jpg",
  "kettingen": "https://www.ah.nl/producten/product/wi451877/look-o-look-snoepkettingen-en-horloges",
  "mallow-fondant": "images/antwerps-spek-fondant.webp?v=20261013-fondant-direct-6",
  "mallow-melkchocolade": "images/antwerps-spek-melkchocolade.webp?v=20261013-photo-repair-4",
  "mallow-melkchocolade-kokos": "images/antwerps-spek-melkchocolade-kokos.webp?v=20261013-photo-repair-4",
  "mallow-natuur": "images/antwerps-spek-natuur.webp?v=20261013-photo-repair-4"
};
function getCartImage(id,storedImage){
  const raw=PRODUCT_IMAGE_BY_ID[String(id||"")]||storedImage||"";
  if(!raw)return "images/gummy-candy.png";
  if(/^(?:\/|\.\/|\.\.\/|images\/)/i.test(raw))return raw;
  if(/^https?:\/\//i.test(raw))return "https://images.weserv.nl/?url="+encodeURIComponent(raw)+"&w=900&q=88";
  return "images/gummy-candy.png";
}
const q=(s,r=document)=>r.querySelector(s);
const money=v=>new Intl.NumberFormat("nl-BE",{style:"currency",currency:"EUR"}).format(Number(v)||0);
const LOCAL_DELIVERY_POSTCODES=new Set(["8870","8770","8860","8850","8780","8760"]);
const isLocalDeliveryPostcode=value=>LOCAL_DELIVERY_POSTCODES.has(String(value||"").replace(/\D/g,"").slice(0,4));
const escapeHtml=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
const loadCart=()=>{try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(v)?v.filter(x=>x&&x.id):[]}catch{return[]}};
function itemDetails(item){
  if(item.customMix){
    const grams=item.customMix.reduce((a,b)=>a+Number(b.grams||0),0);
    const meta=item.meta||{};
    const type=meta.type||"mix";
    let name=meta.dealName||"Gepersonaliseerde snoepmix";
    if(type==="personalized-bag")name="Gepersonaliseerde snoepzak";
    if(type==="gift-box")name="Gepersonaliseerde snoepdoos";
    const fallbackPrice=roundMoney((grams/100)*PRICE_PER_100G+(type==="gift-box"?3.5:0));
    const override=meta.priceOverride;
    const base=override===null||override===undefined||override===""?fallbackPrice:Number(override);
    const price=roundMoney(Number.isFinite(base)?base:fallbackPrice);
    return{name,grams,price,quantity:Number(item.quantity||1),image:getCartImage(item.customMix?.[0]?.id,item.customMix?.[0]?.image||meta.image),meta,raw:item};
  }
  if(item.meta?.type==="delicacy"){
    const names={"mallow-fondant":"Mallow Antwerps spek fondant","mallow-melkchocolade":"Mallow Antwerps spek melkchocolade","mallow-melkchocolade-kokos":"Mallow Antwerps spek melkchocolade kokos","mallow-natuur":"Mallow Antwerps spek natuur"};
    if(names[item.id])return{name:names[item.id],grams:0,price:6,quantity:Number(item.quantity||1),image:getCartImage(item.id,item.image),meta:{type:"delicacy"},raw:item};
  }
  const grams=Number(item.grams||100);
  return{name:item.name||item.id.replace(/-/g," "),grams,price:roundMoney((grams/100)*PRICE_PER_100G),quantity:Number(item.quantity||1),image:getCartImage(item.id,item.image),meta:item.meta||null,raw:item};
}
const details=()=>loadCart().map(itemDetails);
function state(){
  const items=details();
  const selectedMethod=q('input[name="fulfillmentMethod"]:checked')?.value||"delivery";
  const fulfillmentMethod=["pickup","local_delivery"].includes(selectedMethod)?selectedMethod:"delivery";
  const localDeliveryEligible=isLocalDeliveryPostcode(q("#postalCode")?.value);
  const subtotal=roundMoney(items.reduce((a,i)=>a+i.price*i.quantity,0));
  const code="";
  const previewDiscount=0;
  const discounted=subtotal;
  const shipping=fulfillmentMethod==="pickup"?0:(fulfillmentMethod==="local_delivery"?(subtotal>=25?0:(items.length?5.95:0)):(subtotal>=55?0:(items.length?5.95:0)));
  const total=roundMoney(Math.max(0,discounted+shipping));
  return{items,subtotal,code,previewDiscount,discounted,shipping,total,fulfillmentMethod,localDeliveryEligible};
}
function render(){
  const s=state();
  const list=q("#checkoutItems");
  if(!s.items.length){q("#checkoutEmpty").style.display="block";q("#checkoutContent").style.display="none";return}
  q("#checkoutEmpty").style.display="none";q("#checkoutContent").style.display="";
  list.innerHTML=s.items.map((i,index)=>`<div class="summary-item"><img src="${escapeHtml(i.image)}" alt=""><div class="summary-item-info"><h3>${escapeHtml(i.name)}</h3><p>${i.grams?escapeHtml(i.grams+" g")+" · ":""}${i.quantity} × ${money(i.price)}</p><button type="button" class="summary-remove" data-remove-checkout="${index}">Verwijder uit bestelling</button></div><strong>${money(i.price*i.quantity)}</strong></div>`).join("");
  q("#subtotal").textContent=money(s.subtotal);
  q("#shippingLabel").textContent=s.fulfillmentMethod==="pickup"?"Afhalen":(s.fulfillmentMethod==="local_delivery"?"Lokale levering":"Verzending");
  q("#shipping").textContent=s.fulfillmentMethod==="pickup"?"GRATIS":(s.shipping===0?"GRATIS":money(s.shipping));
  q("#total").textContent=money(s.total);
}
function setCouponMessage(text,ok=false){
  const el=q("#couponMessage");el.textContent=text;el.className="coupon-message"+(ok?" success":" error");
}
function showError(text){const el=q("#checkoutError");el.textContent=text;el.classList.add("show")}
function hideError(){q("#checkoutError").classList.remove("show")}
async function submitCheckout(e){
  e.preventDefault();hideError();
  const form=e.currentTarget;
  if(!form.reportValidity())return;
  const s=state();
  if(!s.items.length){showError("Je mandje is leeg.");return}
  if(typeof window.fbq==="function")window.fbq('track','InitiateCheckout',{content_type:'product',num_items:s.items.reduce((n,i)=>n+i.quantity,0),value:s.total,currency:'EUR'});
  const data=Object.fromEntries(new FormData(form).entries());
  const fulfillmentMethod=["pickup","local_delivery"].includes(data.fulfillmentMethod)?data.fulfillmentMethod:"delivery";
  if(fulfillmentMethod==="local_delivery"&&!isLocalDeliveryPostcode(data.postalCode)){showError("Lokale levering is enkel mogelijk in de postcodezone 8870, 8770, 8860, 8850, 8780 en 8760. Kies gewone levering of pas je postcode aan.");return;}
  const customer={
    name:String(data.name||"").trim(),email:String(data.email||"").trim().toLowerCase(),
    phone:String(data.phone||"").trim(),
    street:fulfillmentMethod==="pickup"?"Lendeleedsestraat":String(data.street||"").trim(),
    houseNumber:fulfillmentMethod==="pickup"?"191":String(data.houseNumber||"").trim(),
    postalCode:fulfillmentMethod==="pickup"?"8870":String(data.postalCode||"").trim(),
    city:fulfillmentMethod==="pickup"?"Izegem":String(data.city||"").trim(),country:"BE"
  };
  const button=q("#payButton");button.disabled=true;button.textContent="Bestelling voorbereiden…";
  try{
    const response=await fetch("https://humiebear.vercel.app/api/create-payment",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({customer,fulfillmentMethod,items:s.items.map(i=>({id:i.raw?.id||"",name:i.name,quantity:i.quantity,grams:i.grams,meta:i.meta||null,customMix:i.raw?.customMix||null})),discountCode:""})});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(body.error||"De betaling kon niet worden gestart.");
    if(!body.checkoutUrl)throw new Error("Mollie gaf geen betaalpagina terug.");
    window.location.href=body.checkoutUrl;
  }catch(err){
    showError(err.message||"Er ging iets mis bij het starten van de betaling.");
    button.disabled=false;button.textContent="Betaal veilig via Mollie";
  }
}
function enhanceCartItems(){
  const raw=loadCart();
  return raw.map(item=>{
    const d=itemDetails(item);
    return {
      ...item,
      name:item.name||d.name,
      image:item.image||d.image
    };
  });
}
document.addEventListener("DOMContentLoaded",()=>{
  const raw=loadCart();
  if(!raw.length){q("#checkoutEmpty").style.display="block";q("#checkoutContent").style.display="none";return}
  try{localStorage.removeItem("hummieBearDiscountCode")}catch{}
  render();
  const deliveryFields=["#street","#houseNumber","#postalCode","#city"].map(selector => q(selector)).filter(Boolean);
  const syncFulfillment=()=>{
    const pickup=q('input[name="fulfillmentMethod"]:checked')?.value==="pickup";
    deliveryFields.forEach(input=>{
      const field=input.closest(".field");
      if(field)field.hidden=pickup;
      input.required=!pickup;
      if(pickup)input.setCustomValidity("");
    });
    render();
  };
  document.querySelectorAll('input[name="fulfillmentMethod"]').forEach(el=>el.addEventListener("change",syncFulfillment));
  syncFulfillment();
  q("#postalCode")?.addEventListener("input",render);
  q("#checkoutItems").addEventListener("click",e=>{const btn=e.target.closest("[data-remove-checkout]");if(!btn)return;const raw=loadCart();const index=Number(btn.dataset.removeCheckout);if(!Number.isInteger(index)||index<0||index>=raw.length)return;raw.splice(index,1);try{localStorage.setItem(STORAGE_KEY,JSON.stringify(raw));window.dispatchEvent(new StorageEvent("storage",{key:STORAGE_KEY}));}catch{}if(!raw.length){q("#checkoutEmpty").style.display="block";q("#checkoutContent").style.display="none";}else render();});
  q("#checkoutForm").addEventListener("submit",submitCheckout);
  window.addEventListener("storage",e=>{if(e.key===STORAGE_KEY)render();});
  window.addEventListener("hb-cart-change",render);
});
})();