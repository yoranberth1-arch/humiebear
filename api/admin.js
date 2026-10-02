import crypto from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://yrcajvpstbyupohjbavm.supabase.co";
const SUPABASE_PUBLIC_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_TjBCB01RHm67xQVm3CtvEw_b0qxklDJ";
const COOKIE = "hb_admin_auth";

function json(res,status,body){return res.status(status).json(body);}
function clean(v,max=500){return String(v ?? "").trim().slice(0,max);}
function inputBody(req){if(req.body&&typeof req.body==="object")return req.body;try{return JSON.parse(req.body||"{}")}catch{return {}}}
function cookies(req){const out={};for(const part of String(req.headers.cookie||"").split(";")){const i=part.indexOf("=");if(i>-1)out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim())}return out}
function cookiePayload(req){const raw=cookies(req)[COOKIE];if(!raw)return null;try{return JSON.parse(Buffer.from(raw,"base64url").toString("utf8"))}catch{return null}}
function setAuthCookie(res,session,maxAge=28800){const raw=Buffer.from(JSON.stringify(session)).toString("base64url");res.setHeader("Set-Cookie",COOKIE+"="+encodeURIComponent(raw)+"; Path=/; Max-Age="+maxAge+"; HttpOnly; Secure; SameSite=Lax")}
function clearAuthCookie(res){res.setHeader("Set-Cookie",COOKIE+"=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax")}
function roleCan(session,roles){return roles.includes(session.role)}
async function sbFetch(path,options={}){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)throw new Error("SUPABASE_SERVICE_ROLE_KEY ontbreekt in Vercel.");
  const response=await fetch(SUPABASE_URL+"/rest/v1/"+path,{...options,headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Accept:"application/json",...(options.headers||{})}});
  const text=await response.text();let body=null;try{body=text?JSON.parse(text):null}catch{}
  if(!response.ok){const e=new Error(body?.message||body?.hint||text||"Supabase request failed.");e.status=response.status;throw e}return body
}
async function authFetch(path,options={}){
  const response=await fetch(SUPABASE_URL+"/auth/v1/"+path,{...options,headers:{apikey:SUPABASE_PUBLIC_KEY,"Content-Type":"application/json",Accept:"application/json",...(options.headers||{})}});
  const text=await response.text();let body=null;try{body=text?JSON.parse(text):null}catch{}
  if(!response.ok){const e=new Error(body?.msg||body?.error_description||body?.message||text||"Auth fout.");e.status=response.status;throw e}return body
}
async function getAuthUser(accessToken){
  const response=await fetch(SUPABASE_URL+"/auth/v1/user",{headers:{apikey:SUPABASE_PUBLIC_KEY,Authorization:"Bearer "+accessToken,Accept:"application/json"}});
  const text=await response.text();let body=null;try{body=text?JSON.parse(text):null}catch{}
  if(!response.ok){const e=new Error(body?.message||body?.msg||"Sessie verlopen.");e.status=401;throw e}return body
}
async function resolveSession(accessToken){
  const user=await getAuthUser(accessToken);
  const staffRows=await sbFetch("staff_members?select=*&auth_user_id=eq."+encodeURIComponent(user.id)+"&limit=1");
  const staff=staffRows?.[0];
  if(staff){
    if(staff.is_active===false)throw Object.assign(new Error("Dit medewerkersaccount is gedeactiveerd."),{status:403});
    return {kind:"supabase",user_id:user.id,email:user.email||staff.email,name:staff.full_name||user.email,role:staff.role||"staff"};
  }
  const profileRows=await sbFetch("profiles?select=id,full_name,role&id=eq."+encodeURIComponent(user.id)+"&limit=1");
  const profile=profileRows?.[0];
  if(profile?.role==="admin")return {kind:"supabase",user_id:user.id,email:user.email,name:profile.full_name||user.email,role:"owner"};
  throw Object.assign(new Error("Dit account heeft geen Hummie Bear beheertoegang."),{status:403});
}
async function requireAuth(req,res){
  const p=cookiePayload(req);
  if(!p?.access_token){throw Object.assign(new Error("Niet ingelogd."),{status:401})}
  try{return await resolveSession(p.access_token)}
  catch(err){
    if(p.refresh_token){
      try{
        const auth=await authFetch("token?grant_type=refresh_token",{method:"POST",body:JSON.stringify({refresh_token:p.refresh_token})});
        if(auth?.access_token){
          const session=await resolveSession(auth.access_token);
          setAuthCookie(res,{access_token:auth.access_token,refresh_token:auth.refresh_token||p.refresh_token});
          return session;
        }
      }catch{}
    }
    throw err;
  }
}
async function logAction(session,action,entityType="",entityId="",details={}){
  try{await sbFetch("audit_log",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({actor_user_id:session.user_id||null,actor_role:session.role||"staff",action,entity_type:entityType||null,entity_id:entityId?String(entityId):null,details,created_at:new Date().toISOString()})})}catch{}
}
async function maybe(table){try{return {ok:true,data:await sbFetch(table+"?select=*")}}catch(e){return {ok:false,error:e}}}

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Referrer-Policy","same-origin");

  const body=inputBody(req);
  const action=body.action||"";

  try{
    if(req.method==="GET"){
      try{
        const session=await requireAuth(req,res);
        return json(res,200,{ok:true,session});
      }catch(err){return json(res,err.status===403?403:401,{ok:false,error:err.message||"Niet ingelogd."})}
    }

    if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});

    if(action==="login"){
      const email=clean(body.email,180).toLowerCase();
      const password=String(body.password||"");
      if(!email||!password)return json(res,400,{error:"Vul je medewerkers e-mail en wachtwoord in."});
      const auth=await authFetch("token?grant_type=password",{method:"POST",body:JSON.stringify({email,password})});
      if(!auth?.access_token||!auth?.user?.id)return json(res,401,{error:"Ongeldige inloggegevens."});
      const session=await resolveSession(auth.access_token);
      setAuthCookie(res,{access_token:auth.access_token,refresh_token:auth.refresh_token||null});
      await logAction(session,"login","session",session.user_id,{});
      return json(res,200,{ok:true,session});
    }

    if(action==="logout"){clearAuthCookie(res);return json(res,200,{ok:true})}

    const session=await requireAuth(req,res);

    if(action==="bootstrap"){
      const canManage=roleCan(session,["owner","manager"]);
      const canOrders=roleCan(session,["owner","manager","staff","warehouse","finance"]);
      const canInventory=roleCan(session,["owner","manager","warehouse"]);
      const canFinance=roleCan(session,["owner","manager","finance"]);
      const canTasks=roleCan(session,["owner","manager","staff","warehouse","finance"]);
      const canStaff=roleCan(session,["owner"]);

      const [quotes,events,orders,inventory,expenses,tasks,staff]=await Promise.all([
        canManage?sbFetch("quotes?select=*&order=created_at.desc"):[],
        canManage?sbFetch("events?select=*&order=event_date.asc"):[],
        canOrders?sbFetch("orders?select=*,order_items(*)&order=created_at.desc"):[],
        canInventory?maybe("inventory"):Promise.resolve({ok:false,data:[]}),
        canFinance?maybe("expenses"):Promise.resolve({ok:false,data:[]}),
        canTasks?maybe("tasks"):Promise.resolve({ok:false,data:[]}),
        canStaff?maybe("staff_members"):Promise.resolve({ok:false,data:[]})
      ]);

      return json(res,200,{
        quotes:quotes||[],
        events:events||[],
        orders:orders||[],
        inventory:inventory?.ok?inventory.data:[],
        expenses:expenses?.ok?expenses.data:[],
        tasks:tasks?.ok?tasks.data:[],
        staff:staff?.ok?staff.data:[],
        availability:{inventory:!!inventory?.ok,expenses:!!expenses?.ok,tasks:!!tasks?.ok,staff:!!staff?.ok,role:session.role}
      });
    }

    if(action==="createQuote"||action==="updateQuote"||action==="setQuoteStatus"||action==="acceptQuote"){
      if(!roleCan(session,["owner","manager"]))return json(res,403,{error:"Je hebt geen rechten om eventaanvragen te beheren."});
    }
    if(action==="createEvent"||action==="updateEvent"){
      if(!roleCan(session,["owner","manager"]))return json(res,403,{error:"Je hebt geen rechten om evenementen te beheren."});
    }
    if(action==="updateOrder"){
      if(!roleCan(session,["owner","manager","staff","warehouse"]))return json(res,403,{error:"Je hebt geen rechten om bestellingen te verwerken."});
    }

    if(action==="createQuote"){
      const row={id:crypto.randomUUID(),...(body.payload||{}),created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      await sbFetch("quotes",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(row)});
      await logAction(session,"create","quote",row.id,row);return json(res,200,{ok:true,id:row.id});
    }
    if(action==="updateQuote"){
      const id=clean(body.id,200);if(!id)return json(res,400,{error:"Ontbrekende aanvraag-id."});
      await sbFetch("quotes?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({...body.payload,updated_at:new Date().toISOString()})});
      await logAction(session,"update","quote",id,body.payload||{});return json(res,200,{ok:true});
    }
    if(action==="setQuoteStatus"){
      const id=clean(body.id,200),status=clean(body.status,40);
      await sbFetch("quotes?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({status,updated_at:new Date().toISOString()})});
      await logAction(session,"status","quote",id,{status});return json(res,200,{ok:true});
    }
    if(action==="acceptQuote"){
      const id=clean(body.id,200),rows=await sbFetch("quotes?id=eq."+encodeURIComponent(id)+"&limit=1"),q=rows?.[0];
      if(!q)return json(res,404,{error:"Aanvraag niet gevonden."});
      const existing=await sbFetch("events?event_date=eq."+encodeURIComponent(q.event_date||"0000-00-00")+"&status=eq.confirmed&select=id,event_name,start_time,end_time");
      const conflict=(existing||[]).find(e=>q.start_time&&q.end_time&&e.start_time&&e.end_time&&q.start_time<String(e.end_time)&&q.end_time>String(e.start_time));
      if(conflict&&!body.force)return json(res,409,{error:"Er is al een overlappend bevestigd event.",conflict});
      const eid=crypto.randomUUID();
      const row={id:eid,quote_id:q.id,title:q.event_name||q.name||"Hummie Bear evenement",name:q.name,customer_name:q.name,organisation:q.organisation,email:q.email,phone:q.phone,event_name:q.event_name,event_date:q.event_date,start_time:q.start_time,end_time:q.end_time,location:q.location,guests:q.guests,hours:q.hours,event_type:q.event_type,edition:q.edition,options:q.options,practical_notes:q.practical_notes,notes:q.message,final_price:q.final_price??q.estimated_price,status:"confirmed",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      await sbFetch("events",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(row)});
      await sbFetch("quotes?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({status:"accepted",updated_at:new Date().toISOString()})});
      if(q.email){
        try{
          const safe=v=>String(v??"").replace(/[<>]/g,"").slice(0,500);
          const html="<div style='font-family:Arial,Helvetica,sans-serif;max-width:650px;margin:auto;padding:30px;background:#f5f7fb;color:#101828'><div style='background:#fff;border-radius:16px;padding:28px;border:1px solid #e4e7ec'><h1 style='margin-top:0'>Reservatie bevestigd</h1><p>Hallo "+safe(q.name||"daar")+"!</p><p>Je aanvraag bij <strong>Hummie Bear</strong> is bevestigd.</p><div style='padding:16px;background:#eef2ff;border-radius:12px'><strong>"+safe(q.event_name||"Evenement")+"</strong><br>"+safe(q.event_date)+" · "+safe(q.location)+"<br>"+safe(q.guests)+" gasten · "+safe(q.edition)+"</div><p>Tot binnenkort!</p><strong>Hummie Bear</strong></div></div>";
          await fetch(SUPABASE_URL+"/functions/v1/hummie-bear-email",{method:"POST",headers:{apikey:SUPABASE_PUBLIC_KEY,Authorization:"Bearer "+(process.env.SUPABASE_SERVICE_ROLE_KEY||""),"Content-Type":"application/json"},body:JSON.stringify({to:q.email,subject:"Je reservatie bij Hummie Bear is bevestigd!",html})});
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
      const id=clean(body.id,200),p={...(body.payload||{}),updated_at:new Date().toISOString()};
      await sbFetch("orders?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify(p)});
      await logAction(session,"update","order",id,p);return json(res,200,{ok:true});
    }
    if(action==="createInventory"||action==="updateInventory"){
      if(!roleCan(session,["owner","manager","warehouse"]))return json(res,403,{error:"Je hebt geen rechten om voorraad te wijzigen."});
      const p={...(body.payload||{}),updated_at:new Date().toISOString()};
      if(action==="createInventory"){p.id=crypto.randomUUID();p.created_at=new Date().toISOString();await sbFetch("inventory",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(p)});await logAction(session,"create","inventory",p.id,p);return json(res,200,{ok:true,id:p.id})}
      const id=clean(body.id,200);await sbFetch("inventory?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify(p)});await logAction(session,"update","inventory",id,p);return json(res,200,{ok:true});
    }
    if(action==="createExpense"||action==="updateExpense"||action==="deleteExpense"){
      if(!roleCan(session,["owner","manager","finance"]))return json(res,403,{error:"Je hebt geen financiële schrijfrechten."});
      if(action==="deleteExpense"){await sbFetch("expenses?id=eq."+encodeURIComponent(clean(body.id,200)),{method:"DELETE"});return json(res,200,{ok:true})}
      const p={...(body.payload||{}),updated_at:new Date().toISOString()};
      if(action==="createExpense"){p.id=crypto.randomUUID();p.created_at=new Date().toISOString();await sbFetch("expenses",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(p)});return json(res,200,{ok:true,id:p.id})}
      const id=clean(body.id,200);await sbFetch("expenses?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify(p)});return json(res,200,{ok:true});
    }
    if(action==="createTask"||action==="updateTask"){
      const p={...(body.payload||{}),updated_at:new Date().toISOString()};
      if(action==="createTask"){p.id=crypto.randomUUID();p.created_at=new Date().toISOString();await sbFetch("tasks",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(p)});return json(res,200,{ok:true,id:p.id})}
      const id=clean(body.id,200);await sbFetch("tasks?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify(p)});return json(res,200,{ok:true});
    }
    if(action==="createStaff"){
      if(session.role!=="owner")return json(res,403,{error:"Alleen de eigenaar kan medewerkers aanmaken."});
      const email=clean(body.email,180).toLowerCase(),password=String(body.password||"");
      if(!email||password.length<8)return json(res,400,{error:"E-mail en wachtwoord van minstens 8 tekens zijn vereist."});
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
  }catch(e){
    console.error("Hummie Bear admin API",e);
    return json(res,e.status||500,{error:e.message||"Serverfout."});
  }
}
