const $=id=>document.getElementById(id),money=c=>(c/100).toLocaleString('nl-BE',{style:'currency',currency:'EUR'});
let data=null,token=sessionStorage.getItem('hb-admin-token')||'',lastOrders='';
$('token').value=token;
async function api(method='GET',body){const r=await fetch('/api/kiosk/admin',{method,headers:{'Content-Type':'application/json','x-kiosk-admin':token},body:body?JSON.stringify(body):undefined,cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Fout');return d}
function msg(s){$('msg').textContent=s}
function showTab(id){document.querySelectorAll('.admin-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));document.querySelectorAll('.admin-view').forEach(v=>v.hidden=v.id!==id);sessionStorage.setItem('hb-admin-tab',id)}
document.querySelectorAll('.admin-tab').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderOrders(orders){
 const signature=JSON.stringify(orders);if(signature===lastOrders)return;lastOrders=signature;
 $('tab-order-count').textContent=orders.length;
 $('orders').innerHTML=orders.map(o=>'<article class="order"><div class="order-head"><b>'+escapeHtml(o.order_number)+' · '+escapeHtml(o.customer_name)+'</b><strong>'+money(o.total_cents)+'</strong></div><p>'+o.items.map(i=>i.quantity+'× '+escapeHtml(i.name)+(i.toppings&&i.toppings.length?' ['+i.toppings.map(t=>escapeHtml(t.name)).join(', ')+']':'')).join(' · ')+'</p><div class="order-head"><span class="status">'+(['manual','cash','included'].includes(o.payment_method)?'Manueel afrekenen':'Online betaald')+' · '+o.status+'</span><select data-status="'+o.id+'"><option value="new" '+(o.status==='new'?'selected':'')+'>Nieuw</option><option value="preparing" '+(o.status==='preparing'?'selected':'')+'>In bereiding</option><option value="ready" '+(o.status==='ready'?'selected':'')+'>Klaar</option><option value="completed" '+(o.status==='completed'?'selected':'')+'>Afgehaald</option><option value="cancelled" '+(o.status==='cancelled'?'selected':'')+'>Geannuleerd</option></select></div></article>').join('')||'<p>Nog geen bestellingen.</p>';
 document.querySelectorAll('[data-status]').forEach(s=>s.onchange=async()=>{try{await api('POST',{action:'status',order_id:s.dataset.status,status:s.value});lastOrders='';await pollOrders()}catch(e){msg(e.message)}});
}
function categoryName(c){return ({lollywafels:'Lollywafels',bubbelwafels:'Bubbelwafels','wafel-cups':'Wafel cups',snacks:'Snoep & snacks',chocolademelk:'Chocolademelk',frisdrank:'Frisdranken'})[c]||c}
function renderProducts(products){
 const groups=[['Deegproducten',products.filter(p=>['lollywafels','bubbelwafels','wafel-cups'].includes(p.category))],['Snacks',products.filter(p=>p.category==='snacks')],['Dranken',products.filter(p=>['chocolademelk','frisdrank'].includes(p.category))]];
 $('products').innerHTML=groups.filter(g=>g[1].length).map(([title,items])=>'<section class="price-group"><h3>'+title+'</h3>'+items.map(p=>{
 const dough=['lollywafels','bubbelwafels','wafel-cups'].includes(p.category);
 return '<article class="price-card"><div class="price-card-title"><div><b>'+escapeHtml(p.name)+'</b><small>'+categoryName(p.category)+'</small></div><label class="availability"><input type="checkbox" data-active="'+escapeHtml(p.id)+'" '+(p.active?'checked':'')+'> Beschikbaar</label></div><div class="price-inputs"><label>Prijs zonder toppings (€)<input type="number" min="0" step="0.01" inputmode="decimal" data-price="'+escapeHtml(p.id)+'" value="'+(p.price_cents/100).toFixed(2)+'"></label>'+(dough?'<label>Prijs met toppings (€)<input type="number" min="0" step="0.01" inputmode="decimal" data-price-toppings="'+escapeHtml(p.id)+'" value="'+(p.price_with_toppings_cents===null||p.price_with_toppings_cents===undefined?'':(p.price_with_toppings_cents/100).toFixed(2))+'" placeholder="Prijs met toppings"></label>':'')+'</div><button type="button" class="save-price" data-save-product="'+escapeHtml(p.id)+'">Prijs opslaan</button></article>'
 }).join('')+'</section>').join('')||'<p>Geen producten gevonden.</p>';
 document.querySelectorAll('[data-save-product]').forEach(b=>b.onclick=()=>saveProduct(b.dataset.saveProduct));
 document.querySelectorAll('[data-active]').forEach(i=>i.onchange=()=>saveProduct(i.dataset.active,true));
}
async function pollOrders(){const fresh=await api();renderOrders(fresh.orders||[]);$('orders-live').textContent='Live · '+(fresh.orders||[]).length+' bestellingen · elke 2 sec'}
async function refresh(){
 data=await api();$('dashboard').hidden=false;$('eventname').value=data.settings.event_name;$('hot').checked=data.settings.show_hot_chocolate;$('drinks').checked=data.settings.show_soft_drinks;
 renderProducts(data.products||[]);lastOrders='';renderOrders(data.orders||[]);$('orders-live').textContent='Live · automatisch vernieuwd';showTab(sessionStorage.getItem('hb-admin-tab')==='settings-view'?'settings-view':'orders-view');
}
async function saveProduct(id,activeOnly=false){
 const p=data.products.find(x=>String(x.id)===String(id));if(!p)return;
 const body={action:'product',id};
 if(activeOnly)body.active=document.querySelector('[data-active="'+id+'"]').checked;
 else{
  const base=document.querySelector('[data-price="'+id+'"]'),extra=document.querySelector('[data-price-toppings="'+id+'"]');
  const baseCents=Math.round(Number(base.value)*100);
  if(!base.value.trim()||!Number.isInteger(baseCents)||baseCents<0){msg('Vul een geldige basisprijs in.');base.focus();return}
  body.price_cents=baseCents;
  if(extra){if(!extra.value.trim()){msg('Vul ook de prijs met toppings in.');extra.focus();return}const extraCents=Math.round(Number(extra.value)*100);if(!Number.isInteger(extraCents)||extraCents<0){msg('Vul een geldige prijs met toppings in.');extra.focus();return}body.price_with_toppings_cents=extraCents}
 }
 try{await api('POST',body);msg('Prijs en beschikbaarheid opgeslagen.');await refresh()}catch(e){msg(e.message)}
}
$('connect').onclick=async()=>{token=$('token').value.trim();sessionStorage.setItem('hb-admin-token',token);lastOrders='';try{await refresh();msg('Verbonden.')}catch(e){msg(e.message)}};
$('save-settings').onclick=async()=>{try{await api('POST',{action:'settings',event_name:$('eventname').value,show_hot_chocolate:$('hot').checked,show_soft_drinks:$('drinks').checked});msg('Instellingen opgeslagen.');await refresh()}catch(e){msg(e.message)}};
$('add-drink').onclick=async()=>{try{await api('POST',{action:'add_drink',name:$('drink-name').value,price_cents:Math.round(Number($('drink-price').value)*100)});$('drink-name').value='';$('drink-price').value='';await refresh()}catch(e){msg(e.message)}};
if(token)refresh().catch(e=>msg(e.message));
setInterval(()=>{if(token&&!$('dashboard').hidden)pollOrders().catch(()=>{$('orders-live').textContent='Verbinding herstellen…'})},2000);
