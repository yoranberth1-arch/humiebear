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
    return{name,grams,price,quantity:Number(item.quantity||1),image:item.customMix?.[0]?.image||meta.image||"images/gummy-candy.png",meta,raw:item};
  }
  if(item.meta?.type==="delicacy"){
    const names={"mallow-fondant":"Mallow Antwerps spek fondant","mallow-melkchocolade":"Mallow Antwerps spek melkchocolade","mallow-melkchocolade-kokos":"Mallow Antwerps spek melkchocolade kokos","mallow-natuur":"Mallow Antwerps spek natuur"};
    if(names[item.id])return{name:names[item.id],grams:0,price:6,quantity:Number(item.quantity||1),image:item.image||"images/gummy-candy.png",meta:{type:"delicacy"},raw:item};
  }
  const grams=Number(item.grams||100);
  return{name:item.name||item.id.replace(/-/g," "),grams,price:roundMoney((grams/100)*PRICE_PER_100G),quantity:Number(item.quantity||1),image:item.image||"images/gummy-candy.png",meta:item.meta||null,raw:item};
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