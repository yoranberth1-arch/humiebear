(() => {
"use strict";
const q=(s,r=document)=>r.querySelector(s);let token=sessionStorage.getItem("hbOrdersToken")||"";let orders=[];
const money=v=>new Intl.NumberFormat("nl-BE",{style:"currency",currency:"EUR"}).format(Number(v)||0);
const date=v=>v?new Intl.DateTimeFormat("nl-BE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"-";
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
const payLabel=s=>({paid:"Betaald",open:"Open",pending:"In afwachting",failed:"Mislukt",canceled:"Geannuleerd",expired:"Verlopen",creation_failed:"Betaling mislukt"}[s]||s||"Onbekend");
const fulfillLabel=s=>({new:"Nieuw",processing:"In behandeling",shipped:"Verzonden",completed:"Afgerond",cancelled:"Geannuleerd"}[s]||s||"Nieuw");
const payClass=s=>s==="paid"?"paid":["failed","canceled","expired","creation_failed"].includes(s)?"bad":"open";
const fulfillClass=s=>s==="processing"?"processing":s==="shipped"?"shipped":s==="completed"?"complete":s==="cancelled"?"bad":"open";
function showScreen(logged){q("#login").classList.toggle("hidden",logged);q("#app").classList.toggle("hidden",!logged)}
async function login(){
  const pin=q("#pin").value.trim();q("#loginError").textContent="";
  const r=await fetch("/api/admin-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin})}).catch(()=>null);
  const b=await r?.json().catch(()=>({}))||{};
  if(!r?.ok){q("#loginError").textContent=b.error||"Aanmelden mislukt.";return}
  token=b.token;sessionStorage.setItem("hbOrdersToken",token);showScreen(true);await load();
}
async function api(url,options={}){const r=await fetch(url,{...options,headers:{...(options.headers||{}),Authorization:"Bearer "+token,"Content-Type":"application/json"}});const b=await r.json().catch(()=>({}));if(r.status===401){sessionStorage.removeItem("hbOrdersToken");token="";showScreen(false);throw new Error("Sessie verlopen.");}if(!r.ok)throw new Error(b.error||"Er ging iets mis.");return b}
async function load(){try{const b=await api("/api/admin-orders?limit=200");orders=b.orders||[];render()}catch(e){q("#globalError").textContent=e.message}}
function render(){
  const search=q("#search").value.trim().toLowerCase(), pay=q("#payFilter").value, ful=q("#fulfillFilter").value;
  const filtered=orders.filter(o=>{const text=[o.id,o.customer_name,o.customer_email,o.customer_phone,o.delivery_street,o.delivery_number,o.delivery_postal_code,o.delivery_city].filter(Boolean).join(" ").toLowerCase();return(!search||text.includes(search))&&(pay==="all"||o.payment_status===pay)&&(ful==="all"||o.fulfillment_status===ful)});
  q("#statTotal").textContent=orders.length;q("#statPaid").textContent=orders.filter(o=>o.payment_status==="paid").length;q("#statNew").textContent=orders.filter(o=>o.payment_status==="paid"&&o.fulfillment_status==="new").length;q("#statOpen").textContent=orders.filter(o=>["open","pending"].includes(o.payment_status)).length;
  q("#orders").innerHTML=filtered.length?filtered.map(orderCard).join(""):'<div class="empty">Geen bestellingen gevonden.</div>';
}
function orderCard(o){
  const items=Array.isArray(o.items)?o.items:[], summary=items.slice(0,4).map(i=>esc(i.name||"Artikel")+" × "+Number(i.quantity||1)).join("<br>")+(items.length>4?"<br>+ "+(items.length-4)+" extra":"");
  const addr=[o.delivery_street,o.delivery_number,o.delivery_postal_code,o.delivery_city].filter(Boolean).join(" ");
  let next="";
  if(o.payment_status==="paid"&&o.fulfillment_status==="new")next='<button class="action next" data-status="processing">In behandeling</button>';
  else if(o.payment_status==="paid"&&o.fulfillment_status==="processing")next='<button class="action next" data-status="shipped">Verzonden</button>';
  else if(o.payment_status==="paid"&&o.fulfillment_status==="shipped")next='<button class="action done" data-status="completed">Afgerond</button>';
  return `<article class="order" data-id="${esc(o.id)}"><div class="order-grid">
  <div><strong>${esc(o.id)}</strong><div class="muted" style="font-weight:900;margin-top:4px">${esc(o.customer_name||"-")}</div><div class="muted">${esc(o.customer_email||"")}</div><div class="muted">${date(o.created_at)}</div></div>
  <div class="items">${summary||"Geen artikelen"}</div>
  <div class="muted"><strong>Levering</strong><br>${esc(addr||"-")}</div>
  <div><div style="font-size:18px;font-weight:900">${money(o.total)}</div><span class="status ${payClass(o.payment_status)}">${esc(payLabel(o.payment_status))}</span><br><span class="status ${fulfillClass(o.fulfillment_status)}">${esc(fulfillLabel(o.fulfillment_status))}</span></div>
  <div class="actions"><button class="action details" data-detail>Details</button>${next}</div>
  </div></article>`;
}
function showDetails(id){
  const o=orders.find(x=>x.id===id);if(!o)return;
  const items=Array.isArray(o.items)?o.items:[];
  const addr=[o.delivery_street,o.delivery_number,o.delivery_postal_code,o.delivery_city,o.delivery_country].filter(Boolean).join(" ");
  q("#modalTitle").textContent="Bestelling "+o.id;
  q("#modalBody").innerHTML=`<div class="detail-grid">
  <div class="detail"><label>Klant</label><div>${esc(o.customer_name||"-")}<br>${esc(o.customer_email||"-")}<br>${esc(o.customer_phone||"-")}</div></div>
  <div class="detail"><label>Leveradres</label><div>${esc(addr||"-")}</div></div>
  <div class="detail"><label>Besteld</label><div>${date(o.created_at)}</div></div>
  <div class="detail"><label>Betaling</label><div>${esc(payLabel(o.payment_status))}${o.payment_id?"<br><span class='muted'>"+esc(o.payment_id)+"</span>":""}</div></div>
  <div class="detail"><label>Verwerking</label><div>${esc(fulfillLabel(o.fulfillment_status))}</div></div>
  <div class="detail"><label>Promotie</label><div>${esc(o.discount_code||"Geen")} · ${money(o.discount||0)}</div></div>
  </div>
  <div class="modal-items">${items.map(i=>`<div class="modal-item"><span>${esc(i.name||"Artikel")} × ${Number(i.quantity||1)}${i.grams?" · "+esc(i.grams+" g"):""}</span><strong>${money(i.line_total||(Number(i.unit_price||0)*Number(i.quantity||1)))}</strong></div>`).join("")}</div>
  <div style="display:flex;justify-content:space-between;margin-top:16px;font-weight:900"><span>Totaal</span><strong>${money(o.total)}</strong></div>`;
  q("#modal").classList.add("open");
}
async function setStatus(id,status){
  try{await api("/api/admin-orders",{method:"PATCH",body:JSON.stringify({id,fulfillment_status:status})});await load()}catch(e){q("#globalError").textContent=e.message}
}
document.addEventListener("DOMContentLoaded",()=>{
  showScreen(Boolean(token));q("#loginButton").addEventListener("click",login);q("#pin").addEventListener("keydown",e=>{if(e.key==="Enter")login()});
  q("#refresh").addEventListener("click",load);q("#search").addEventListener("input",render);q("#payFilter").addEventListener("change",render);q("#fulfillFilter").addEventListener("change",render);
  q("#lock").addEventListener("click",()=>{sessionStorage.removeItem("hbOrdersToken");token="";showScreen(false)});
  q("#orders").addEventListener("click",e=>{const card=e.target.closest(".order");if(!card)return;if(e.target.closest("[data-detail]"))showDetails(card.dataset.id);const status=e.target.closest("[data-status]")?.dataset.status;if(status)setStatus(card.dataset.id,status)});
  q("#closeModal").addEventListener("click",()=>q("#modal").classList.remove("open"));q("#modal").addEventListener("click",e=>{if(e.target===q("#modal"))q("#modal").classList.remove("open")});
  if(token)load();
});
})();