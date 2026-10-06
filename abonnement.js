(() => {
"use strict";
const PLANS={sweet:{label:"Sweet Box",price:19.95},plus:{label:"Sweet Box Plus",price:29.95}};
let selectedPlan=null;
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const euro=v=>new Intl.NumberFormat("nl-BE",{style:"currency",currency:"EUR"}).format(v);
function setMessage(m,type=""){const e=$("#subscriptionMessage");if(e){e.textContent=m;e.className="sub-message"+(type?" "+type:"");}}
function selectPlan(key){const p=PLANS[key];if(!p)return;selectedPlan=key;$$("[data-plan-card]").forEach(c=>c.classList.toggle("is-selected",c.dataset.planCard===key));$("#selectedPlanLabel").textContent=p.label;$("#selectedPlanPrice").textContent=euro(p.price)+" / maand";$("#checkoutPrice").textContent=euro(p.price)+" / maand";document.querySelector("#voorkeuren")?.scrollIntoView({behavior:"smooth",block:"start"});setMessage("");}
$$("[data-select-plan]").forEach(b=>b.addEventListener("click",()=>selectPlan(b.dataset.selectPlan)));
$("#subscriptionForm")?.addEventListener("submit",async e=>{
 e.preventDefault();
 if(!selectedPlan){setMessage("Kies eerst een abonnement.","error");document.querySelector("#abonnementen")?.scrollIntoView({behavior:"smooth",block:"center"});return;}
 const form=e.currentTarget;if(!form.checkValidity()){form.reportValidity();return;}
 const d=Object.fromEntries(new FormData(form).entries()),btn=$("#subscriptionButton");
 btn.disabled=true;btn.textContent="Beveiligde betaling openen…";setMessage("We maken je beveiligde Mollie-betaalpagina aan.","pending");
 try{
  const r=await fetch("/api/create-subscription-payment",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({plan:selectedPlan,customer:{name:d.firstName+" "+d.lastName,email:d.email,phone:d.phone,address:d.address,postalCode:d.postalCode,city:d.city,style:d.style,avoid:d.avoid||""}})});
  const data=await r.json().catch(()=>({}));if(!r.ok||!data.checkoutUrl)throw new Error(data.error||"De betaalpagina kon niet worden geopend.");
  window.location.href=data.checkoutUrl;
 }catch(err){setMessage(err.message||"Er ging iets mis. Probeer opnieuw.","error");btn.disabled=false;btn.textContent="Verder naar betaling";}
});
})();