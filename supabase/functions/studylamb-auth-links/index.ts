import {Webhook} from 'npm:standardwebhooks@1.0.0';
import {makeLinkHook} from './core.mjs';
Deno.serve(makeLinkHook({Webhook,config:{
 enabled:Deno.env.get('STUDYLAMB_LINK_MAIL_READY')==='true',
 project:Deno.env.get('STUDYLAMB_PROJECT_REF'),
 hookSecret:Deno.env.get('STUDYLAMB_LINK_EMAIL_HOOK_SECRET'),
}}));
