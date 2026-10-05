(() => {
"use strict";
const supabaseClient=window.supabase.createClient(window.HUMMIE_SUPABASE_URL,window.HUMMIE_SUPABASE_PUBLISHABLE_KEY);
const q=(s,r=document)=>r.querySelector(s);
let orders=[];
let quotes=[];
let activeSection="overview";

const money=v=>new Intl.NumberFormat("nl-BE",{style:"currency",currency:"EUR"}).format(Number(v)||0);
const date=v=>v?new Intl.DateTimeFormat("nl-BE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"-";
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
const fullName=o=>[o.customer_first_name,o.customer_last_name].filter(Boolean).join(" ")||"-";
const payLabel=s=>({paid:"Betaald",pending:"In afwachting",failed:"Mislukt",refunded:"Terugbetaald"}[s]||s||"Onbekend");
const fulfillLabel=s=>({new:"Nieuw",preparing:"In behandeling",ready:"Klaar",shipped:"Verzonden",completed:"Afgerond",cancelled:"Geannuleerd"}[s]||s||"Nieuw");
const payClass=s=>s==="paid"?"paid":s==="failed"?"bad":s==="refunded"?"shipped":"open";
const fulfillClass=s=>s==="preparing"?"processing":s==="ready"?"shipped":s==="shipped"?"shipped":s==="completed"?"complete":s==="cancelled"?"bad":"open";
const quoteStatusLabel=s=>({new:"Nieuw",in_progress:"In behandeling",accepted:"Aanvaard",rejected:"Geweigerd",cancelled:"Geannuleerd"}[s]||s||"Onbekend");
const quoteStatusClass=s=>s==="accepted"?"complete":(s==="rejected"||s==="cancelled"?"bad":(s==="in_progress"?"processing":"open"));


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

  const [ordersResult,quotesResult]=await Promise.all([
    supabaseClient
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at",{ascending:false})
      .limit(200),

    supabaseClient
      .from("quotes")
      .select("*")
      .order("created_at",{ascending:false})
      .limit(200)
  ]);

  if(ordersResult.error) console.error("Orders laden:",ordersResult.error);
  if(quotesResult.error) console.error("Offertes laden:",quotesResult.error);

  orders=ordersResult.error?[]:(ordersResult.data||[]);
  quotes=quotesResult.error?[]:(quotesResult.data||[]);

  if(ordersResult.error&&quotesResult.error){
    showError("Bestellingen en offertes konden niet worden geladen. Controleer je medewerkersaccount.");
  }else if(quotesResult.error){
    showError("Bestellingen zijn geladen, maar offertes konden niet worden geladen.");
  }else if(ordersResult.error){
    showError("Offertes zijn geladen, maar webshopbestellingen konden niet worden geladen.");
  }

  render();
}

function getFilteredOrders(){
  const search=q("#search").value.trim().toLowerCase();
  const pay=q("#payFilter").value;
  const fulfill=q("#fulfillFilter").value;

  return orders.filter(o=>{
    const address=[
      o.shipping_street,
      o.shipping_house_number,
      o.shipping_postal_code,
      o.shipping_city
    ].filter(Boolean).join(" ");

    const text=[
      o.order_number,
      fullName(o),
      o.customer_email,
      o.customer_phone,
      address,
      ...itemList(o).map(item=>item.product_name)
    ].filter(Boolean).join(" ").toLowerCase();

    return (!search||text.includes(search)) &&
      (pay==="all"||o.payment_status===pay) &&
      (fulfill==="all"||o.status===fulfill);
  });
}

function getFilteredQuotes(){
  const search=q("#search").value.trim().toLowerCase();
  const fulfill=q("#fulfillFilter").value;

  return quotes.filter(quote=>{
    const text=[
      quote.name,
      quote.organisation,
      quote.email,
      quote.phone,
      quote.event_name,
      quote.location,
      quote.edition,
      quote.message
    ].filter(Boolean).join(" ").toLowerCase();

    const quoteStatusOk=fulfill==="all"||
      (fulfill==="new"&&quote.status==="new")||
      (fulfill==="preparing"&&quote.status==="in_progress")||
      ((fulfill==="ready"||fulfill==="shipped"||fulfill==="completed")&&quote.status==="accepted")||
      (fulfill==="cancelled"&&quote.status==="cancelled");

    return (!search||text.includes(search)) && quoteStatusOk;
  });
}

function renderOverview(){
  const recentOrders=getFilteredOrders()
    .slice()
    .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))
    .slice(0,6);

  const recentQuotes=getFilteredQuotes()
    .slice()
    .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))
    .slice(0,6);

  q("#overviewOrders").innerHTML=recentOrders.length
    ? recentOrders.map(orderCard).join("")
    : '<div class="section-empty">Geen webshopbestellingen gevonden.</div>';

  q("#overviewQuotes").innerHTML=recentQuotes.length
    ? recentQuotes.map(quoteCard).join("")
    : '<div class="section-empty">Geen offerteaanvragen gevonden.</div>';
}

function renderManagement(){
  const filtered=activeSection==="orders"
    ? getFilteredOrders().map(item=>({type:"order",created_at:item.created_at,item}))
    : getFilteredQuotes().map(item=>({type:"quote",created_at:item.created_at,item}));

  filtered.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));

  q("#orders").innerHTML=filtered.length
    ? filtered.map(entry=>entry.type==="quote"?quoteCard(entry.item):orderCard(entry.item)).join("")
    : '<div class="empty">Geen aanvragen gevonden in deze categorie.</div>';

  const isOrders=activeSection==="orders";
  q("#managementEyebrow").textContent=isOrders?"WEBSHOP":"OFFERTES";
  q("#managementTitle").textContent=isOrders?"Webshopbestellingen":"Offerteaanvragen";
  q("#managementSubtitle").textContent=isOrders
    ?"Alle webshopbestellingen met betaling en verwerking."
    :"Alle offerteaanvragen met klantgegevens, prijsindicatie en status.";

  q("#payFilter").disabled=!isOrders;
  q("#payFilter").classList.toggle("filter-disabled",!isOrders);
}

function render(){
  q("#statTotal").textContent=orders.length+quotes.length;
  q("#statOrders").textContent=orders.length;
  q("#statQuotes").textContent=quotes.length;
  q("#statNew").textContent=
    orders.filter(o=>o.status==="new").length+
    quotes.filter(quote=>quote.status==="new").length;

  q("#tabCountOverview").textContent=orders.length+quotes.length;
  q("#tabCountOrders").textContent=orders.length;
  q("#tabCountQuotes").textContent=quotes.length;

  if(activeSection==="overview"){
    q("#overviewView").classList.remove("hidden");
    q("#managementView").classList.add("hidden");
    q("#payFilter").disabled=false;
    q("#payFilter").classList.remove("filter-disabled");
    renderOverview();
  }else{
    q("#overviewView").classList.add("hidden");
    q("#managementView").classList.remove("hidden");
    renderManagement();
  }
}

function setSection(section){
  activeSection=section;

  document.querySelectorAll(".section-tab").forEach(tab=>{
    tab.classList.toggle("active",tab.dataset.section===section);
  });

  if(section==="overview"){
    q("#managementView").classList.add("hidden");
    q("#overviewView").classList.remove("hidden");
  }else{
    q("#overviewView").classList.add("hidden");
    q("#managementView").classList.remove("hidden");
  }

  render();
}
function nextAction(status){
  if(status==="new")return '<button class="action next" data-status="preparing">In behandeling</button>';
  if(status==="preparing")return '<button class="action next" data-status="ready">Klaar</button>';
  if(status==="ready")return '<button class="action next" data-status="shipped">Verzonden</button>';
  if(status==="shipped")return '<button class="action done" data-status="completed">Afgerond</button>';
  return "";
}

function quoteActions(quote){
  if(quote.status==="new"){
    return '<button class="action next" data-quote-status="in_progress">In behandeling</button>' +
      '<button class="action done" data-quote-status="accepted">Aanvaarden</button>' +
      '<button class="action" data-quote-status="rejected">Weigeren</button>';
  }

  if(quote.status==="in_progress"){
    return '<button class="action done" data-quote-status="accepted">Aanvaarden</button>' +
      '<button class="action" data-quote-status="rejected">Weigeren</button>';
  }

  return "";
}

function quoteCard(quote){
  const selectedEdition=
    quote.edition==="both"
      ?"Beide editions"
      :quote.edition==="candy"
        ?"Candy Edition"
        :quote.edition==="waffle"
          ?"Waffle Edition"
          :(quote.edition||"Offerte");

  return '<article class="order" data-type="quote" data-id="'+esc(quote.id)+'">' +
    '<div class="order-grid">' +
      '<div>' +
        '<strong>OFFERTE</strong>' +
        '<div class="muted" style="font-weight:900;margin-top:4px">'+esc(quote.name||"-")+'</div>' +
        '<div class="muted">'+esc(quote.email||"")+'</div>' +
        '<div class="muted">'+date(quote.created_at)+'</div>' +
      '</div>' +
      '<div class="items">' +
        '<strong>'+esc(quote.event_name||"Offerteaanvraag")+'</strong><br>' +
        esc(selectedEdition) +
        (quote.guests?"<br>"+esc(quote.guests+" personen"):"") +
      '</div>' +
      '<div class="muted"><strong>Locatie</strong><br>'+esc(quote.location||"-")+'</div>' +
      '<div>' +
        '<div style="font-size:18px;font-weight:900">'+money(quote.estimated_price)+'</div>' +
        '<span class="status open">Offerte</span><br>' +
        '<span class="status '+quoteStatusClass(quote.status)+'">'+esc(quoteStatusLabel(quote.status))+'</span>' +
      '</div>' +
      '<div class="actions">' +
        '<button class="action details" data-detail>Details</button>' +
        quoteActions(quote) +
      '</div>' +
    '</div>' +
  '</article>';
}

function orderCard(o){
  const items=itemList(o);
  const summary=items.slice(0,4).map(i=>esc(i.product_name||"Artikel")+" × "+Number(i.quantity||1)).join("<br>")+(items.length>4?"<br>+ "+(items.length-4)+" extra":"");
  const address=[o.shipping_street,o.shipping_house_number,o.shipping_postal_code,o.shipping_city].filter(Boolean).join(" ");

  return `<article class="order" data-type="order" data-id="${esc(o.id)}">
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

function showOrderDetails(id){
  const o=orders.find(x=>x.id===id);
  if(!o)return;

  const items=itemList(o);
  const address=[
    o.shipping_street,
    o.shipping_house_number,
    o.shipping_postal_code,
    o.shipping_city,
    o.shipping_country
  ].filter(Boolean).join(" ");

  q("#modalTitle").textContent="Bestelling "+(o.order_number||o.id);
  q("#modalBody").innerHTML=
    '<div class="detail-grid">' +
      '<div class="detail"><label>Klant</label><div>'+esc(fullName(o))+'<br>'+esc(o.customer_email||"-")+'<br>'+esc(o.customer_phone||"-")+'</div></div>' +
      '<div class="detail"><label>Leveradres</label><div>'+esc(address||"-")+'</div></div>' +
      '<div class="detail"><label>Besteld</label><div>'+date(o.created_at)+'</div></div>' +
      '<div class="detail"><label>Betaling</label><div>'+esc(payLabel(o.payment_status))+(o.payment_reference?"<br><span class='muted'>"+esc(o.payment_reference)+"</span>":"")+'</div></div>' +
      '<div class="detail"><label>Verwerking</label><div>'+esc(fulfillLabel(o.status))+'</div></div>' +
      '<div class="detail"><label>Promotie</label><div>'+esc(o.discount_code||"Geen")+' · '+money(o.discount_amount||0)+'</div></div>' +
    '</div>' +
    '<div class="modal-items">'+items.map(i=>'<div class="modal-item"><span>'+esc(i.product_name||"Artikel")+' × '+Number(i.quantity||1)+(i.meta?.grams?" · "+esc(i.meta.grams+" g"):"")+'</span><strong>'+money(i.line_total)+'</strong></div>').join("")+'</div>' +
    '<div style="margin-top:16px;display:grid;gap:6px;font-size:11px">' +
      '<div style="display:flex;justify-content:space-between"><span>Subtotaal</span><strong>'+money(o.subtotal)+'</strong></div>' +
      '<div style="display:flex;justify-content:space-between"><span>Verzending</span><strong>'+money(o.shipping_cost)+'</strong></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:16px;border-top:1px solid var(--line);padding-top:10px"><span>Totaal</span><strong>'+money(o.total)+'</strong></div>' +
    '</div>';
  q("#modal").classList.add("open");
}

function showQuoteDetails(id){
  const quote=quotes.find(x=>x.id===id);
  if(!quote)return;

  const options=quote.options&&typeof quote.options==="object"
    ?JSON.stringify(quote.options,null,2)
    :"";

  q("#modalTitle").textContent="Offerteaanvraag";
  q("#modalBody").innerHTML=
    '<div class="detail-grid">' +
      '<div class="detail"><label>Klant</label><div>'+esc(quote.name||"-")+'<br>'+esc(quote.email||"-")+'<br>'+esc(quote.phone||"-")+'</div></div>' +
      '<div class="detail"><label>Organisatie</label><div>'+esc(quote.organisation||"-")+'</div></div>' +
      '<div class="detail"><label>Evenement</label><div>'+esc(quote.event_name||"-")+'<br>'+esc(quote.event_date||"-")+'</div></div>' +
      '<div class="detail"><label>Locatie</label><div>'+esc(quote.location||"-")+'</div></div>' +
      '<div class="detail"><label>Formule</label><div>'+esc(quote.edition||"-")+'</div></div>' +
      '<div class="detail"><label>Personen</label><div>'+esc(quote.guests||"-")+'</div></div>' +
      '<div class="detail"><label>Prijsindicatie</label><div>'+money(quote.estimated_price)+'</div></div>' +
      '<div class="detail"><label>Status</label><div>'+esc(quoteStatusLabel(quote.status))+'</div></div>' +
      '<div class="detail full"><label>Praktische info</label><div>'+esc(quote.practical_notes||"-")+'</div></div>' +
      '<div class="detail full"><label>Bericht</label><div>'+esc(quote.message||"-")+'</div></div>' +
      '<div class="detail full"><label>Gekozen opties</label><pre style="white-space:pre-wrap;margin:0;font:inherit">'+esc(options||"-")+'</pre></div>' +
    '</div>';
  q("#modal").classList.add("open");
}

function showDetails(type,id){
  if(type==="quote"){showQuoteDetails(id);return;}
  showOrderDetails(id);
}


function emailShell(title,content,accent="#ed9fbd"){
  return `<!doctype html>
  <html lang="nl">
  <body style="margin:0;background:#fbf3ea;font-family:Arial,Helvetica,sans-serif;color:#3a281f">
    <div style="max-width:620px;margin:30px auto;background:#fff;border:1px solid #eaded5;border-radius:22px;overflow:hidden">
      <div style="padding:24px;background:${accent};color:#fff">
        <div style="font-size:18px;font-weight:900">Hummie Bear</div>
      </div>
      <div style="padding:28px">
        <h1 style="margin:0 0 14px;font-size:25px">${title}</h1>
        <div style="font-size:14px;line-height:1.7">${content}</div>
        <p style="margin-top:26px;color:#786f68;font-size:12px">
          Met zoete groeten,<br><strong>Hummie Bear</strong>
        </p>
      </div>
    </div>
  </body>
  </html>`;
}

async function sendCustomerEmail({to,subject,html}){
  if(!to) throw new Error("Geen klant e-mailadres beschikbaar.");

  const {data,error}=await supabaseClient.functions.invoke("hummie-bear-email",{
    body:{to,subject,html}
  });

  if(error) throw error;
  if(data?.error) throw new Error(data.error);

  return data;
}

async function sendOrderShippedEmail(order){
  const orderNumber=order.order_number||order.id;
  const customerName=fullName(order);
  const total=money(order.total);

  return sendCustomerEmail({
    to:order.customer_email,
    subject:`Je Hummie Bear bestelling ${orderNumber} is onderweg!`,
    html:emailShell(
      "Je bestelling is onderweg!",
      `<p>Dag ${esc(customerName)},</p>
       <p>Goed nieuws: je Hummie Bear bestelling <strong>${esc(orderNumber)}</strong> is mee met de levering.</p>
       <p><strong>Totaalbedrag:</strong> ${esc(total)}</p>
       <p>We hopen dat je er veel plezier van hebt. Bedankt voor je bestelling bij Hummie Bear!</p>`,
      "#3c6fa3"
    )
  });
}

async function sendQuoteAcceptedEmail(quote){
  const guestText=quote.guests?`${quote.guests} personen`:"-";
  const priceText=quote.estimated_price!=null?money(quote.estimated_price):"Op maat";
  const dateText=quote.event_date||"nog niet vastgelegd";

  return sendCustomerEmail({
    to:quote.email,
    subject:"Je Hummie Bear offerte is aanvaard!",
    html:emailShell(
      "Je offerte is aanvaard!",
      `<p>Dag ${esc(quote.name||"daar")},</p>
       <p>Goed nieuws: je offerteaanvraag voor <strong>${esc(quote.event_name||"jouw evenement")}</strong> is door Hummie Bear aanvaard.</p>
       <p>
         <strong>Evenement:</strong> ${esc(quote.event_name||"-")}<br>
         <strong>Datum:</strong> ${esc(dateText)}<br>
         <strong>Aantal personen:</strong> ${esc(guestText)}<br>
         <strong>Prijsindicatie:</strong> ${esc(priceText)}
       </p>
       <p>We nemen verder contact met je op om de laatste details definitief vast te leggen.</p>`,
      "#d86092"
    )
  });
}

async function setStatus(id,status){
  const order=orders.find(item=>item.id===id);
  if(!order) return;

  const previousStatus=order.status;

  const {error}=await supabaseClient
    .from("orders")
    .update({status,updated_at:new Date().toISOString()})
    .eq("id",id);

  if(error){
    showError("Bestelling kon niet worden bijgewerkt.");
    console.error(error);
    return;
  }

  await load();

  if(status==="shipped"&&previousStatus!=="shipped"){
    try{
      await sendOrderShippedEmail({...order,status});
      showError("");
    }catch(emailError){
      console.error("Onderweg-mail:",emailError);
      showError("Bestelling staat op 'Verzonden', maar de klantmail kon niet worden verstuurd.");
    }
  }
}

async function setQuoteStatus(id,status){
  const quote=quotes.find(item=>item.id===id);
  if(!quote) return;

  const previousStatus=quote.status;

  const {error}=await supabaseClient
    .from("quotes")
    .update({status,updated_at:new Date().toISOString()})
    .eq("id",id);

  if(error){
    showError("Offerte kon niet worden bijgewerkt.");
    console.error(error);
    return;
  }

  await load();

  if(status==="accepted"&&previousStatus!=="accepted"){
    try{
      await sendQuoteAcceptedEmail({...quote,status});
      showError("");
    }catch(emailError){
      console.error("Aanvaard-mail:",emailError);
      showError("Offerte is aanvaard, maar de klantmail kon niet worden verstuurd.");
    }
  }
}

let refreshTimer=null;

document.addEventListener("DOMContentLoaded",async()=>{
  q("#googleLoginButton").addEventListener("click",login);

  q("#refresh").addEventListener("click",async()=>{
    q("#refresh").disabled=true;
    q("#refresh").textContent="Vernieuwen…";
    try{
      await load();
    }finally{
      q("#refresh").disabled=false;
      q("#refresh").textContent="Vernieuwen";
    }
  });

  q("#search").addEventListener("input",render);
  q("#payFilter").addEventListener("change",render);
  q("#fulfillFilter").addEventListener("change",render);

  document.querySelectorAll(".section-tab").forEach(tab=>{
    tab.addEventListener("click",()=>setSection(tab.dataset.section));
  });

  document.querySelectorAll("[data-section-jump]").forEach(button=>{
    button.addEventListener("click",()=>setSection(button.dataset.sectionJump));
  });

  q("#lock").addEventListener("click",async()=>{
    if(refreshTimer) clearInterval(refreshTimer);
    await supabaseClient.auth.signOut();
    showLogin(true);
    q("#loginError").textContent="";
  });

  q("#orders").addEventListener("click",e=>{
    const card=e.target.closest(".order");
    if(!card)return;

    const type=card.dataset.type||"order";
    const id=card.dataset.id;

    if(e.target.closest("[data-detail]")){
      showDetails(type,id);
      return;
    }

    const orderStatus=e.target.closest("[data-status]")?.dataset.status;
    if(orderStatus&&type==="order"){
      setStatus(id,orderStatus);
      return;
    }

    const quoteStatus=e.target.closest("[data-quote-status]")?.dataset.quoteStatus;
    if(quoteStatus&&type==="quote"){
      setQuoteStatus(id,quoteStatus);
    }
  });

  q("#overviewOrders").addEventListener("click",e=>{
    const card=e.target.closest(".order");
    if(!card)return;

    const type=card.dataset.type||"order";
    const id=card.dataset.id;

    if(e.target.closest("[data-detail]")){
      showDetails(type,id);
      return;
    }

    const orderStatus=e.target.closest("[data-status]")?.dataset.status;
    if(orderStatus&&type==="order"){
      setStatus(id,orderStatus);
      return;
    }

    const quoteStatus=e.target.closest("[data-quote-status]")?.dataset.quoteStatus;
    if(quoteStatus&&type==="quote"){
      setQuoteStatus(id,quoteStatus);
    }
  });

  q("#overviewQuotes").addEventListener("click",e=>{
    const card=e.target.closest(".order");
    if(!card)return;

    const type=card.dataset.type||"quote";
    const id=card.dataset.id;

    if(e.target.closest("[data-detail]")){
      showDetails(type,id);
      return;
    }

    const quoteStatus=e.target.closest("[data-quote-status]")?.dataset.quoteStatus;
    if(quoteStatus&&type==="quote"){
      setQuoteStatus(id,quoteStatus);
    }
  });

  q("#closeModal").addEventListener("click",()=>q("#modal").classList.remove("open"));
  q("#modal").addEventListener("click",e=>{
    if(e.target===q("#modal")) q("#modal").classList.remove("open");
  });

  await ensureSession();

  refreshTimer=setInterval(()=>{
    if(!q("#app").classList.contains("hidden")) load();
  },30000);
});
})();