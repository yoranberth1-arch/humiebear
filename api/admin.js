import crypto from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://yrcajvpstbyupohjbavm.supabase.co";
const COOKIE = "hb_admin_session";

function json(res, status, body) { return res.status(status).json(body); }
function clean(v, max=500) { return String(v ?? "").trim().slice(0,max); }
function secret() {
  const s=process.env.ADMIN_SESSION_SECRET;
  if(!s) throw new Error("ADMIN_SESSION_SECRET ontbreekt in Vercel.");
  return s;
}
function sign(value){return crypto.createHmac("sha256",secret()).update(value).digest("base64url");}
function encode(payload){const raw=Buffer.from(JSON.stringify(payload)).toString("base64url");return raw+"."+sign(raw);}
function decode(token){
  if(!token||!token.includes(".")) return null;
  const parts=token.split(".");const raw=parts[0],sig=parts[1]||"";
  const expected=sign(raw);
  if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) return null;
  let p;try{p=JSON.parse(Buffer.from(raw,"base64url").toString("utf8"))}catch{return null}
  if(!p?.exp||p.exp<Math.floor(Date.now()/1000)) return null;
  return p;
}
function cookies(req){
  const out={};
  for(const part of String(req.headers.cookie||"").split(";")){
    const i=part.indexOf("=");if(i>-1)out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim());
  }return out;
}
function setCookie(res,v,maxAge=28800){
  res.setHeader("Set-Cookie",COOKIE+"="+encodeURIComponent(v)+"; Path=/; Max-Age="+maxAge+"; HttpOnly; Secure; SameSite=Lax");
}
function clearCookie(res){res.setHeader("Set-Cookie",COOKIE+"=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax");}
function requireAuth(req){const s=decode(cookies(req)[COOKIE]);if(!s)throw Object.assign(new Error("Niet ingelogd."),{status:401});return s;}
async function sbFetch(path,options={}){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)throw new Error("SUPABASE_SERVICE_ROLE_KEY ontbreekt in Vercel.");
  const response=await fetch(SUPABASE_URL+"/rest/v1/"+path,{...options,headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Accept:"application/json",...(options.headers||{})}});
  const text=await response.text();let body=null;try{body=text?JSON.parse(text):null}catch{}
  if(!response.ok){const e=new Error(body?.message||body?.hint||text||"Supabase request failed.");e.status=response.status;throw e}return body;
}
async function authFetch(path,options={}){
  const key=process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_KEY;
  if(!key)throw new Error("SUPABASE_ANON_KEY ontbreekt in Vercel.");
  const response=await fetch(SUPABASE_URL+"/auth/v1/"+path,{...options,headers:{apikey:key,"Content-Type":"application/json",Accept:"application/json",...(options.headers||{})}});
  const text=await response.text();let body=null;try{body=text?JSON.parse(text):null}catch{}
  if(!response.ok){const e=new Error(body?.msg||body?.error_description||body?.message||text||"Auth fout.");e.status=response.status;throw e}return body;
}
async function logAction(session,action,entityType="",entityId="",details={}){
  try{await sbFetch("audit_log",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({actor_user_id:session.user_id||null,actor_role:session.role||"owner",action,entity_type:entityType||null,entity_id:entityId?String(entityId):null,details,created_at:new Date().toISOString()})})}catch{}
}
async function maybe(table){
  try{return {ok:true,data:await sbFetch(table+"?select=*")}}catch(e){return {ok:false,error:e}}
}
function inputBody(req){if(req.body&&typeof req.body==="object")return req.body;try{return JSON.parse(req.body||"{}")}catch{return {}}}

export default async function handler(req,res){
  const body=inputBody(req);const action=body.action||"";
  try{
    if(req.method==="GET"){try{const s=requireAuth(req);return json(res,200,{ok:true,session:{kind:s.kind,user_id:s.user_id,role:s.role,name:s.name,email:s.email,exp:s.exp}})}catch{return json(res,401,{ok:false,error:"Niet ingelogd."})}}
    if(action==="login"){
      const master=process.env.ADMIN_MASTER_PIN,pin=clean(body.pin,64);
      if(master&&pin&&pin===master){const s={kind:"master",user_id:null,role:"owner",name:"Hummie Bear Admin",exp:Math.floor(Date.now()/1000)+28800};setCookie(res,encode(s));return json(res,200,{ok:true,session:s})}
      const email=clean(body.email,180).toLowerCase(),password=String(body.password||"");
      if(!email||!password)return json(res,401,{error:"Ongeldige inloggegevens."});
      const auth=await authFetch("token?grant_type=password",{method:"POST",body:JSON.stringify({email,password})}),user=auth.user;
      if(!user?.id||!auth.access_token)return json(res,401,{error:"Ongeldige inloggegevens."});
      const staffRows=await sbFetch("staff_members?select=*&auth_user_id=eq."+encodeURIComponent(user.id)+"&limit=1"),staff=staffRows?.[0];
      if(!staff)return json(res,403,{error:"Dit account heeft geen Hummie Bear beheertoegang."});
      if(staff.is_active===false)return json(res,403,{error:"Dit medewerkersaccount is gedeactiveerd."});
      const s={kind:"supabase",user_id:user.id,role:staff.role||"staff",name:staff.full_name||user.email,email:user.email,access_token:auth.access_token,refresh_token:auth.refresh_token||null,exp:Math.floor(Date.now()/1000)+Math.min(Number(auth.expires_in||3600),28800)};
      setCookie(res,encode(s));return json(res,200,{ok:true,session:{kind:s.kind,user_id:s.user_id,role:s.role,name:s.name,email:s.email,exp:s.exp}});
    }
    if(action==="logout"){clearCookie(res);return json(res,200,{ok:true})}
    const session=requireAuth(req);

    if(action==="bootstrap"){
      const data=await Promise.all([sbFetch("quotes?select=*&order=created_at.desc"),sbFetch("events?select=*&order=event_date.asc"),sbFetch("orders?select=*&order=created_at.desc"),maybe("inventory"),maybe("expenses"),maybe("tasks"),maybe("staff_members")]);
      return json(res,200,{quotes:data[0],events:data[1],orders:data[2],inventory:data[3].ok?data[3].data:[],expenses:data[4].ok?data[4].data:[],tasks:data[5].ok?data[5].data:[],staff:data[6].ok?data[6].data:[],availability:{inventory:data[3].ok,expenses:data[4].ok,tasks:data[5].ok,staff:data[6].ok}});
    }
    if(action==="createQuote"){
      const row={id:crypto.randomUUID(),...(body.payload||{}),created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      await sbFetch("quotes",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(row)});await logAction(session,"create","quote",row.id,row);return json(res,200,{ok:true,id:row.id});
    }
    if(action==="updateQuote"){
      const id=clean(body.id,200);if(!id)return json(res,400,{error:"Ontbrekende aanvraag-id."});
      await sbFetch("quotes?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({...body.payload,updated_at:new Date().toISOString()})});await logAction(session,"update","quote",id,body.payload||{});return json(res,200,{ok:true});
    }
    if(action==="setQuoteStatus"){
      const id=clean(body.id,200),status=clean(body.status,40);
      await sbFetch("quotes?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({status,updated_at:new Date().toISOString()})});await logAction(session,"status","quote",id,{status});return json(res,200,{ok:true});
    }
    if(action==="acceptQuote"){
      const id=clean(body.id,200),rows=await sbFetch("quotes?id=eq."+encodeURIComponent(id)+"&limit=1"),q=rows?.[0];
      if(!q)return json(res,404,{error:"Aanvraag niet gevonden."});
      const existing=await sbFetch("events?event_date=eq."+encodeURIComponent(q.event_date||"0000-00-00")+"&status=eq.confirmed&select=id,event_name,start_time,end_time");
      const conflict=(existing||[]).find(e=>q.start_time&&q.end_time&&e.start_time&&e.end_time&&q.start_time<String(e.end_time)&&q.end_time>String(e.start_time));
      if(conflict&&!body.force)return json(res,409,{error:"Er is al een overlappend bevestigd event.",conflict});
      const eid=crypto.randomUUID(),row={id:eid,quote_id:q.id,title:q.event_name||q.name||"Hummie Bear evenement",name:q.name,organisation:q.organisation,email:q.email,phone:q.phone,event_name:q.event_name,event_date:q.event_date,start_time:q.start_time,end_time:q.end_time,location:q.location,guests:q.guests,hours:q.hours,event_type:q.event_type,edition:q.edition,options:q.options,practical_notes:q.practical_notes,final_price:q.final_price??q.estimated_price,status:"confirmed",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      await sbFetch("events",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(row)});
      await sbFetch("quotes?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({status:"accepted",updated_at:new Date().toISOString()})});
      if(q.email){
        try{
          const cleanEmailText=v=>String(v??"").replace(/[<>]/g,"").slice(0,500);
          const html="<div style='font-family:Arial,Helvetica,sans-serif;max-width:650px;margin:auto;padding:30px;background:#f5f7fb;color:#101828'><div style='background:#fff;border-radius:16px;padding:28px;border:1px solid #e4e7ec'><h1 style='margin-top:0'>Reservatie bevestigd</h1><p>Hallo "+cleanEmailText(q.name||"daar")+"!</p><p>Je aanvraag bij <strong>Hummie Bear</strong> is bevestigd.</p><div style='padding:16px;background:#eef2ff;border-radius:12px'><strong>"+cleanEmailText(q.event_name||"Evenement")+"</strong><br>"+cleanEmailText(q.event_date)+" · "+cleanEmailText(q.location)+"<br>"+cleanEmailText(q.guests)+" gasten · "+cleanEmailText(q.edition)+"</div><p>Tot binnenkort!</p><strong>Hummie Bear</strong></div></div>";
          await fetch(SUPABASE_URL+"/functions/v1/hummie-bear-email",{method:"POST",headers:{apikey:process.env.SUPABASE_ANON_KEY||"",Authorization:"Bearer "+(process.env.SUPABASE_SERVICE_ROLE_KEY||""),"Content-Type":"application/json"},body:JSON.stringify({to:q.email,subject:"Je reservatie bij Hummie Bear is bevestigd!",html})});
        }catch(mailError){console.error("Confirmation email failed",mailError)}
      }
      await logAction(session,"accept","quote",id,{event_id:eid});return json(res,200,{ok:true,event_id:eid});
    }
    if(action==="createEvent"||action==="updateEvent"){
      const p={...(body.payload||{}),updated_at:new Date().toISOString()};
      if(action==="createEvent"){p.id=crypto.randomUUID();p.created_at=new Date().toISOString();await sbFetch("events",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(p)});await logAction(session,"create","event",p.id,p);return json(res,200,{ok:true,id:p.id})}
      const id=clean(body.id,200);await sbFetch("events?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify(p)});await logAction(session,"update","event",id,p);return json(res,200,{ok:true});
    }
    if(action==="updateOrder"){
      const id=clean(body.id,200),p={...(body.payload||{}),updated_at:new Date().toISOString()};await sbFetch("orders?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify(p)});await logAction(session,"update","order",id,p);return json(res,200,{ok:true});
    }
    if(action==="createInventory"||action==="updateInventory"){
      if(!["owner","manager"].includes(session.role))return json(res,403,{error:"Je hebt geen rechten om voorraad te wijzigen."});
      const p={...(body.payload||{}),updated_at:new Date().toISOString()};
      if(action==="createInventory"){p.id=crypto.randomUUID();p.created_at=new Date().toISOString();await sbFetch("inventory",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(p)});return json(res,200,{ok:true,id:p.id})}
      const id=clean(body.id,200);await sbFetch("inventory?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify(p)});return json(res,200,{ok:true});
    }
    if(action==="createExpense"||action==="updateExpense"){
      if(!["owner","manager","finance"].includes(session.role))return json(res,403,{error:"Je hebt geen financiële schrijfrechten."});
      const p={...(body.payload||{}),updated_at:new Date().toISOString()};
      if(action==="createExpense"){p.id=crypto.randomUUID();p.created_at=new Date().toISOString();await sbFetch("expenses",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(p)});return json(res,200,{ok:true,id:p.id})}
      const id=clean(body.id,200);await sbFetch("expenses?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify(p)});return json(res,200,{ok:true});
    }
    if(action==="deleteExpense"){
      if(!["owner","manager","finance"].includes(session.role))return json(res,403,{error:"Geen financiële schrijfrechten."});await sbFetch("expenses?id=eq."+encodeURIComponent(clean(body.id,200)),{method:"DELETE"});return json(res,200,{ok:true});
    }
    if(action==="createTask"||action==="updateTask"){
      const p={...(body.payload||{}),updated_at:new Date().toISOString()};
      if(action==="createTask"){p.id=crypto.randomUUID();p.created_at=new Date().toISOString();await sbFetch("tasks",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(p)});return json(res,200,{ok:true,id:p.id})}
      const id=clean(body.id,200);await sbFetch("tasks?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify(p)});return json(res,200,{ok:true});
    }
    if(action==="createStaff"){
      if(session.role!=="owner")return json(res,403,{error:"Alleen de eigenaar kan medewerkers aanmaken."});
      const email=clean(body.email,180).toLowerCase(),password=String(body.password||"");if(!email||password.length<8)return json(res,400,{error:"E-mail en wachtwoord van minstens 8 tekens zijn vereist."});
      const service=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!service)throw new Error("Service role ontbreekt.");
      const response=await fetch(SUPABASE_URL+"/auth/v1/admin/users",{method:"POST",headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json"},body:JSON.stringify({email,password,email_confirm:true,user_metadata:{full_name:clean(body.full_name,150)}})});
      const u=await response.json().catch(()=>({}));if(!response.ok)return json(res,response.status,{error:u.msg||u.message||"Medewerker kon niet worden aangemaakt."});
      const row={auth_user_id:u.id,full_name:clean(body.full_name,150),email,role:clean(body.role,40)||"staff",is_active:true,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      await sbFetch("staff_members",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(row)});return json(res,200,{ok:true});
    }
    if(action==="updateStaff"){
      if(session.role!=="owner")return json(res,403,{error:"Alleen de eigenaar kan medewerkers beheren."});
      const id=clean(body.id,200);await sbFetch("staff_members?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({...body.payload,updated_at:new Date().toISOString()})});return json(res,200,{ok:true});
    }
    return json(res,400,{error:"Onbekende actie."});
  }catch(e){console.error("Hummie Bear admin API",e);return json(res,e.status||500,{error:e.message||"Serverfout."})}
}
