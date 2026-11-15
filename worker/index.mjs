import {createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT} from 'jose';
import config from './config.mjs';

const keys = createRemoteJWKSet(new URL(config.jwks));
let credentials;
let access;
async function verifyMemberToken(token) {
  const {payload} = await jwtVerify(token,keys,{
    algorithms:['RS256'],issuer:config.issuerBase+config.project,
    audience:config.project,requiredClaims:['sub','iat','exp','auth_time']
  });
  if (!payload.sub || payload.sub.length > 128 || payload.email_verified !== true ||
      typeof payload.auth_time !== 'number' || payload.auth_time > Date.now()/1000 ||
      payload.iat > Date.now()/1000) throw new Error('Invalid credentials');
  return payload.sub;
}
async function serviceToken(env) {
  const source = env[config.accountSecret];
  if (!source) throw new Error('Missing server configuration');
  if (credentials !== source) { credentials = source; access = undefined; }
  if (access?.until > Date.now()) return access.token;
  const account = JSON.parse(source);
  if (account.project_id !== config.project) throw new Error('Wrong project configuration');
  const key = await importPKCS8(account.private_key,'RS256');
  const assertion = await new SignJWT({scope:config.datastoreScope})
    .setProtectedHeader({alg:'RS256'}).setIssuer(account.client_email)
    .setAudience(config.oauth).setIssuedAt().setExpirationTime('5m').sign(key);
  const result = await fetch(config.oauth,{
    method:'POST',body:new URLSearchParams({
      grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion
    })
  });
  if (!result.ok) throw new Error('Service authorization unavailable');
  const data = await result.json();
  if (!data.access_token) throw new Error('Service authorization unavailable');
  access = {token:data.access_token,until:Date.now()+Math.min(3300,Math.max(0,data.expires_in-60))*1000};
  return access.token;
}
async function hasMembership(env,tripId,uid) {
  const token = await serviceToken(env);
  const doc = await fetch(config.firestore+'/projects/'+config.project+
    '/databases/(default)/documents/trips/'+tripId,{headers:{Authorization:'Bearer '+token}});
  if (doc.status === 404) return false;
  if (!doc.ok) throw new Error('Membership check unavailable');
  const data = await doc.json();
  return (data.fields?.memberUids?.arrayValue?.values || []).some(member => member.stringValue === uid);
}
export function createHandler({verify = verifyMemberToken, membership = hasMembership} = {}) {
  return async function handle(request,env) {
    const origin = request.headers.get('Origin');
    const headers = {'Cache-Control':'no-store','Vary':'Origin'};
    if (config.origins.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Authorization';
    }
    const reply = (status,message) => Response.json({message},{status,headers});
    if (origin && !config.origins.includes(origin)) return reply(403,'Origin not allowed');
    const url = new URL(request.url);
    if (url.pathname !== '/membership') return reply(404,'Endpoint unavailable');
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (request.method !== 'GET') return reply(405,'Method not allowed');
    const tripId = url.searchParams.get('tripId');
    if (!/^[A-Za-z0-9]{20}$/.test(tripId || '')) return reply(400,'Invalid trip');
    const bearer = /^Bearer ([\w.-]+)$/.exec(request.headers.get('Authorization') || '');
    if (!bearer || bearer[1].length > 8192) return reply(401,'Sign in again');
    let uid;
    try { uid = await verify(bearer[1]); } catch { return reply(401,'Sign in again'); }
    try {
      const {success} = await env.UID_RATE_LIMIT.limit({key:uid});
      if (!success) return reply(429,'Too many requests. Try again shortly.');
      if (!(await membership(env,tripId,uid))) return reply(403,'Trip unavailable');
      return reply(200,'Membership verified');
    } catch { return reply(503,'Membership check temporarily unavailable'); }
  };
}
export default {fetch:createHandler()};
