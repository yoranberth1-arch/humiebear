const $=s=>document.querySelector(s);
let config=null,serverReady=false,step=0,qty=1,choices={chocolate:null,sauce:null,toppings:[]},paymentMethod='mollie',soundOn=true,lastOrderIds=new Set(),waffleSelected=true;
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
 $('#start-order').onclick=()=>{ $('#welcome-panel').hidden=true;$('#wizard').hidden=false;goToStep(0);$('#customer-name').focus();window.scrollTo({top:0,behavior:'smooth'})};
 $('#restart-order').onclick=resetOrder;$('#wizard-back-top').onclick=backStep;$('#back-step').onclick=backStep;$('#next-step').onclick=nextStep;$('#place-order').onclick=checkout;$('#change-choices').onclick=()=>goToStep(2);
 $('#waffle-card').onclick=()=>{waffleSelected=!waffleSelected;$('#waffle-card').classList.toggle('selected',waffleSelected);$('#waffle-card').setAttribute('aria-pressed',String(waffleSelected));$('#waffle-card .selected-pill').textContent=waffleSelected?'✓ Geselecteerd':'Tik om te kiezen'};
 $('#minus').onclick=()=>{qty=Math.max(1,qty-1);$('#qty').textContent=qty;updateTotals();renderReview()};
 $('#plus').onclick=()=>{qty=Math.min(20,qty+1);$('#qty').textContent=qty;updateTotals();renderReview()};
 document.querySelectorAll('[data-payment]').forEach(b=>b.onclick=()=>{paymentMethod=b.dataset.payment;document.querySelectorAll('[data-payment]').forEach(x=>{const selected=x===b;x.classList.toggle('selected',selected);x.setAttribute('aria-pressed',String(selected))});updatePaymentLabel()});
 try{
  config=await api('/api/kiosk-config.js');
  if(!Array.isArray(config.options)||config.options.length===0)throw new Error('De productkeuzes zijn niet beschikbaar.');
  serverReady=true;
 }catch(e){
  serverReady=false;
  config={event_name:'Lollywafel Edition',mode:'paid',base_price_cents:500,extra_topping_price_cents:50,options:demoOptions};
  showNotice('De bestelapp kan de productinstellingen niet bereiken. Je kunt de vormgeving bekijken, maar bestellingen staan tijdelijk uit.',true);
 }
 $('#event-label').textContent=config.event_name||'Lollywafel Edition';
 $('#waffle-base-price').textContent=config.mode==='included'?'Inbegrepen':money(config.base_price_cents);
 $('#topping-note').textContent=config.mode==='included'?'Alle toppings zijn inbegrepen':'Elke extra topping: '+money(config.extra_topping_price_cents);
 $('#payment-options').hidden=config.mode==='included';$('#included-note').hidden=config.mode!=='included';
 renderOptions('chocolate-options',config.options.filter(o=>o.kind==='chocolate'),'chocolate');
 renderOptions('sauce-options',config.options.filter(o=>o.kind==='sauce'),'sauce');
 renderOptions('topping-options',config.options.filter(o=>o.kind==='topping'),'toppings');
 updateTotals();updatePaymentLabel();
}
function goToStep(next){
 step=Math.max(0,Math.min(6,next));
 document.querySelectorAll('[data-step-panel]').forEach(p=>p.hidden=Number(p.dataset.stepPanel)!==step);
 $('#step-counter').textContent='Stap '+(step+1)+' van 7';
 $('#progress-fill').style.width=((step+1)/7*100)+'%';
 $('#back-step').hidden=step===0;$('#wizard-back-top').hidden=step===0;
 $('#next-step').hidden=step===6;$('#place-order').hidden=step!==6;
 $('#footer-price-label').textContent=config?.mode==='included'?'Prijs inbegrepen':'Totaal';
 $('#footer-price').textContent=config?.mode==='included'?'Inbegrepen':money(currentTotal());
 if(step===6)renderReview();
 window.scrollTo({top:0,behavior:'smooth'});
}
function backStep(){if(step>0)goToStep(step-1);else{$('#wizard').hidden=true;$('#welcome-panel').hidden=false;window.scrollTo({top:0,behavior:'smooth'})}}
function nextStep(){
 if(step===0&&!$('#customer-name').value.trim()){showNotice('Vul eerst je voornaam in.');$('#customer-name').focus();return}
 if(step===1&&!waffleSelected){showNotice('Selecteer de lollywafel om verder te gaan.');return}
 if(step===2&&!choices.chocolate){showNotice('Kies eerst melkchocolade of witte chocolade.');return}
 if(step===3&&!choices.sauce){showNotice('Kies eerst aardbeiensaus of karamelsaus.');return}
 if(step<6)goToStep(step+1);
}
function renderOptions(target,items,kind){
 const el=$('#'+target);
 if(!items.length){el.innerHTML='<p class="choice-error">Geen keuzes beschikbaar. Meld dit aan de medewerker.</p>';return}
 el.innerHTML=items.map(o=>{
  const selected=kind==='toppings'?choices.toppings.includes(o.id):choices[kind]===o.id;
  const caption=kind==='toppings'?(config.mode==='included'?'Inbegrepen':'+ '+money(config.extra_topping_price_cents)):(kind==='chocolate'?'Chocolade':'Saus');
  return '<button type="button" class="product-choice '+(selected?'selected':'')+'" data-kind="'+kind+'" data-id="'+esc(o.id)+'" aria-pressed="'+selected+'"><span class="choice-photo-wrap"><img class="choice-photo" src="'+esc(photos[o.id]||photos.hero)+'" alt="'+esc(o.name)+'" loading="eager" decoding="async" onerror="this.hidden=true"><span class="choice-photo-fallback" aria-hidden="true">'+(fallbackEmoji[o.id]||'✨')+'</span><span class="choice-check" aria-hidden="true">✓</span></span><span class="choice-label">'+esc(o.name)+'</span><span class="choice-caption">'+esc(caption)+'</span></button>';
 }).join('');
 el.querySelectorAll('.product-choice').forEach(b=>b.addEventListener('click',()=>{
  const id=b.dataset.id,k=b.dataset.kind;
  if(k==='toppings'){choices.toppings=choices.toppings.includes(id)?choices.toppings.filter(x=>x!==id):[...choices.toppings,id];}
  else {choices[k]=id;}
  renderOptions(target,items,kind);updateTotals();renderReview();clearNotice();
 }));
}
function currentUnitPrice(){return config.base_price_cents+choices.toppings.length*config.extra_topping_price_cents}
function currentTotal(){return currentUnitPrice()*qty}
function updateTotals(){
 if(!config)return;
 $('#qty').textContent=String(qty);
 $('#total').textContent=config.mode==='included'?'Inbegrepen':money(currentTotal());
 $('#qty-summary').textContent='Totaal voor '+qty+' '+(qty===1?'wafel':'wafels');
 $('#qty-price').textContent=config.mode==='included'?'Inbegrepen per wafel':money(currentUnitPrice())+' per wafel';
 $('#footer-price').textContent=config.mode==='included'?'Inbegrepen':money(currentTotal());
 $('#footer-price-label').textContent=config.mode==='included'?'Prijs inbegrepen':('Totaal · '+qty+' '+(qty===1?'wafel':'wafels'));
 $('#waffle-base-price').textContent=config.mode==='included'?'Inbegrepen':money(config.base_price_cents);
}
function renderReview(){
 if(!config)return;
 const name=$('#customer-name').value.trim()||'Je bestelling';
 const ch=config.options.find(o=>o.id===choices.chocolate),sa=config.options.find(o=>o.id===choices.sauce),tops=choices.toppings.map(id=>config.options.find(o=>o.id===id)).filter(Boolean);
 $('#review-name').textContent='Lollywafel';
 $('#review-choice').textContent=(ch?ch.name:'Chocolade niet gekozen')+' · '+(sa?sa.name:'Saus niet gekozen')+' · '+(tops.length?tops.map(t=>t.name).join(', '):'Geen extra toppings');
 $('#review-quantity').textContent=qty+' '+(qty===1?'wafel':'wafels');
 $('#review-customer').textContent=name;
 $('#review-count').textContent=String(qty);
 $('#review-total').textContent=config.mode==='included'?'Inbegrepen':money(currentTotal());
 $('#grand-total').textContent=config.mode==='included'?'Inbegrepen':money(currentTotal());
}
function updatePaymentLabel(){
 if(!config)return;
 const btn=$('#place-order');
 btn.textContent=config.mode==='included'?'Bestelling plaatsen':paymentMethod==='cash'?'Bestellen · cash in de truck':'Bestelling plaatsen';
 $('#payment-note').textContent=paymentMethod==='cash'?'Betaal cash aan de medewerker. De bestelling wordt op het bakscherm getoond als “Cash te ontvangen”.':'Je wordt doorgestuurd naar de veilige online betaalpagina van Mollie.';
}
async function checkout(){
 const name=$('#customer-name').value.trim();
 if(!name){goToStep(0);showNotice('Vul eerst je voornaam in.');$('#customer-name').focus();return}
 if(!choices.chocolate||!choices.sauce){showNotice('Controleer je chocolade en saus.');return}
 if(!waffleSelected){showNotice('Selecteer je lollywafel.');goToStep(1);return}
 if(!serverReady){showNotice('Bestellen staat tijdelijk uit omdat de serverinstellingen niet bereikbaar zijn. Probeer later opnieuw.',true);return}
 const btn=$('#place-order');btn.disabled=true;btn.textContent='Bestelling wordt klaargemaakt…';
 try{
  const items=Array.from({length:qty},()=>({chocolate_id:choices.chocolate,sauce_id:choices.sauce,topping_ids:[...choices.toppings]}));
  const result=await api('/api/kiosk-create-payment.js',{method:'POST',body:JSON.stringify({customer_name:name,payment_method:config.mode==='included'?'included':paymentMethod,items})});
  if(result.checkout_url){location.href=result.checkout_url;return}
  $('#wizard').hidden=true;$('#welcome-panel').hidden=true;$('#order-confirmation').hidden=false;
  $('#confirmed-order-number').textContent=result.order_number;
  if(result.payment_method==='cash'){$('#confirmation-title').textContent='Bestelling ontvangen!';$('#confirmation-message').textContent='Bedankt '+name+'! Betaal cash aan onze medewerker in de truck.';$('#confirmation-help').textContent='Je bestelling staat op het bakscherm als “Cash te ontvangen”. Zodra wij het geld ontvangen, bevestigen we de betaling.'}
  else{$('#confirmation-title').textContent='Bestelling geplaatst!';$('#confirmation-message').textContent='Bedankt '+name+'! Je bestelling valt binnen het evenement.';$('#confirmation-help').textContent='Je hoeft niet te betalen. Hou je bestelnummer bij de hand.'}
 }catch(e){showNotice('Je bestelling kon niet worden geplaatst. '+e.message,true)}
 finally{btn.disabled=false;updatePaymentLabel()}
}
function resetOrder(){
 step=0;qty=1;choices={chocolate:null,sauce:null,toppings:[]};paymentMethod='mollie';waffleSelected=true;
 $('#customer-name').value='';$('#waffle-card').classList.add('selected');$('#waffle-card').setAttribute('aria-pressed','true');$('#waffle-card .selected-pill').textContent='✓ Geselecteerd';
 document.querySelectorAll('[data-payment]').forEach(b=>{const s=b.dataset.payment==='mollie';b.classList.toggle('selected',s);b.setAttribute('aria-pressed',String(s))});
 $('#order-confirmation').hidden=true;$('#wizard').hidden=true;$('#welcome-panel').hidden=false;clearNotice();
 if(config){renderOptions('chocolate-options',config.options.filter(o=>o.kind==='chocolate'),'chocolate');renderOptions('sauce-options',config.options.filter(o=>o.kind==='sauce'),'sauce');renderOptions('topping-options',config.options.filter(o=>o.kind==='topping'),'toppings')}
 goToStep(0);updateTotals();window.scrollTo({top:0,behavior:'smooth'});
}
$('#new-order')?.addEventListener('click',resetOrder);
function showNotice(message,error=false){const el=$('#notice');if(!el)return;el.hidden=false;el.classList.toggle('error',error);el.textContent=message}
function clearNotice(){const el=$('#notice');if(el){el.hidden=true;el.textContent='';el.classList.remove('error')}}
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

