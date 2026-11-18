const $=id=>document.getElementById(id),money=c=>(c/100).toLocaleString('nl-BE',{style:'currency',currency:'EUR'}),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let products=[],toppings=[],cart=[],selected=null,activeCategory='Alles';
const categoryLabel=c=>({Wafels:'Wafels','Snoep & snacks':'Snoep & snacks',chocolademelk:'Warme dranken',frisdrank:'Frisdrank'}[c]||c);
async function load(){
 try{
  const r=await fetch('/api/kiosk/menu',{cache:'no-store'}),d=await r.json();
  if(!r.ok)throw Error(d.error||'Menu laden mislukt');
  products=d.products||[];toppings=d.toppings||[];drawFilters();drawProducts();
 }catch(e){$('products').textContent=e.message}
}
function drawFilters(){
 const cats=['Alles',...new Set(products.map(p=>categoryLabel(p.category)))];
 $('category-filters').innerHTML=cats.map(c=>'<button type="button" class="category-filter '+(c===activeCategory?'active':'')+'" data-category="'+esc(c)+'">'+esc(c)+'</button>').join('');
 document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{activeCategory=b.dataset.category;drawFilters();drawProducts()});
}
function drawProducts(){
 const shown=products.filter(p=>activeCategory==='Alles'||categoryLabel(p.category)===activeCategory);
 $('product-count').textContent=shown.length+' producten';
 $('products').innerHTML=shown.map(p=>{
  const has=p.has_toppings===true;
  const price=has&&p.price_with_toppings_cents?'Vanaf '+money(p.price_cents):money(p.price_cents);
  const extra=has&&p.price_with_toppings_cents?'Met toppings '+money(p.price_with_toppings_cents):'';
  return '<button type="button" class="pos-product '+(has?'has-options':'quick-add')+'" data-product="'+esc(p.id)+'"><span class="pos-product-name">'+esc(p.name)+'</span><strong>'+price+'</strong>'+(extra?'<small>'+extra+'</small>':'<small>+ Snel toevoegen</small>')+'</button>';
 }).join('');
 document.querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>openProduct(b.dataset.product));
}
function openProduct(id){
 selected=products.find(p=>p.id===id);if(!selected)return;
 if(!selected.has_toppings){addProductToCart([]);return}
 $('modal-product-name').textContent=selected.name;
 $('modal-base-price').textContent='Zonder toppings '+money(selected.price_cents)+(selected.price_with_toppings_cents?'  |  Met toppings '+money(selected.price_with_toppings_cents):'');
 $('topping-options').innerHTML=[...new Set(toppings.map(t=>t.group))].map(g=>'<details class="topping-group" open><summary>'+esc(g)+'</summary><div class="topping-grid">'+toppings.filter(t=>t.group===g).map(t=>'<label class="topping-option"><input type="checkbox" value="'+esc(t.id)+'"><span>'+esc(t.name)+'</span></label>').join('')+'</div></details>').join('');
 $('topping-options').querySelectorAll('input').forEach(i=>i.onchange=updateModal);
 updateModal();$('topping-modal').hidden=false;
}
function selectedToppings(){return [...$('topping-options').querySelectorAll('input:checked')].map(i=>toppings.find(t=>t.id===i.value)).filter(Boolean)}
function updateModal(){if(!selected)return;const n=selectedToppings().length;$('modal-total').textContent=money(n&&selected.price_with_toppings_cents?selected.price_with_toppings_cents:selected.price_cents);$('modal-price-hint').textContent=n?'Met toppings':'Zonder toppings'}
function addProductToCart(ts){
 const p=selected;if(!p)return;
 const total=ts.length&&p.price_with_toppings_cents?p.price_with_toppings_cents:p.price_cents;
 cart.push({catalog_id:p.id,name:p.name,base_price_cents:p.price_cents,toppings:ts.map(t=>({id:t.id,name:t.name})),total_cents:total});
 selected=null;$('topping-modal').hidden=true;drawCart();
}
function drawCart(){
 const count=cart.length,total=cart.reduce((s,x)=>s+x.total_cents,0);
 $('cart-count').textContent=count+' '+(count===1?'product':'producten');$('cart-total').textContent=money(total);
 $('finish-order').textContent='Afronden · '+money(total);$('finish-order').disabled=!count;$('clear-order').disabled=!count;
 $('cart-lines').innerHTML=count?cart.map((x,i)=>'<article class="pos-cart-line"><div><b>'+esc(x.name)+'</b>'+(x.toppings.length?'<small>'+x.toppings.map(t=>esc(t.name)).join(', ')+'</small>':'')+'<strong>'+money(x.total_cents)+'</strong></div><button type="button" class="remove-line" data-remove="'+i+'" aria-label="Verwijder '+esc(x.name)+'">Verwijder</button></article>').join(''):'<div class="empty-cart"><span>Je bestelling is nog leeg</span><small>Kies links een product om te starten.</small></div>';
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{cart.splice(Number(b.dataset.remove),1);drawCart()});
}
$('add-configured').onclick=()=>{if(selected)addProductToCart(selectedToppings())};
$('close-modal').onclick=()=>{$('topping-modal').hidden=true;selected=null};
$('topping-modal').addEventListener('click',e=>{if(e.target===$('topping-modal'))$('close-modal').click()});
$('clear-order').onclick=()=>{if(cart.length&&confirm('Wil je de volledige bestelling leegmaken?')){cart=[];drawCart()}};
$('finish-order').onclick=async()=>{
 if(!cart.length)return;const customerName=$('customer-name').value.trim();if(!customerName){$('notice').hidden=false;$('notice').textContent='Vul eerst de naam van de klant in.';$('customer-name').focus();return}const btn=$('finish-order');btn.disabled=true;btn.textContent='Bestelling opslaan…';
 try{
  const r=await fetch('/api/kiosk/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customer_name:customerName,items:cart.map(x=>({catalog_id:x.catalog_id,toppings:x.toppings.map(t=>t.id)})),request_id:crypto.randomUUID()})});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Bestelling kon niet worden opgeslagen');
  $('notice').hidden=false;$('notice').textContent='Bestelling '+d.order_number+' is doorgestuurd. Je kunt de volgende klant helpen.';
  cart=[];$('customer-name').value='';drawCart();window.scrollTo({top:0,behavior:'smooth'});
 }catch(e){$('notice').hidden=false;$('notice').textContent=e.message}
 finally{btn.disabled=!cart.length;btn.textContent='Afronden · '+$('cart-total').textContent}
};
load();