const $=s=>document.querySelector(s);
let config=null,serverReady=false,cart=[],qty=1,choices={chocolate:null,sauce:null,toppings:[]},paymentMethod='mollie',soundOn=true,lastOrderIds=new Set();
const money=c=>(Number(c||0)/100).toLocaleString('nl-BE',{style:'currency',currency:'EUR'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const team=new URLSearchParams(location.search).get('team')==='1';
const photos={
 hero:'https://ggm.bynder.com/asset/a05b3439-d9e6-4deb-a226-786436f9474a/JPG/lolly_on_a_stick_waffle-jpg.jpg',
 'choc-milk':'https://funchal.vtexassets.com/arquivos/ids/207635/foto_1_003.jpg?v=638724684416130000',
 'choc-white':'https://snapcalorie-webflow-website.s3.us-east-2.amazonaws.com/media/recipe_pics_v2/medium/white_chocolate_sauce.jpg',
 'sauce-strawberry':'https://www.linsfood.com/wp-content/uploads/2018/06/Strawberry-Coulis.jpg',
 'sauce-caramel':'https://bakewithzoha.com/wp-content/uploads/2024/09/salted-caramel-3.jpg',
 'top-brazil':'https://centraldealimentos.cdn.magazord.com.br/img/2025/10/produto/11078/castanha.png?ims=fit-in%2F600x600%2Ffilters%3Afill%28white%29',
 'top-oreo':'https://www.porkkinggood.com/cdn/shop/articles/oreo_crumbs.png?v=1583931390&width=900',
 'top-speculoos':'https://www.ovgrp.com/api/media/file/2031-Speculoos-Biscuit-Crumb-1.jpg',
 'top-marshmallow':'https://www.gabrielecoffee.co.uk/image/cache/catalog/Swwet-Things/Mini-White-Marsh-NEW1-800x800.jpg',
 'top-coco':'https://upload.wikimedia.org/wikipedia/commons/3/3d/Chocolate_Balls_with_Cocoa_Powder.jpg',
 'top-sprinkles':'https://www.webstaurantstore.com/images/products/extra_large/757305/2805482.jpg'
};
const fallbackEmoji={'choc-milk':'🍫','choc-white':'🍫','sauce-strawberry':'🍓','sauce-caramel':'🍯','top-brazil':'🥜','top-oreo':'🍪','top-speculoos':'🍪','top-marshmallow':'☁️','top-coco':'🍫','top-sprinkles':'🌈'};
if(team){$('#customer-view').hidden=true;$('#kitchen-view').hidden=false;initKitchen()}else initCustomer();

async function api(url,opts={}){const r=await fetch(url,{...opts,headers:{'content-type':'application/json',...(opts.headers||{})},cache:'no-store'});const d=await r.json().catch(()=>({error:'Ongeldige serverrespons'}));if(!r.ok)throw new Error(d.error||'Er ging iets mis');return d}
const demoOptions=[
 {id:'choc-milk',name:'Melkchocolade',kind:'chocolate'},
 {id:'choc-white',name:'Witte chocolade',kind:'chocolate'},
 {id:'sauce-strawberry',name:'Aardbeiensaus',kind:'sauce'},
 {id:'sauce-caramel',name:'Caramelsaus',kind:'sauce'},
 {id:'top-brazil',name:'Braziliaanse nootjes',kind:'topping'},
 {id:'top-oreo',name:'Oreo-kruimels',kind:'topping'},
 {id:'top-speculoos',name:'Speculooskruimels',kind:'topping'},
 {id:'top-marshmallow',name:'Marshmallows',kind:'topping'},
 {id:'top-coco',name:'Kleine coco balls',kind:'topping'},
 {id:'top-sprinkles',name:'Sprinkles',kind:'topping'}
];
async function initCustomer(){
  $('#minus').onclick=()=>{qty=Math.max(1,qty-1);$('#qty').textContent=qty;updateTotals()};
  $('#plus').onclick=()=>{qty=Math.min(20,qty+1);$('#qty').textContent=qty;updateTotals()};
  $('#add-order').onclick=addItems;$('#checkout').onclick=checkout;
  document.querySelectorAll('[data-payment]').forEach(b=>b.onclick=()=>{paymentMethod=b.dataset.payment;document.querySelectorAll('[data-payment]').forEach(x=>x.classList.toggle('selected',x===b));updatePaymentLabel()});
  try{
    config=await api('/api/kiosk-config.js');
    if(!Array.isArray(config.options)||config.options.length===0)throw new Error('De productkeuzes zijn nog niet beschikbaar.');
    serverReady=true;
  }catch(e){
    serverReady=false;
    config={event_name:'Lollywafel Edition',mode:'paid',base_price_cents:500,extra_topping_price_cents:50,options:demoOptions};
    notice('Previewmodus: je kan de keuzes en winkelmand testen. Bestellingen/betalingen worden pas actief nadat de serverinstellingen zijn ingevuld.',true);
  }
  $('#event-label').textContent=config.event_name||'Lollywafel Edition';
  $('#price-label').textContent=config.mode==='included'?'Inbegrepen per wafel':'Prijs per wafel';
  $('#payment-note').textContent=serverReady?(config.mode==='included'?'Dit is een inbegrepen bestelling; er wordt geen betaling gevraagd.':'Online betalen gaat veilig via Mollie. Kies cash als je in de truck wilt betalen.'):'Visuele preview: selecteren werkt, maar er worden nog geen echte bestellingen aangemaakt.';
  $('#topping-note').textContent=config.mode==='included'?'OPTIONEEL · inbegrepen':'OPTIONEEL · € 0,50 per topping per wafel';
  $('#payment-options').hidden=config.mode==='included';
  renderOptions('chocolate-options',config.options.filter(o=>o.kind==='chocolate'),'chocolate');
  renderOptions('sauce-options',config.options.filter(o=>o.kind==='sauce'),'sauce');
  renderOptions('topping-options',config.options.filter(o=>o.kind==='topping'),'toppings');
  updatePaymentLabel();updateTotals();
}
function productPhoto(id,kind){return photos[id]||photos.hero}
function renderOptions(target,items,kind){
  const el=$('#'+target);
  if(!items.length){el.innerHTML='<p class="choice-error">Geen keuzes beschikbaar. Controleer de voorraad op het bakscherm.</p>';return}
  el.innerHTML=items.map(o=>{
    const selected=kind==='toppings'?choices.toppings.includes(o.id):choices[kind]===o.id;
    const label=kind==='toppings'?(config.mode==='included'?'Inbegrepen':'+ '+money(config.extra_topping_price_cents)):(kind==='chocolate'?'Tik om te kiezen':'Tik om te kiezen');
    return '<button type="button" class="product-choice '+(selected?'selected':'')+'" data-kind="'+kind+'" data-id="'+esc(o.id)+'" aria-pressed="'+selected+'"><span class="choice-photo-wrap"><img class="choice-photo" src="'+esc(productPhoto(o.id,kind))+'" alt="'+esc(o.name)+'" loading="eager" decoding="async" onerror="this.hidden=true"><span class="choice-photo-fallback" aria-hidden="true">'+(fallbackEmoji[o.id]||'✨')+'</span><span class="choice-check" aria-hidden="true">✓</span></span><span class="choice-label">'+esc(o.name)+'</span><span class="choice-caption">'+esc(label)+'</span></button>';
  }).join('');
  el.querySelectorAll('.product-choice').forEach(b=>b.addEventListener('click',()=>{
    const id=b.dataset.id,k=b.dataset.kind;
    if(k==='toppings'){
      choices.toppings=choices.toppings.includes(id)?choices.toppings.filter(x=>x!==id):[...choices.toppings,id];
      b.classList.toggle('selected',choices.toppings.includes(id));b.setAttribute('aria-pressed',String(choices.toppings.includes(id)));
    }else{
      choices[k]=id;el.querySelectorAll('.product-choice').forEach(x=>{const s=x===b;x.classList.toggle('selected',s);x.setAttribute('aria-pressed',String(s))});
    }
    updateTotals();
  }));
}
function draftPrice(){return config.base_price_cents+choices.toppings.length*config.extra_topping_price_cents}
function updateTotals(){
  if(!config)return;
  $('#price-label').textContent=config.mode==='included'?'Inbegrepen bij het evenement':(qty===1?'Totaal voor 1 wafel':'Totaal voor '+qty+' wafels');
  $('#total').textContent=config.mode==='included'?'Inbegrepen':money(draftPrice()*qty);
  $('#grand-total').textContent=config.mode==='included'?'Inbegrepen':money(cart.reduce((s,i)=>s+i.price_cents,0));
  $('#cart-count').textContent=cart.length+' '+(cart.length===1?'wafel':'wafels');
  $('#add-order').innerHTML='Voeg '+qty+' '+(qty===1?'wafel':'wafels')+' toe <span aria-hidden="true">＋</span>';
  updatePaymentLabel();
}
function updatePaymentLabel(){
  if(!config)return;
  $('#checkout').textContent=config.mode==='included'?'Plaats bestelling':paymentMethod==='cash'?'Bestellen · cash in de truck':'Veilig betalen via Mollie';
  $('#payment-note').textContent=config.mode==='included'?'Je hoeft niet te betalen; deze bestelling valt binnen het evenement.':paymentMethod==='cash'?'Je betaalt cash aan onze medewerker in de truck. De bestelling verschijnt meteen op het bakscherm.':'Je wordt doorgestuurd naar de veilige online betaalpagina van Mollie.';
}
function addItems(){
  const name=$('#customer-name').value.trim();
  if(!name){notice('Vul eerst je voornaam in.');$('#customer-name').focus();return}
  if(!choices.chocolate||!choices.sauce){notice('Kies eerst een chocolade én een saus.');return}
  const ch=config.options.find(o=>o.id===choices.chocolate),sa=config.options.find(o=>o.id===choices.sauce),tops=choices.toppings.map(id=>config.options.find(o=>o.id===id)).filter(Boolean);
  if(!ch||!sa){notice('Een gekozen ingrediënt is niet meer beschikbaar. Kies opnieuw.');return}
  for(let i=0;i<qty;i++)cart.push({chocolate_id:ch.id,chocolate:ch.name,sauce_id:sa.id,sauce:sa.name,topping_ids:tops.map(t=>t.id),toppings:tops.map(t=>t.name),price_cents:draftPrice()});
  renderCart();choices={chocolate:null,sauce:null,toppings:[]};qty=1;$('#qty').textContent='1';
  renderOptions('chocolate-options',config.options.filter(o=>o.kind==='chocolate'),'chocolate');renderOptions('sauce-options',config.options.filter(o=>o.kind==='sauce'),'sauce');renderOptions('topping-options',config.options.filter(o=>o.kind==='topping'),'toppings');updateTotals();
  notice('Toegevoegd aan je bestelling. Je kan nog een andere wafel samenstellen.');$('#cart-items').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function renderCart(){
  const el=$('#cart-items');
  if(!cart.length){el.innerHTML='<p class="empty-cart">Je bestelling is nog leeg. Kies hierboven je eerste lollywafel.</p>';$('#checkout').disabled=true;$('#grand-total').textContent=config?.mode==='included'?'Inbegrepen':money(0);return}
  el.innerHTML=cart.map((i,n)=>'<div class="cart-row"><div><strong>Lollywafel '+(n+1)+'</strong><p>'+esc(i.chocolate)+' · '+esc(i.sauce)+(i.toppings.length?' · '+esc(i.toppings.join(', ')):'')+'</p><strong>'+(config.mode==='included'?'Inbegrepen':money(i.price_cents))+'</strong></div><button type="button" class="remove" data-remove="'+n+'">Verwijder</button></div>').join('');
  el.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{cart.splice(Number(b.dataset.remove),1);renderCart();updateTotals()});
  $('#checkout').disabled=false;$('#cart-count').textContent=cart.length+' '+(cart.length===1?'wafel':'wafels');$('#grand-total').textContent=config.mode==='included'?'Inbegrepen':money(cart.reduce((s,i)=>s+i.price_cents,0));
}
async function checkout(){
  const name=$('#customer-name').value.trim();if(!name){notice('Vul je voornaam in.');$('#customer-name').focus();return}if(!cart.length)return;
  if(!serverReady){notice('Dit is nu alleen de visuele preview. Om bestellingen te activeren moeten de servergeheimen in Vercel nog ingevuld worden. Deel die sleutels niet in de chat.',true);return}
  const btn=$('#checkout');btn.disabled=true;btn.textContent='Bestelling wordt klaargemaakt…';
  try{
    const result=await api('/api/kiosk-create-payment.js',{method:'POST',body:JSON.stringify({customer_name:name,payment_method:config.mode==='included'?'included':paymentMethod,items:cart.map(i=>({chocolate_id:i.chocolate_id,sauce_id:i.sauce_id,topping_ids:i.topping_ids}))})});
    if(result.checkout_url){location.href=result.checkout_url;return}
    cart=[];renderCart();updateTotals();
    if(result.payment_method==='cash')notice('Bestelling '+result.order_number+' is doorgestuurd naar de truck. Betaal daar contant aan onze medewerker.');
    else notice('Bestelling '+result.order_number+' is geregistreerd als inbegrepen bij het evenement.');
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(e){notice(e.message,true)}
  finally{btn.disabled=!cart.length;updatePaymentLabel()}
}
function notice(msg,error=false){const el=$('#notice');if(!el)return;el.hidden=false;el.classList.toggle('error',error);el.textContent=msg}
async function initKitchen(){
  const saved=sessionStorage.getItem('hb-kiosk-token');if(saved)$('#admin-token').value=saved;
  $('#save-token').onclick=()=>{sessionStorage.setItem('hb-kiosk-token',$('#admin-token').value.trim());loadKitchen(true)};
  $('#sound-toggle').onclick=()=>{soundOn=!soundOn;$('#sound-toggle').textContent=soundOn?'Geluid aan':'Geluid uit'};
  $('#save-settings').onclick=saveSettings;await loadKitchen(true);setInterval(()=>loadKitchen(false),4000);
}
function token(){return sessionStorage.getItem('hb-kiosk-token')||$('#admin-token').value.trim()}
async function loadKitchen(showError){
  if(!token())return;
  try{
    const d=await api('/api/kiosk-admin.js',{headers:{'x-kiosk-admin':token()}});
    renderOrders(d.orders||[]);renderStock(d.options||[]);
    if(d.settings){$('#setting-event').value=d.settings.event_name||'';$('#setting-mode').value=d.settings.mode;$('#setting-price').value=(d.settings.base_price_cents/100).toFixed(2);$('#setting-topping-price').value=(d.settings.extra_topping_price_cents/100).toFixed(2)}
  }catch(e){if(showError)$('#kitchen-orders').innerHTML='<p class="muted">'+esc(e.message)+'</p>'}
}
function renderOrders(orders){
  const visible=orders.filter(o=>['paid','included','refund_pending','refunded'].includes(o.payment_status)||(o.payment_method==='cash'&&o.payment_status==='pending'));
  const fresh=visible.filter(o=>o.status==='new'&&!lastOrderIds.has(o.id));
  if(soundOn&&lastOrderIds.size&&fresh.length){try{const C=window.AudioContext||window.webkitAudioContext;if(C){const c=new C(),osc=c.createOscillator(),gain=c.createGain();osc.connect(gain);gain.connect(c.destination);osc.frequency.value=880;gain.gain.value=.1;osc.start();osc.stop(c.currentTime+.22)}}catch{}}
  visible.forEach(o=>lastOrderIds.add(o.id));
  const paid=visible.filter(o=>o.payment_status==='paid'),cashDue=visible.filter(o=>o.payment_method==='cash'&&o.payment_status==='pending'),included=visible.filter(o=>o.payment_status==='included');
  const revenue=paid.reduce((sum,o)=>sum+Number(o.total_cents||0),0);
  $('#sales-summary').innerHTML='<strong>'+visible.length+'</strong> bestellingen · <strong>'+money(revenue)+'</strong> ontvangen · <strong>'+cashDue.length+'</strong> cash nog te innen · <strong>'+included.length+'</strong> inbegrepen';
  const el=$('#kitchen-orders');
  if(!visible.length){el.innerHTML='<p class="muted">Nog geen betaalde, cash- of inbegrepen bestellingen.</p>';return}
  el.innerHTML=visible.map(o=>{
    const isCashDue=o.payment_method==='cash'&&o.payment_status==='pending';
    const payLabel=o.payment_status==='included'?'Inbegrepen':isCashDue?'Cash te ontvangen':o.payment_status==='refund_pending'?'Terugbetaling bezig':o.payment_status==='refunded'?'Terugbetaald':o.payment_method==='cash'?'Cash ontvangen':'Online betaald';
    const payClass=isCashDue?'status cash-due':'status';
    return '<article class="order-card"><div class="order-head"><strong>#'+esc(o.order_number)+' · '+esc(o.customer_name)+'</strong><span class="'+payClass+'">'+esc(o.status==='new'?'Nieuw':o.status==='preparing'?'In bereiding':o.status==='ready'?'Klaar':'Afgehandeld')+'</span></div><p class="muted">'+new Date(o.created_at).toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'})+' · '+esc(payLabel)+'</p><ul>'+(o.items||[]).map(i=>'<li><b>Lollywafel</b> · '+esc(i.chocolate)+' · '+esc(i.sauce)+(i.toppings?.length?' · '+esc(i.toppings.join(', ')):'')+'</li>').join('')+'</ul><p><strong>'+(o.price_mode==='included'?'Inbegrepen':money(o.total_cents))+'</strong></p><div class="order-actions">'+(isCashDue?'<button class="cash-confirm" data-cash="'+esc(o.id)+'">Cash ontvangen</button>':'')+(o.status==='new'?'<button data-status="preparing" data-id="'+esc(o.id)+'">In bereiding</button>':'')+(o.status!=='ready'&&o.status!=='completed'?'<button class="ready" data-status="ready" data-id="'+esc(o.id)+'">Klaar</button>':'')+(o.status==='ready'?'<button data-status="completed" data-id="'+esc(o.id)+'">Afgegeven</button>':'')+(o.payment_method==='mollie'&&o.payment_status==='paid'?'<button data-refund="'+esc(o.id)+'">Terugbetalen</button>':'')+'</div></article>'
  }).join('');
  el.querySelectorAll('[data-status]').forEach(b=>b.onclick=async()=>{try{await api('/api/kiosk-admin.js',{method:'POST',headers:{'x-kiosk-admin':token()},body:JSON.stringify({action:'status',order_id:b.dataset.id,status:b.dataset.status})});loadKitchen(false)}catch(e){alert(e.message)}});
  el.querySelectorAll('[data-cash]').forEach(b=>b.onclick=async()=>{if(!confirm('Bevestig dat het cashgeld in de truck ontvangen is?'))return;b.disabled=true;try{await api('/api/kiosk-admin.js',{method:'POST',headers:{'x-kiosk-admin':token()},body:JSON.stringify({action:'cash_received',order_id:b.dataset.cash})});loadKitchen(false)}catch(e){b.disabled=false;alert(e.message)}});
  el.querySelectorAll('[data-refund]').forEach(b=>b.onclick=async()=>{if(!confirm('Volledige online betaling via Mollie terugbetalen?'))return;try{await api('/api/kiosk-refund.js',{method:'POST',headers:{'x-kiosk-admin':token()},body:JSON.stringify({order_id:b.dataset.refund})});alert('Terugbetaling aangevraagd bij Mollie.');loadKitchen(false)}catch(e){alert(e.message)}});
}
async function saveSettings(){try{await api('/api/kiosk-admin.js',{method:'POST',headers:{'x-kiosk-admin':token()},body:JSON.stringify({action:'settings',event_name:$('#setting-event').value,mode:$('#setting-mode').value,base_price_cents:Math.round(Number($('#setting-price').value)*100),extra_topping_price_cents:Math.round(Number($('#setting-topping-price').value)*100)})});alert('Instellingen opgeslagen.');loadKitchen(false)}catch(e){alert(e.message)}}
function renderStock(options){
  const el=$('#stock-options');if(!el)return;
  el.innerHTML=options.map(o=>'<label class="stock-choice"><input type="checkbox" data-stock="'+esc(o.id)+'" '+(o.active?'checked':'')+'><span><strong>'+esc(o.name)+'</strong><small>'+(o.kind==='topping'?'Topping':o.kind==='sauce'?'Saus':'Chocolade')+'</small></span></label>').join('');
  el.querySelectorAll('[data-stock]').forEach(input=>input.onchange=async()=>{input.disabled=true;try{await api('/api/kiosk-admin.js',{method:'POST',headers:{'x-kiosk-admin':token()},body:JSON.stringify({action:'option',option_id:input.dataset.stock,active:input.checked})})}catch(e){input.checked=!input.checked;alert(e.message)}finally{input.disabled=false}});
}
