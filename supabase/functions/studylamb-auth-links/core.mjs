// Supabase Send Email hook -> HUBLMail render_and_send_email using StudyLamb templates stored
// in the HUBL org. Templates mirror src/lib/email/password-reset-email.ts (warm canvas, white
// rounded card, black CTA). The hook only supplies validated {{action_url}} / {{token}} values.
export const PROJECT='skcmodakoqlbthumifef';
export const HUB='04ca9689-9d94-4c69-87c4-5ade501c730c';
export const SENDER='https://adutlixdztoaprgcicrn.supabase.co/functions/v1/hubl-api/v1/_action/render_and_send_email';
const enc=new TextEncoder();
const mailbox=/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
// Production web origins that request auth emails (src/routes/index.tsx uses window.location.origin).
export const WEB_ORIGINS=['https://gummy-flip-learn-cards.orange-smoke-b50e.workers.dev','https://gummy-flip-learn-cards.lovable.app','https://preview--gummy-flip-learn-cards.lovable.app'];
// Exact callbacks per action, taken from apps/mobile/src/config.ts, native/PasswordLink.swift,
// native/OwnerLink.swift and the web signup call.
// Named HUBLMail templates in org HUB.
export const TEMPLATES={signup:'studylamb_auth_signup',recovery:'studylamb_auth_recovery',magiclink:'studylamb_auth_magiclink',email_change:'studylamb_auth_email_change',reauthentication:'studylamb_auth_reauthentication',invite:'studylamb_auth_invite'};
// Actions deliberately refused (hook returns 400, the auth system reports the send as failed):
export const UNSUPPORTED=['email','email_change_current','email_change_new'];

const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const FONT="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export function renderCard({subject,preheader,heading,intro,cta,href,code,note}){
 const h=href?esc(href):'';
 const action=href?`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;"><tr><td style="background:#111111;border-radius:12px;"><a href="${h}" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">${esc(cta)}</a></td></tr></table>
<p style="margin:0 0 8px;font-family:${FONT};font-size:13px;line-height:20px;color:#6b6b6b;">Button not working? Copy and paste this link into your browser:</p>
<p style="margin:0 0 28px;font-family:${FONT};font-size:13px;line-height:20px;word-break:break-all;"><a href="${h}" style="color:#111111;text-decoration:underline;">${h}</a></p>`
 :`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;"><tr><td style="background:#f5f4f1;border:1px solid #e7e5e0;border-radius:12px;padding:16px 26px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:28px;font-weight:700;letter-spacing:6px;color:#111111;">${esc(code)}</td></tr></table>`;
 return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f5f4f1;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f4f1;"><tr><td align="center" style="padding:48px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td align="center" style="padding:0 0 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="width:36px;height:36px;background:#111111;border-radius:10px;text-align:center;vertical-align:middle;font-family:${FONT};font-size:18px;line-height:36px;color:#ffffff;">&#10022;</td>
<td style="padding-left:10px;font-family:${FONT};font-size:20px;font-weight:700;letter-spacing:-0.3px;color:#111111;">StudyLamb</td>
</tr></table></td></tr>
<tr><td style="background:#ffffff;border:1px solid #e7e5e0;border-radius:20px;padding:44px 40px;">
<h1 style="margin:0 0 16px;font-family:${FONT};font-size:24px;line-height:32px;font-weight:700;letter-spacing:-0.4px;color:#111111;">${esc(heading)}</h1>
<p style="margin:0 0 28px;font-family:${FONT};font-size:16px;line-height:26px;color:#3a3a3a;">${esc(intro)}</p>
${action}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#f5f4f1;border-radius:12px;padding:16px 18px;font-family:${FONT};font-size:14px;line-height:22px;color:#3a3a3a;">${esc(note)}</td></tr></table>
</td></tr>
<tr><td align="center" style="padding:28px 16px 0;font-family:${FONT};font-size:13px;line-height:20px;color:#8a8a8a;">StudyLamb is operated by wAIwiser, Inc.</td></tr>
</table></td></tr></table></body></html>`;
}

const IGNORE="If you didn't ask for this, you can ignore this email.";
export const COPY={
 signup:{subject:'Confirm your StudyLamb email',preheader:'One tap to finish setting up StudyLamb.',heading:'Welcome to StudyLamb',intro:'Confirm your email address to finish creating your StudyLamb account.',cta:'Confirm my email',note:`This link works once and expires soon. ${IGNORE}`},
 recovery:{subject:'Reset your StudyLamb password',preheader:'Choose a new password for your StudyLamb account.',heading:'Let\u2019s get you back in',intro:'Someone asked to reset the password for your StudyLamb account. Tap the button below to choose a new one.',cta:'Choose a new password',note:`This resets your account password only. It does not recover a lost vault key \u2014 that stays separate. ${IGNORE}`},
 magiclink:{subject:'Your StudyLamb sign-in link',preheader:'Tap to sign in to StudyLamb.',heading:'Sign in to StudyLamb',intro:'Tap the button below to sign in. Open it on the device where you asked for it.',cta:'Sign in',note:`This link works once and expires soon. ${IGNORE}`},
 email_change:{subject:'Confirm your StudyLamb email change',preheader:'Confirm the change to your StudyLamb email address.',heading:'Confirm your email change',intro:'Someone asked to change the email address on your StudyLamb account. Tap the button below to confirm.',cta:'Confirm email change',note:'This link works once and expires soon. If you didn\u2019t ask for this, ignore this email and your address stays the same.'},
 reauthentication:{subject:'Your StudyLamb confirmation code',preheader:'Use this code to confirm it\u2019s you.',heading:'Confirm it\u2019s you',intro:'Enter this code in StudyLamb to continue.',note:`This code works once and expires soon. Never share it with anyone. ${IGNORE}`},
 invite:{subject:'You\u2019re invited to StudyLamb',preheader:'Someone invited you to join StudyLamb.',heading:'You\u2019re invited to StudyLamb',intro:'Someone invited you to join StudyLamb. Tap the button below to accept and set up your account.',cta:'Accept the invitation',note:`This link works once and expires soon. ${IGNORE}`},
};

// Template source stored in HUBLMail (placeholders, no real values).
export function templateSource(type){
 const c=COPY[type];
 const html=type==='reauthentication'?renderCard({...c,code:'{{token}}'}):renderCard({...c,href:'{{action_url}}'});
 return {name:TEMPLATES[type],subject:c.subject,html,description:`StudyLamb auth email (${type}). Variables: ${type==='reauthentication'?'token':'action_url'}.`,default_variables:{}};
}
// Local preview only: substitutes the same variables HUBLMail will.
export function previewHtml(type,variables){
 return templateSource(type).html.replace(/\{\{(action_url|token)\}\}/g,(_,k)=>esc(variables[k]));
}

const HASH=/^[a-f0-9]{40,128}$/i;
const verifyUrl=(hash,type,redirect)=>{const u=new URL(`https://${PROJECT}.supabase.co/auth/v1/verify`);u.searchParams.set('token',hash);u.searchParams.set('type',type);u.searchParams.set('redirect_to',redirect);return u.href;};

// Returns one or more render_and_send_email requests.
export function linkMessages(payload){
 const u=payload?.user,e=payload?.email_data,type=e?.email_action_type;
 if(!mailbox.test(u?.email||''))throw Error('invalid_payload');
 if(UNSUPPORTED.includes(type))throw Error('unsupported_action');
 if(!COPY[type])throw Error('invalid_payload');
 const send=(to,variables)=>({template_name:TEMPLATES[type],to,variables});
 if(type==='reauthentication'){
  const code=String(e?.token??'');
  if(!/^[0-9]{6,10}$/.test(code))throw Error('invalid_payload');
  return [send(u.email,{token:code})];
 }
 {let o;try{o=new URL(e?.redirect_to).origin}catch{throw Error('invalid_payload')}if(!WEB_ORIGINS.includes(o))throw Error('invalid_payload');}
 if(type==='email_change'){
  // Secure email change (per the auth hook docs): token_hash_new pairs with the CURRENT
  // address (user.email) and token_hash with the NEW address (user.new_email). Without
  // secure change only one hash is present.
  if(!mailbox.test(u?.new_email||''))throw Error('invalid_payload');
  const currentHash=e.token_hash_new,newHash=e.token_hash;
  if(currentHash&&!HASH.test(currentHash)||newHash&&!HASH.test(newHash))throw Error('invalid_payload');
  if(currentHash&&newHash)return [send(u.email,{action_url:verifyUrl(currentHash,type,e.redirect_to)}),send(u.new_email,{action_url:verifyUrl(newHash,type,e.redirect_to)})];
  const hash=newHash||currentHash;if(!hash)throw Error('invalid_payload');
  return [send(u.new_email,{action_url:verifyUrl(hash,type,e.redirect_to)})];
 }
 if(!HASH.test(e?.token_hash||''))throw Error('invalid_payload');
 return [send(u.email,{action_url:verifyUrl(e.token_hash,type,e.redirect_to)})];
}

function response(status,code){return new Response(JSON.stringify(status===200?{}:{error:{http_code:status,message:code}}),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}
export function makeLinkHook({Webhook,config,fetchImpl=fetch}){
 return async req=>{
  if(req.method!=='POST')return response(405,'method_not_allowed');
  if(config.enabled!==true||config.project!==PROJECT||!config.hookSecret)return response(503,'not_configured');
  let raw;try{raw=await req.text();}catch{return response(400,'invalid_request');}
  if(enc.encode(raw).length>65536)return response(413,'too_large');
  let payload;try{payload=new Webhook(config.hookSecret.replace(/^v1,/, '')).verify(raw,Object.fromEntries(req.headers));}catch{return response(401,'invalid_signature');}
  let messages;try{messages=linkMessages(payload);}catch(err){return response(400,err?.message==='unsupported_action'?'unsupported_action':'invalid_payload');}
  try{
   for(const message of messages){
    const r=await fetchImpl(SENDER,{method:'POST',headers:{'Content-Type':'application/json','x-org-id':HUB,'x-hubl-host':'waiwiser.com'},body:JSON.stringify(message),redirect:'error',signal:AbortSignal.timeout(3500)});
    if(!r.ok)return response(503,'mail_not_accepted');
    const result=await r.json().catch(()=>null);
    if(result?.success!==true)return response(503,'mail_not_accepted');
   }
   return response(200);
  }catch{return response(503,'mail_status_unknown');}
 };
}
