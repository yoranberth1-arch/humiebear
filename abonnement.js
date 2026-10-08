(() => {
"use strict";
const OPTIONS={
 monthly2kg:{label:"2 kg elke maand",summary:"2 kg per maand · €90 / 3 maanden"},
 biweekly1kg:{label:"1 kg elke 2 weken",summary:"1 kg om de 2 weken · €90 / 3 maanden"}
};
let selectedChoice=null;
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
function update(){
 const o=selectedChoice?OPTIONS[selectedChoice]:null;
 $$("[data-choice-card]").forEach(c=>c.classList.toggle("is-selected",c.dataset.choiceCard===selectedChoice));
 $("#selectedSummary").textContent=o?o.summary:"Kies eerst een formule";
 $("#checkoutPrice").textContent="€90 / 3 maanden";
 $("#checkoutPriceBottom").textContent="€90 / 3 maanden";
}
$$("[data-select-choice]").forEach(b=>b.addEventListener("click",()=>{
 selectedChoice=b.dataset.selectChoice;update();
 document.querySelector("#voorkeuren")?.scrollIntoView({behavior:"smooth",block:"start"});
}));
function setMessage(m,type=""){const e=$("#subscriptionMessage");if(e){e.textContent=m;e.className="sub-message"+(type?" "+type:"");}}
$("#subscriptionForm")?.addEventListener("submit",async e=>{
 e.preventDefault();
 if(!selectedChoice){setMessage("Kies eerst een Sweet Club formule.","error");document.querySelector("#abonnementen")?.scrollIntoView({behavior:"smooth",block:"center"});return;}
 const form=e.currentTarget;if(!form.checkValidity()){form.reportValidity();return;}
 const d=Object.fromEntries(new FormData(form).entries()),btn=$("#subscriptionButton");
 btn.disabled=true;btn.textContent="Beveiligde betaling openen…";setMessage("We maken je beveiligde Mollie-betaalpagina aan.","pending");
 try{
  const r=await fetch("https://humiebear.vercel.app/api/create-subscription-payment",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({
   plan:selectedChoice,
   customer:{name:d.firstName+" "+d.lastName,email:d.email,phone:d.phone,address:d.address,postalCode:d.postalCode,city:d.city,
    style:d.style,avoid:d.avoid||"",choice:selectedChoice,deliveryMethod:d.deliveryMethod}
  })});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!data.checkoutUrl)throw new Error(data.error||"De betaalpagina kon niet worden geopend.");
  window.location.href=data.checkoutUrl;
 }catch(err){setMessage(err.message||"Er ging iets mis. Probeer opnieuw.","error");btn.disabled=false;btn.textContent="Verder naar veilige betaling";}
});
update();
})();