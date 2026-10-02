(() => {
"use strict";
const supabaseClient=window.supabase.createClient(window.HUMMIE_SUPABASE_URL,window.HUMMIE_SUPABASE_PUBLISHABLE_KEY);
const q=(s,r=document)=>r.querySelector(s);
let orders=[];

const money=v=>new Intl.NumberFormat("nl-BE",{style:"currency",currency:"EUR"}).format(Number(v)||0);
const date=v=>v?new Intl.DateTimeFormat("nl-BE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"-";
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
const fullName=o=>[o.customer_first_name,o.customer_last_name].filter(Boolean).join(" ")||"-";
const payLabel=s=>({paid:"Betaald",pending:"In afwachting",failed:"Mislukt",refunded:"Terugbetaald"}[s]||s||"Onbekend");
const fulfillLabel=s=>({new:"Nieuw",preparing:"In behandeling",ready:"Klaar",shipped:"Verzonden",completed:"Afgerond",cancelled:"Geannuleerd"}[s]||s||"Nieuw");
const payClass=s=>s==="paid"?"paid":s==="failed"?"bad":s==="refunded"?"shipped":"open";
const fulfillClass=s=>s==="preparing"?"processing":s==="ready"?"shipped":s==="shipped"?"shipped":s==="completed"?"complete":s==="cancelled"?"bad":"open";

function showLogin(show){q("#login").classList.toggle("hidden",!show);q("#app").classList.toggle("hidden",show)}
function showError(text){q("#globalError").textContent=text||""}
function itemList(o){return Array.isArray(o.order_items)?o.order_items:[]}

const ALLOWED_EMAIL="yoran.berth1@gmail.com";

async function ensureSession(){
  const {data}=await supabaseClient.auth.getSession();
  if(data.session){
    if((data.session.user.email||"").toLowerCase()!==ALLOWED_EMAIL){
      await supabaseClient.auth.signOut();
      showLogin(true);
      q("#loginError").textContent="Dit Google-account heeft geen toegang tot het Hummie Bear-bestellingenbeheer.";
      return false;
    }
    await enterApp(data.session);return true;
  }
  showLogin(true);return false;
}

async function enterApp(session){
  if((session?.user?.email||"").toLowerCase()!==ALLOWED_EMAIL){
    await supabaseClient.auth.signOut();
    showLogin(true);
    q("#loginError").textContent="Dit Google-account heeft geen toegang tot het Hummie Bear-bestellingenbeheer.";
    return;
  }
  showLogin(false);
  q("#userEmail").textContent=session.user.email||"";
  await load();
}

async function login(){
  q("#loginError").textContent="";
  const {error}=await supabaseClient.auth.signInWithOAuth({
    provider:"google",
    options:{redirectTo:"https://hummiebear.be/bestellingen.html", queryParams:{access_type:"offline",prompt:"select_account"}}
  });
  if(error)q("#loginError").textContent=error.message||"Google-aanmelding mislukt.";
}

async function load(){
  showError("");
  const {data,error}=await supabaseClient
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at",{ascending:false})
    .limit(200);

  if(error){
    showError("Bestellingen konden niet worden geladen. Controleer of je account als medewerker/eigenaar is gekoppeld.");
    console.error(error);
    orders=[];render();return;
  }

  orders=data||[];
  render();
}

function render(){
  const search=q("#search").value.trim().toLowerCase();
  const pay=q("#payFilter").value;
  const fulfill=q("#fulfillFilter").value;

  const filtered=orders.filter(o=>{
    const address=[o.shipping_street,o.shipping_house_number,o.shipping_postal_code,o.shipping_city].filter(Boolean).join(" ");
    const text=[o.order_number,fullName(o),o.customer_email,o.customer_phone,address].filter(Boolean).join(" ").toLowerCase();
    return (!search||text.includes(search)) &&
      (pay==="all"||o.payment_status===pay) &&
      (fulfill==="all"||o.status===fulfill);
  });

  q("#statTotal").textContent=orders.length;
  q("#statPaid").textContent=orders.filter(o=>o.payment_status==="paid").length;
  q("#statNew").textContent=orders.filter(o=>o.payment_status==="paid"&&o.status==="new").length;
  q("#statOpen").textContent=orders.filter(o=>o.payment_status==="pending").length;

  q("#orders").innerHTML=filtered.length?filtered.map(orderCard).join(""):'<div class="empty">Geen bestellingen gevonden.</div>';
}

function nextAction(status){
  if(status==="new")return '<button class="action next" data-status="preparing">In behandeling</button>';
  if(status==="preparing")return '<button class="action next" data-status="ready">Klaar</button>';
  if(status==="ready")return '<button class="action next" data-status="shipped">Verzonden</button>';
  if(status==="shipped")return '<button class="action done" data-status="completed">Afgerond</button>';
  return "";
}

function orderCard(o){
  const items=itemList(o);
  const summary=items.slice(0,4).map(i=>esc(i.product_name||"Artikel")+" × "+Number(i.quantity||1)).join("<br>")+(items.length>4?"<br>+ "+(items.length-4)+" extra":"");
  const address=[o.shipping_street,o.shipping_house_number,o.shipping_postal_code,o.shipping_city].filter(Boolean).join(" ");

  return `<article class="order" data-id="${esc(o.id)}">
    <div class="order-grid">
      <div>
        <strong>${esc(o.order_number||o.id)}</strong>
        <div class="muted" style="font-weight:900;margin-top:4px">${esc(fullName(o))}</div>
        <div class="muted">${esc(o.customer_email||"")}</div>
        <div class="muted">${date(o.created_at)}</div>
      </div>
      <div class="items">${summary||"Geen artikelen"}</div>
      <div class="muted"><strong>Levering</strong><br>${esc(address||"-")}</div>
      <div>
        <div style="font-size:18px;font-weight:900">${money(o.total)}</div>
        <span class="status ${payClass(o.payment_status)}">${esc(payLabel(o.payment_status))}</span><br>
        <span class="status ${fulfillClass(o.status)}">${esc(fulfillLabel(o.status))}</span>
      </div>
      <div class="actions"><button class="action details" data-detail>Details</button>${o.payment_status==="paid"?nextAction(o.status):""}</div>
    </div>
  </article>`;
}

function showDetails(id){
  const o=orders.find(x=>x.id===id);if(!o)return;
  const items=itemList(o);
  const address=[o.shipping_street,o.shipping_house_number,o.shipping_postal_code,o.shipping_city,o.shipping_country].filter(Boolean).join(" ");

  q("#modalTitle").textContent="Bestelling "+(o.order_number||o.id);
  q("#modalBody").innerHTML=`
    <div class="detail-grid">
      <div class="detail"><label>Klant</label><div>${esc(fullName(o))}<br>${esc(o.customer_email||"-")}<br>${esc(o.customer_phone||"-")}</div></div>
      <div class="detail"><label>Leveradres</label><div>${esc(address||"-")}</div></div>
      <div class="detail"><label>Besteld</label><div>${date(o.created_at)}</div></div>
      <div class="detail"><label>Betaling</label><div>${esc(payLabel(o.payment_status))}${o.payment_reference?"<br><span class='muted'>"+esc(o.payment_reference)+"</span>":""}</div></div>
      <div class="detail"><label>Verwerking</label><div>${esc(fulfillLabel(o.status))}</div></div>
      <div class="detail"><label>Promotie</label><div>${esc(o.discount_code||"Geen")} · ${money(o.discount_amount||0)}</div></div>
    </div>
    <div class="modal-items">${items.map(i=>`<div class="modal-item"><span>${esc(i.product_name||"Artikel")} × ${Number(i.quantity||1)}${i.meta?.grams?" · "+esc(i.meta.grams+" g"):""}</span><strong>${money(i.line_total)}</strong></div>`).join("")}</div>
    <div style="margin-top:16px;display:grid;gap:6px;font-size:11px">
      <div style="display:flex;justify-content:space-between"><span>Subtotaal</span><strong>${money(o.subtotal)}</strong></div>
      <div style="display:flex;justify-content:space-between"><span>Verzending</span><strong>${money(o.shipping_cost)}</strong></div>
      <div style="display:flex;justify-content:space-between;font-size:16px;border-top:1px solid var(--line);padding-top:10px"><span>Totaal</span><strong>${money(o.total)}</strong></div>
    </div>`;
  q("#modal").classList.add("open");
}

async function setStatus(id,status){
  const {error}=await supabaseClient.from("orders").update({status,updated_at:new Date().toISOString()}).eq("id",id);
  if(error){showError("Bestelling kon niet worden bijgewerkt.");console.error(error);return}
  await load();
}

document.addEventListener("DOMContentLoaded",async()=>{
  q("#googleLoginButton").addEventListener("click",login);
  q("#refresh").addEventListener("click",load);
  q("#search").addEventListener("input",render);
  q("#payFilter").addEventListener("change",render);
  q("#fulfillFilter").addEventListener("change",render);
  q("#lock").addEventListener("click",async()=>{await supabaseClient.auth.signOut();showLogin(true);q("#loginError").textContent="";});
  q("#orders").addEventListener("click",e=>{
    const card=e.target.closest(".order");if(!card)return;
    if(e.target.closest("[data-detail]"))showDetails(card.dataset.id);
    const status=e.target.closest("[data-status]")?.dataset.status;
    if(status)setStatus(card.dataset.id,status);
  });
  q("#closeModal").addEventListener("click",()=>q("#modal").classList.remove("open"));
  q("#modal").addEventListener("click",e=>{if(e.target===q("#modal"))q("#modal").classList.remove("open")});
  await ensureSession();
});
})();