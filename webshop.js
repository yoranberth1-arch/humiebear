function renderCart(){const list=q("#cartItems"),badge=q("#cartCount");if(!list||!badge)return;const items=cartItemsDetailed();badge.textContent=items.reduce((a,b)=>a+b.quantity,0);if(!items.length){list.innerHTML='<div class="cart-empty">Je winkelmandje is nog leeg.<br><br>Stel jouw eigen snoepzak samen!</div>'}else{list.innerHTML=items.map(i=>{const gift=i.grams>=CONFIG.freeBagFrom?'<p style="color:var(--hb-green);font-weight:900">🎁 Gratis snoepzakje inbegrepen</p>':'';return '<div class="cart-item"><div class="cart-item-img"><img src="'+i.image+'" alt="'+i.name+'"></div><div><h3>'+i.name+'</h3>'+personalizedDescription(i)+gift+'<div class="qty"><button type="button" data-qty="-1" data-id="'+i.id+'">−</button><span>'+i.quantity+'</span><button type="button" data-qty="1" data-id="'+i.id+'">+</button></div></div><strong>'+eur(i.price*i.quantity)+'</strong></div>'}).join("")}q("#cartSubtotal").textContent=eur(cartSubtotal());q("#cartTotal").textContent=eur(cartSubtotal())}
function renderLiveBagDraft(){const d=loadBagDraft();if(!d)return "";const rows=(d.rows||[]).filter(x=>x.id&&Number(x.grams)>0);if(!rows.length)return "";const grams=rows.reduce((a,b)=>a+Number(b.grams||0),0);const desc=rows.map(x=>x.name+" "+x.grams+" g").join(" · ");return '<div class="cart-live-draft"><div class="cart-live-head"><span>JOUW HUIDIGE SNOEPZAK</span><strong>'+grams+' / '+d.size+' g</strong></div><p>'+desc+'</p><small>Sticker: '+(d.sticker||"Geen")+' · '+(d.bagColor||"Geen")+(d.note?' · "'+escapeHtml(d.note)+'"':'')+'</small><button type="button" class="btn btn-light btn-block" data-scroll-bag>Verder met deze snoepzak</button></div>'}
function renderCart(){const list=q("#cartItems"),badge=q("#cartCount");if(!list||!badge)return;const items=cartItemsDetailed();badge.textContent=items.reduce((a,b)=>a+b.quantity,0);const liveDraft=renderLiveBagDraft();if(!items.length&&!liveDraft){list.innerHTML='<div class="cart-empty">Je winkelmandje is nog leeg.<br><br>Stel jouw eigen snoepzak samen!</div>'}else{list.innerHTML=liveDraft+(items.length?'<div class="cart-section-label">IN JE WINKELMANDJE</div>':'')+items.map(i=>{const gift=i.grams>=CONFIG.freeBagFrom?'<p style="color:var(--hb-green);font-weight:900">🎁 Gratis snoepzakje inbegrepen</p>':'';return '<div class="cart-item"><div class="cart-item-img"><img src="'+i.image+'" alt="'+i.name+'"></div><div><h3>'+i.name+'</h3>'+personalizedDescription(i)+gift+'<div class="qty"><button type="button" data-qty="-1" data-id="'+i.id+'">−</button><span>'+i.quantity+'</span><button type="button" data-qty="1" data-id="'+i.id+'">+</button></div></div><strong>'+eur(i.price*i.quantity)+'</strong></div>'}).join("")}q("#cartSubtotal").textContent=eur(cartSubtotal());q("#cartTotal").textContent=eur(cartSubtotal())}
function checkout(){const items=cartItemsDetailed();if(!items.length){toast("Je mandje is leeg.");return}const lines=items.map(i=>{if(!i.customMix)return i.quantity+"x "+i.name+" — "+i.grams+" g";const m=i.meta||{};let detail=i.customMix.map(x=>x.name+" "+x.grams+" g").join(", ");if(m.type==="personalized-bag")detail="Formaat "+m.size+" g | Snoep: "+detail+" | Sticker: "+(m.sticker||"Geen")+" | Verpakking: "+(m.bagColor||"Geen")+(m.note?" | Boodschap: "+m.note:"");else if(m.type==="gift-box")detail="Doos "+m.size+" g | Sticker: "+(m.sticker||"Geen")+(m.note?" | Boodschap: "+m.note:"");return i.quantity+"x "+i.name+" — "+detail}).join("\n");const subject=encodeURIComponent("Nieuwe Hummie Bear webshopbestelling");const body=encodeURIComponent("Hallo Hummie Bear,\n\nIk wil graag bestellen:\n"+lines+"\n\nTotaal: "+eur(cartSubtotal())+"\n\nNaam:\nAdres:\nTelefoon:\nE-mail:\n");window.location.href="mailto:"+CONFIG.email+"?subject="+subject+"&body="+body}
function toast(m){const el=q("#toast");if(!el)return;el.textContent=m;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),3000)}
function productCard(p){const crossed=["spaghetti-aardbei","spaghetti-appel","spaghetti-cola","matten-aardbei","matten-cola","matten-appel"].includes(p.id);return '<article class="product-card"><div class="product-visual"><img src="'+p.image+'" alt="'+p.name+'" loading="lazy" onerror="this.onerror=null;this.src=\'images/gummy-candy.png\'"><span class="product-badge">'+(crossed?"OOK OP ORIGINELE LIJST DOORGESTREEPT":p.category==="zuur"?"ZOET-ZUUR":"SCHEPSNOEP")+'</span><span class="product-emoji">'+p.emoji+'</span></div><div class="product-info"><h3>'+p.name+'</h3><p>'+p.desc+'. Zelf te kiezen vanaf 100 g.</p><small style="display:block;color:var(--hb-muted);font-weight:800;margin-top:5px">Merk: '+p.brand+'</small><div class="product-meta"><span class="price">'+eur(CONFIG.pricePer100g)+' <small>/ 100 g</small></span><span style="font-size:9px;color:var(--hb-green);font-weight:900">500 g = zakje cadeau</span></div><div class="product-actions"><button class="btn btn-primary btn-block" type="button" data-add="'+p.id+'">+ Voeg 100 g toe</button><button class="icon-btn" type="button" data-scroll-builder title="Zelf samenstellen">⚙</button></div></div></article>'}
function renderProducts(){const g=q("#productGrid");if(!g)return;const list=PRODUCTS.filter(p=>(currentFilter==="all"||p.category===currentFilter)&&(p.name+" "+p.desc).toLowerCase().includes(searchTerm.toLowerCase()));g.innerHTML=list.length?list.map(productCard).join(""):'<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--hb-muted)">Geen snoep gevonden.</div>';if(q("#productCount"))q("#productCount").textContent=list.length+" soorten"}
function initShop(){if(!q("#productGrid"))return;renderProducts();qa("[data-filter]").forEach(b=>b.addEventListener("click",()=>{qa("[data-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentFilter=b.dataset.filter;renderProducts()}));q("#productSearch")?.addEventListener("input",e=>{searchTerm=e.target.value;renderProducts()});q("#productGrid").addEventListener("click",e=>{const a=e.target.closest("[data-add]");if(a)addProduct(a.dataset.add,100);if(e.target.closest("[data-scroll-builder]"))q("#pickMixBuilder")?.scrollIntoView({behavior:"smooth"})})}
function initPickMix(){const wrap=q("#pickMixBuilder");if(!wrap)return;const grid=q(".pick-grid",wrap);if(grid)grid.innerHTML=PRODUCTS.map(p=>'<div class="pick-item"><div class="pick-item-top"><div class="pick-item-photo"><img src="'+p.image+'" alt="'+p.name+'" loading="lazy" onerror="this.onerror=null;this.src=\'images/gummy-candy.png\'"></div><div><strong>'+p.name+'</strong><span>'+eur(CONFIG.pricePer100g)+' / 100 g</span></div></div><div class="pick-step"><button type="button" data-mix-minus="'+p.id+'">−</button><b>0 g</b><button type="button" data-mix-plus="'+p.id+'">+</button></div></div>').join("");const weights=Object.fromEntries(PRODUCTS.map(p=>[p.id,0]));function update(){const parts=Object.entries(weights).filter(([,g])=>g>0).map(([id,grams])=>({id,name:getProduct(id).name,grams})),grams=parts.reduce((a,b)=>a+b.grams,0),price=(grams/100)*CONFIG.pricePer100g;q("#mixWeight").textContent=grams+" g";q("#mixPrice").textContent=eur(price);q("#mixGift").textContent=grams>=CONFIG.freeBagFrom?"🎁 Gratis snoepzakje inbegrepen":grams?("Nog "+(CONFIG.freeBagFrom-grams)+" g tot je gratis snoepzakje."):"";q("#mixSummary").textContent=parts.length?parts.map(x=>x.name+" "+x.grams+" g").join(" · "):"Kies minstens 100 g snoep.";const btn=q("#mixAdd");if(btn)btn.disabled=grams===0;qa(".pick-item",wrap).forEach(card=>{const btn=q("[data-mix-plus]",card),id=btn?.dataset.mixPlus,display=q(".pick-step b",card);if(id&&display)display.textContent=(weights[id]||0)+" g"})}qa("[data-mix-plus]",wrap).forEach(btn=>btn.addEventListener("click",()=>{weights[btn.dataset.mixPlus]+=100;update()}));qa("[data-mix-minus]",wrap).forEach(btn=>btn.addEventListener("click",()=>{weights[btn.dataset.mixMinus]=Math.max(0,weights[btn.dataset.mixMinus]-100);update()}));q("#mixAdd")?.addEventListener("click",()=>addCustomMix(Object.entries(weights).filter(([,g])=>g>0).map(([id,grams])=>({id,name:getProduct(id).name,grams,image:getProduct(id).image})),{type:"pickmix"}));update()}
function bagDraftStorageKey(){return "hummieBearBagDraftV1"}
function saveBagDraft(draft){try{localStorage.setItem(bagDraftStorageKey(),JSON.stringify(draft))}catch(e){}}
function loadBagDraft(){try{const d=JSON.parse(localStorage.getItem(bagDraftStorageKey())||"null");return d&&Array.isArray(d.rows)?d:null}catch(e){return null}}
function clearBagDraft(){try{localStorage.removeItem(bagDraftStorageKey())}catch(e){}}
function initBagBuilder(){
  const form=q("#bagBuilderForm"); if(!form)return;
  const state={size:500,sticker:"Sweetness on Wheels",note:"",bagColor:"Transparant"};
  const saved=loadBagDraft();
  if(saved?.size)state.size=Number(saved.size)||500;
  if(saved?.sticker)state.sticker=saved.sticker;
  if(saved?.note!=null)state.note=saved.note;
  if(saved?.bagColor)state.bagColor=saved.bagColor;

  const rows=qa("[data-bag-row]",form).map((row,index)=>{
    const select=q("select[data-bag-candy]",row);
    const oldInput=q("input[data-bag-grams]",row);
    if(!select||!oldInput)return null;
    select.innerHTML='<option value="" selected disabled>Maak een keuze</option>'+PRODUCTS.map(p=>"<option value=\""+p.id+"\">"+p.name+" — "+p.brand+"</option>").join("");
    const savedRow=saved?.rows?.[index];
    if(savedRow?.id && getProduct(savedRow.id)){select.value=savedRow.id}
    const grams=Number(savedRow?.grams)||0;
    const control=document.createElement("div");
    control.className="bag-grams-control";
    control.innerHTML='<button type="button" class="bag-grams-btn" data-bag-minus aria-label="100 gram minder">−</button><span class="bag-grams-value">0 g</span><button type="button" class="bag-grams-btn" data-bag-plus aria-label="100 gram meer">+</button>';
    oldInput.replaceWith(control);
    return {row,select,control,value:q(".bag-grams-value",control),grams,position:index};
  }).filter(Boolean);

  function syncOptionState(){
    qa('[data-bag-option="size"]',form).forEach(x=>x.classList.toggle("active",Number(x.dataset.value)===state.size));
    qa('[data-bag-option="sticker"]',form).forEach(x=>x.classList.toggle("active",x.dataset.value===state.sticker));
    qa('[data-bag-option="bagColor"]',form).forEach(x=>x.classList.toggle("active",x.dataset.value===state.bagColor));
  }
  syncOptionState();
  const noteEl=q("[data-bag-note]",form); if(noteEl)noteEl.value=state.note;

  qa("[data-bag-option]",form).forEach(el=>el.addEventListener("click",()=>{
    qa('[data-bag-option="'+el.dataset.bagOption+'"]',form).forEach(x=>x.classList.remove("active"));
    el.classList.add("active");
    state[el.dataset.bagOption]=el.dataset.bagOption==="size"?Number(el.dataset.value):el.dataset.value;
    if(el.dataset.bagOption==="size"){
      let remaining=state.size;
      rows.forEach(r=>{r.grams=Math.min(Math.max(0,r.grams),Math.max(0,remaining));remaining-=r.grams});
    }
    update();
  }));

  rows.forEach(r=>{
    r.select.addEventListener("change",update);
    q("[data-bag-minus]",r.row)?.addEventListener("click",()=>changeGrams(r,-100));
    q("[data-bag-plus]",r.row)?.addEventListener("click",()=>changeGrams(r,100));
  });
  if(noteEl)noteEl.addEventListener("input",()=>{state.note=noteEl.value||"";update()});

  function changeGrams(r,delta){
    if(delta>0 && !r.select.value){toast("Kies eerst een snoepsoort.");r.select.focus();return}
    const total=rows.reduce((sum,x)=>sum+x.grams,0);
    const other=total-r.grams;
    const maxForRow=Math.max(0,state.size-other);
    r.grams=Math.max(0,Math.min(maxForRow,r.grams+delta));
    update();
  }

  function update(){
    const selected=rows.filter(r=>r.grams>0&&r.select.value).map(r=>({id:r.select.value,name:getProduct(r.select.value)?.name||"",grams:r.grams}));
    const grams=rows.reduce((a,b)=>a+b.grams,0), max=state.size, price=(max/100)*CONFIG.pricePer100g;
    rows.forEach(r=>{r.value.textContent=r.grams+" g";r.value.classList.toggle("is-selected",r.grams>0)});
    q("#bagPrice").textContent=eur(price);
    q("#bagPriceBottom")&&(q("#bagPriceBottom").textContent=eur(price));
    q("#bagWeight").textContent=grams+" / "+max+" g ingevuld";
    q("#bagRemaining").textContent=grams===max?"Perfect gevuld!":grams<max?Math.max(0,max-grams)+" g over":"Je hebt "+(grams-max)+" g te veel.";
    q("#bagGift").textContent=grams>=CONFIG.freeBagFrom?"🎁 Extra snoepzakje inbegrepen":"";
    const invalid=rows.some(r=>r.grams>0&&!r.select.value);
    q("#bagAdd").disabled=grams!==max||invalid;
    const draft={size:state.size,sticker:state.sticker,note:state.note,bagColor:state.bagColor,rows:rows.map(r=>({id:r.select.value||"",name:getProduct(r.select.value)?.name||"",grams:r.grams}))};
    saveBagDraft(draft);
    renderCart();
  }

  q("#bagAdd")?.addEventListener("click",()=>{
    const selected=rows.filter(r=>r.grams>0).map(r=>({id:r.select.value,name:getProduct(r.select.value)?.name||"",grams:r.grams}));
    if(selected.some(x=>!x.id)){toast("Kies een snoepsoort voor elke ingevulde regel.");return}
    const grams=selected.reduce((a,b)=>a+b.grams,0);
    if(grams!==state.size){toast("Vul de zak exact tot "+state.size+" g.");return}
    addCustomMix(selected,{type:"personalized-bag",size:state.size,sticker:state.sticker,note:state.note,bagColor:state.bagColor});
    clearBagDraft();
    renderCart();
  });
  update();
}
function initGiftBoxes(){const form=q("#giftBoxForm");if(!form)return;let size=500,sticker="Voor jou",note="";qa("[data-box-size]").forEach(b=>b.addEventListener("click",()=>{qa("[data-box-size]").forEach(x=>x.classList.remove("active"));b.classList.add("active");size=Number(b.dataset.boxSize);update()}));qa("[data-box-sticker]").forEach(b=>b.addEventListener("click",()=>{qa("[data-box-sticker]").forEach(x=>x.classList.remove("active"));b.classList.add("active");sticker=b.dataset.boxSticker}));q("#boxNote")?.addEventListener("input",e=>note=e.target.value);function update(){q("#boxPrice").textContent=eur(3.5+(size/100)*CONFIG.pricePer100g);q("#boxSize").textContent=size+" g"}q("#boxAdd")?.addEventListener("click",()=>addCustomMix([{name:"Gepersonaliseerde snoepdoos",id:"gift-box",grams:size}],{type:"gift-box",size,sticker,note,priceOverride:3.5+(size/100)*CONFIG.pricePer100g}));update()}
function initPopup(){const p=q("#firstOrderPopup");if(!p)return;let seen=false;try{seen=sessionStorage.getItem("hbFirstPopupSeen")==="1"}catch(e){}if(!seen)setTimeout(()=>p.classList.add("open"),1200);q("#popupClose")?.addEventListener("click",()=>{p.classList.remove("open");try{sessionStorage.setItem("hbFirstPopupSeen","1")}catch(e){}});q("#popupForm")?.addEventListener("submit",e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries());if(!d.consent){toast("Vink de marketingtoestemming aan.");return}try{localStorage.setItem("hbLead",JSON.stringify(d))}catch(err){}p.classList.remove("open");toast("Welkom! Code SWEET10 geeft 10% korting.");try{sessionStorage.setItem("hbFirstPopupSeen","1")}catch(err){}})}
document.addEventListener("click",e=>{const deal=e.target.closest("[data-deal]");if(deal)addDeal(deal.dataset.deal);if(e.target.closest("[data-open-cart]"))openCart();if(e.target.closest("#cartClose"))closeCart();const qty=e.target.closest("[data-qty]");if(qty)updateQty(qty.dataset.id,Number(qty.dataset.qty));if(e.target.closest("#checkoutButton"))checkout()});
q("#cartModal")?.addEventListener("click",e=>{if(e.target===e.currentTarget)closeCart()});
document.addEventListener("DOMContentLoaded",()=>{initShop();initPickMix();initBagBuilder();initGiftBoxes();initPopup();renderCart();q("#tiktokLiveButton")?.addEventListener("click",()=>window.open(CONFIG.tiktokUrl,"_blank","noopener"));if(q("[data-open-cart]")&&!q("#floatingCartButton")){const b=document.createElement("button");b.id="floatingCartButton";b.className="floating-cart";b.type="button";b.setAttribute("data-open-cart","");b.innerHTML="🛒 <span>Mandje</span> <b id=\"floatingCartCount\">0</b>";document.body.appendChild(b);const sync=()=>{const n=cartItemsDetailed().reduce((a,b)=>a+b.quantity,0);q("#floatingCartCount")&&(q("#floatingCartCount").textContent=n)};sync();setInterval(sync,500)}q("#bagBuilderForm")?.addEventListener("click",e=>{if(e.target.closest("[data-scroll-bag]")){closeCart();q("#bagBuilderForm")?.scrollIntoView({behavior:"smooth",block:"start"})}});});
})();