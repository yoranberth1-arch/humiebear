(() => {
"use strict";
const WEIGHTS={500:{label:"500 g",price:14.95},1000:{label:"1 kg",price:19.95},1500:{label:"1,5 kg",price:27.95}};
const FREQUENCIES={weekly:"Elke week",biweekly:"Elke 2 weken",monthly:"Elke maand"};
let selectedWeight=null;
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const euro=v=>new Intl.NumberFormat("nl-BE",{style:"currency",currency:"EUR"}).format(v);
function frequency(){return document.querySelector('input[name="frequency"]:checked')?.value||"weekly";}
function update(){
 const f=frequency(),w=selectedWeight?WEIGHTS[selectedWeight]:null;
 $$("[data-weight-card]").forEach(c=>c.classList.toggle("is-selected",c.dataset.weightCard===String(selectedWeight)));
 $("#frequencyLabel").textContent=FREQUENCIES[f];
 if(w){$("#selectedSummary").textContent=w.label+" · "+FREQUENCIES[f];$("#checkoutPrice").textContent=euro(w.price)+" / levering";$("#checkoutPriceBottom").textContent=euro(w.price)+" / levering";}
 else {$("#selectedSummary").textContent="Kies eerst je gewicht";$("#checkoutPrice").textContent="—";$("#checkoutPriceBottom").textContent="Kies eerst je gewicht";}
}
$$("[data-select-weight]").forEach(b=>b.addEventListener("click",()=>{selectedWeight=Number(b.dataset.selectWeight);update();document.querySelector("#voorkeuren")?.scrollIntoView({behavior:"smooth",block:"start"});}));
$$('input[name="frequency"]').forEach(r=>r.addEventListener("change",update));
function setMessage(m,type=""){const e=$("#subscriptionMessage");if(e){e.textContent=m;e.className="sub-message"+(type?" "+type:"");}}
$("#subscriptionForm")?.addEventListener("submit",async e=>{
 e.preventDefault();
 if(!selectedWeight){setMessage("Kies eerst hoeveel snoep je per levering wilt.","error");document.querySelector("#abonnementen")?.scrollIntoView({behavior:"smooth",block:"center"});return;}
 const form=e.currentTarget;if(!form.checkValidity()){form.reportValidity();return;}
 const d=Object.fromEntries(new FormData(form).entries()),btn=$("#subscriptionButton");
 btn.disabled=true;btn.textContent="Beveiligde betaling openen…";setMessage("We maken je beveiligde Mollie-betaalpagina aan.","pending");
 try{
  const r=await fetch("/api/create-subscription-payment",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({
   plan:selectedWeight===1500?"plus":selectedWeight===1000?"sweet":"custom",
   customer:{name:d.firstName+" "+d.lastName,email:d.email,phone:d.phone,address:d.address,postalCode:d.postalCode,city:d.city,
    style:d.style,avoid:d.avoid||"",weight:String(selectedWeight),frequency:d.frequency}
  })});
  const data=await r.json().catch(()=>({}));if(!r.ok||!data.checkoutUrl)throw new Error(data.error||"De betaalpagina kon niet worden geopend.");
  window.location.href=data.checkoutUrl;
 }catch(err){setMessage(err.message||"Er ging iets mis. Probeer opnieuw.","error");btn.disabled=false;btn.textContent="Verder naar veilige betaling";}
});
update();
})();