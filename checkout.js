(() => {
"use strict";
const STORAGE_KEY="hummieBearShopCartV2";
const DISCOUNT_KEY="hummieBearDiscountCode";
const PRICE_PER_100G=1.70;
const DEAL_PRICES=new Map([
["Zoete Snoepbox 500 g",7.95],["Zoete Snoepbox 1 kg",15.90],["Zoete Snoepbox 1,5 kg",23.75],["Zoete Snoepbox 2 kg",31.50],
["Zure Snoepbox 500 g",7.95],["Zure Snoepbox 1 kg",15.90],["Zure Snoepbox 1,5 kg",23.75],["Zure Snoepbox 2 kg",31.50],
["Zoet & Zuur Mix 500 g",7.95],["Zoet & Zuur Mix 1 kg",15.90],["Zoet & Zuur Mix 1,5 kg",23.75],["Zoet & Zuur Mix 2 kg",31.50]
]);
const q=(s,r=document)=>r.querySelector(s);
const money=v=>new Intl.NumberFormat("nl-BE",{style:"currency",currency:"EUR"}).format(Number(v)||0);
const escapeHtml=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
const loadCart=()=>{try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(v)?v.filter(x=>x&&x.id):[]}catch{return[]}};
const saveDiscountCode=v=>{try{if(v)localStorage.setItem(DISCOUNT_KEY,v);else localStorage.removeItem(DISCOUNT_KEY)}catch{}};
const loadDiscountCode=()=>{try{return String(localStorage.getItem(DISCOUNT_KEY)||"").trim().toUpperCase()}catch{return""}};
function itemDetails(item){
  if(item.customMix){
    const grams=item.customMix.reduce((a,b)=>a+Number(b.grams||0),0);
    const meta=item.meta||{};
    const type=meta.type||"mix";
    let name=meta.dealName||"Gepersonaliseerde snoepmix";
    if(type==="personalized-bag")name="Gepersonaliseerde snoepzak";
    if(type==="gift-box")name="Gepersonaliseerde snoepdoos";
    const base=Number(meta.priceOverride);
    const price=Number.isFinite(base)?base:((grams/100)*PRICE_PER_100G+(type==="gift-box"?3.5:0));
    return{name,grams,price,quantity:Number(item.quantity||1),image:item.customMix?.[0]?.image||meta.image||"images/gummy-candy.png",meta,raw:item};
  }
  const grams=Number(item.grams||100);
  return{name:item.name||item.id.replace(/-/g," "),grams,price:(grams/100)*PRICE_PER_100G,quantity:Number(item.quantity||1),image:item.image||"images/gummy-candy.png",meta:item.meta||null,raw:item};
}
const details=()=>loadCart().map(itemDetails);
function state(){
  const items=details();
  const fulfillmentMethod=q("input[name=fulfillmentMethod]:checked")?.value==="pickup"?"pickup":"delivery";
  const subtotal=items.reduce((a,i)=>a+i.price*i.quantity,0);
  const code=(q("#discountCode")?.value||loadDiscountCode()).trim().toUpperCase();
  const previewDiscount=code==="SWEET10"?Math.round(subtotal*.10*100)/100:0;
  const discounted=Math.max(0,subtotal-previewDiscount);
  const shipping=fulfillmentMethod==="pickup"?0:(discounted>=55?0:(items.length?5.95:0));
  const total=Math.max(0,discounted+shipping);
  return{items,subtotal,code,previewDiscount,discounted,shipping,total,fulfillmentMethod};
}
function render(){
  const s=state();
  const list=q("#checkoutItems");
  if(!s.items.length){q("#checkoutEmpty").style.display="block";q("#checkoutContent").style.display="none";return}
  q("#checkoutEmpty").style.display="none";q("#checkoutContent").style.display="";
  list.innerHTML=s.items.map(i=>`<div class="summary-item"><img src="${escapeHtml(i.image)}" alt=""><div><h3>${escapeHtml(i.name)}</h3><p>${i.grams?escapeHtml(i.grams+" g")+" · ":""}${i.quantity} × ${money(i.price)}</p></div><strong>${money(i.price*i.quantity)}</strong></div>`).join("");
  q("#subtotal").textContent=money(s.subtotal);
  q("#shippingLabel").textContent=s.fulfillmentMethod==="pickup"?"Afhalen":"Verzending";
  q("#shipping").textContent=s.fulfillmentMethod==="pickup"?"GRATIS":(s.shipping===0?"GRATIS":money(s.shipping));
  q("#total").textContent=money(s.total);
  const discountRow=q("#discountRow");
  if(s.previewDiscount>0){discountRow.style.display="flex";q("#discountAmount").textContent="- "+money(s.previewDiscount)}else discountRow.style.display="none";
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
  const fulfillmentMethod=data.fulfillmentMethod==="pickup"?"pickup":"delivery";
  const customer={
    name:String(data.name||"").trim(),email:String(data.email||"").trim().toLowerCase(),
    phone:String(data.phone||"").trim(),
    street:fulfillmentMethod==="pickup"?"Lendeleedsestraat":String(data.street||"").trim(),
    houseNumber:fulfillmentMethod==="pickup"?"191":String(data.houseNumber||"").trim(),
    postalCode:fulfillmentMethod==="pickup"?"8870":String(data.postalCode||"").trim(),
    city:fulfillmentMethod==="pickup"?"Izegem":String(data.city||"").trim(),country:"BE"
  };
  const button=q("#payButton");button.disabled=true;button.textContent="Bestelling voorbereiden…";
  saveDiscountCode(s.code);
  try{
    const response=await fetch("https://humiebear.vercel.app/api/create-payment",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({customer,fulfillmentMethod,items:s.items.map(i=>({id:i.raw?.id||"",name:i.name,quantity:i.quantity,grams:i.grams,meta:i.meta||null,customMix:i.raw?.customMix||null})),discountCode:s.code})});
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
  const code=loadDiscountCode();
  q("#discountCode").value=code;
  if(code==="SWEET10")setCouponMessage("SWEET10 staat klaar. De korting wordt op de server gecontroleerd.",true);
  render();
  const deliveryFields=["#street","#houseNumber","#postalCode","#city"].map(q);
  const syncFulfillment=()=>{const pickup=q("input[name=fulfillmentMethod]:checked")?.value==="pickup";deliveryFields.forEach(el=>{const field=el.closest(".field");field.hidden=pickup;el.required=!pickup;});render();};
  document.querySelectorAll("input[name=fulfillmentMethod]").forEach(el=>el.addEventListener("change",syncFulfillment));
  syncFulfillment();
  q("#discountCode").addEventListener("input",()=>{const v=q("#discountCode").value.trim().toUpperCase();q("#discountCode").value=v;if(v==="SWEET10")setCouponMessage("10% korting aangevraagd. We controleren bij het afrekenen of dit je eerste bestelling is.",true);else if(v)setCouponMessage("Code wordt gecontroleerd bij het afrekenen.",false);else setCouponMessage("");render()});
  q("#couponApply").addEventListener("click",()=>{const v=q("#discountCode").value.trim().toUpperCase();saveDiscountCode(v);if(v==="SWEET10"){setCouponMessage("Code opgeslagen.",true)}else setCouponMessage("Onbekende promotiecode.",false);render()});
  q("#checkoutForm").addEventListener("submit",submitCheckout);
});
})();