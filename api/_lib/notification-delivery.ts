import { supabaseFetch } from "./supabase.js";

type DeliveryResult = { ok:boolean; error?:string };

function configured(){
  return {
    email: !!(process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL),
    whatsapp: !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    webhook: !!process.env.TEAMS_WEBHOOK_URL,
    in_app: true,
  };
}

async function sendEmail(row:any):Promise<DeliveryResult>{
  if(!configured().email)return{ok:false,error:"Email provider is not configured"};
  const r=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.RESEND_API_KEY}`},
    body:JSON.stringify({
      from:process.env.NOTIFICATION_FROM_EMAIL,
      to:[row.recipient],
      subject:row.subject||"Safety Board Notification",
      text:row.body,
    }),
  });
  if(r.ok)return{ok:true};
  const p=await r.json().catch(()=>({}));
  return{ok:false,error:String(p?.message||`Email provider returned ${r.status}`).slice(0,500)};
}

async function sendTeams(row:any):Promise<DeliveryResult>{
  if(!configured().webhook)return{ok:false,error:"Teams webhook is not configured"};
  const r=await fetch(String(process.env.TEAMS_WEBHOOK_URL),{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({text:[row.subject,row.body].filter(Boolean).join("\n\n")}),
  });
  return r.ok?{ok:true}:{ok:false,error:`Teams webhook returned ${r.status}`};
}

async function sendWhatsApp(row:any):Promise<DeliveryResult>{
  if(!configured().whatsapp)return{ok:false,error:"WhatsApp Cloud API is not configured"};
  const phoneId=encodeURIComponent(String(process.env.WHATSAPP_PHONE_NUMBER_ID));
  const r=await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`,{
    method:"POST",
    headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`},
    body:JSON.stringify({
      messaging_product:"whatsapp",
      to:String(row.recipient||"").replace(/[^0-9]/g,""),
      type:"text",
      text:{body:String(row.body||"").slice(0,4096)},
    }),
  });
  if(r.ok)return{ok:true};
  const p=await r.json().catch(()=>({}));
  return{ok:false,error:String(p?.error?.message||`WhatsApp provider returned ${r.status}`).slice(0,500)};
}

async function deliver(row:any):Promise<DeliveryResult>{
  if(row.channel==="in_app")return{ok:true};
  if(row.channel==="email")return sendEmail(row);
  if(row.channel==="whatsapp")return sendWhatsApp(row);
  if(row.channel==="webhook")return sendTeams(row);
  return{ok:false,error:"Unsupported delivery channel"};
}

export function notificationProviderStatus(){
  const c=configured();
  return {
    automation:{cronConfigured:!!process.env.CRON_SECRET,requiredEnv:["CRON_SECRET"]},
    providers:{
      inApp:{configured:true},
      email:{configured:c.email,requiredEnv:["RESEND_API_KEY","NOTIFICATION_FROM_EMAIL"]},
      whatsapp:{configured:c.whatsapp,requiredEnv:["WHATSAPP_ACCESS_TOKEN","WHATSAPP_PHONE_NUMBER_ID"]},
      teams:{configured:c.webhook,requiredEnv:["TEAMS_WEBHOOK_URL"]},
    },
  };
}

export async function processNotificationOutbox(limit=20){
  const now=new Date().toISOString();
  const select=await supabaseFetch(`/rest/v1/notification_outbox?select=*&status=eq.pending&or=(next_attempt_at.is.null,next_attempt_at.lte.${encodeURIComponent(now)})&order=created_at.asc&limit=${Math.min(Math.max(limit,1),50)}`);
  const rows=await select.json().catch(()=>[]);
  if(!select.ok)throw new Error(rows?.message||"Unable to load notification outbox");

  const result={processed:0,sent:0,failed:0,deferred:0};
  for(const row of rows){
    const attempts=Number(row.attempts||0)+1;
    await supabaseFetch(`/rest/v1/notification_outbox?id=eq.${encodeURIComponent(row.id)}`,{
      method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({status:"processing",attempts,updated_at:new Date().toISOString()}),
    });

    let delivery:DeliveryResult;
    try{delivery=await deliver(row);}catch(e:any){delivery={ok:false,error:String(e?.message||e)};}

    if(delivery.ok){
      await supabaseFetch(`/rest/v1/notification_outbox?id=eq.${encodeURIComponent(row.id)}`,{
        method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({status:"sent",sent_at:new Date().toISOString(),last_error:null,next_attempt_at:null,updated_at:new Date().toISOString()}),
      });
      result.sent++;
    }else{
      const unconfigured=String(delivery.error||"").includes("not configured");
      const finalFailure=!unconfigured&&attempts>=5;
      const delayMinutes=Math.min(60,Math.max(5,2**Math.min(attempts,5)*5));
      await supabaseFetch(`/rest/v1/notification_outbox?id=eq.${encodeURIComponent(row.id)}`,{
        method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({
          status:finalFailure?"failed":"pending",
          last_error:String(delivery.error||"Delivery failed").slice(0,500),
          next_attempt_at:finalFailure?null:new Date(Date.now()+delayMinutes*60000).toISOString(),
          updated_at:new Date().toISOString(),
        }),
      });
      if(unconfigured)result.deferred++;else result.failed++;
    }
    result.processed++;
  }
  return result;
}
