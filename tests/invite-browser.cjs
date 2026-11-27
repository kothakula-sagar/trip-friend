const {chromium} = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');
const assert = require('node:assert/strict');
// Isolated browser integration: fake Auth/Firestore only, no email or private data access.
const server = http.createServer((req,res) => {
  const file = path.join(process.cwd(),new URL(req.url,'http://local').pathname);
  const mime = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
  try { res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream');res.end(fs.readFileSync(file)); }
  catch { res.statusCode=404;res.end(); }
});
(async () => {
  await new Promise(resolve => server.listen(8178,'127.0.0.1',resolve));
  const browser = await chromium.launch({args:['--no-sandbox']});
  const page = await browser.newPage({viewport:{width:393,height:850}});
  await page.addInitScript(() => {
    window.__auth={currentUser:JSON.parse(localStorage.getItem('__testUser') || 'null')};
    window.__claims=0;
  });
  const implementations = {
    getAuth:'()=>window.__auth',
    setPersistence:'async()=>{}',
    onAuthStateChanged:'(auth,callback)=>{window.__authCallback=callback;queueMicrotask(()=>callback(auth.currentUser));return()=>{}}',
    isSignInWithEmailLink:'(auth,url)=>new URL(url).searchParams.has("oobCode")',
    signInWithEmailLink:'async(auth,address)=>{if(address!=="invited@example.test")throw {code:"auth/invalid-email"};auth.currentUser={uid:"newmember",email:address,emailVerified:true};localStorage.setItem("__testUser",JSON.stringify(auth.currentUser));window.__authCallback(auth.currentUser);return {user:auth.currentUser}}',
    sendSignInLinkToEmail:'async()=>{}',
    updatePassword:'async()=>{}',
    getIdToken:'async()=>"mock-token"',
    getDocFromServer:'async()=>({exists:()=>true,data:()=>({acceptedUid:""})})',
    writeBatch:'()=>({update(){},commit:async()=>{window.__claims++}})',
    onSnapshot:'()=>()=>{}'
  };
  const source = fs.readFileSync('trips.js','utf8');
  await page.route('https://www.gstatic.com/firebasejs/**',route => {
    const filename = new URL(route.request().url()).pathname.split('/').pop();
    const imports = [...source.matchAll(/import \{([^}]+)\} from '([^']+)'/g)].find(match=>match[2].endsWith(filename));
    const body = imports[1].split(',').map(name=>'export const '+name+' = '+(implementations[name] || '()=>({})')+';').join('\n');
    return route.fulfill({contentType:'text/javascript',body,headers:{'Access-Control-Allow-Origin':'*'}});
  });
  await page.route('**/real-trip.js',route=>route.fulfill({contentType:'text/javascript',body:'export const createRealTrip=()=>({select(){},go(){},stopLocation(){}});'}));
  await page.route('**/trip-map.js',route=>route.fulfill({contentType:'text/javascript',body:'export const createTripMap=()=>()=>{};'}));
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.goto('http://127.0.0.1:8178/trips.html?trip=abcdefghijklmnopqrst&mode=signIn&oobCode=TEST_ONLY');
  const input=page.locator('#accept-invite input');
  await input.fill('different@example.test');
  await page.locator('#accept-invite button').click();
  await page.getByRole('status').filter({hasText:'exact email address'}).waitFor();
  assert.equal(await page.locator('#set-password').isHidden(),true);
  assert.equal(await page.evaluate(()=>window.__claims),0);
  console.log('PASS wrong mailbox is actionable and does not join');
  await input.fill('invited@example.test');
  await page.locator('#accept-invite button').click();
  await page.locator('#set-password').waitFor({state:'visible'});
  assert.equal(new URL(page.url()).searchParams.has('oobCode'),false);
  await page.reload();
  await page.locator('#set-password').waitFor({state:'visible'});
  assert.equal(await page.locator('#accept-invite').isHidden(),true);
  console.log('PASS consumed email link resumes password creation after reload');
  await page.locator('#set-password input').fill('ExamplePassword123');
  await page.locator('#set-password button').click();
  await page.locator('#status').filter({hasText:'Password created. Your trip is ready.'}).waitFor();
  assert.equal(await page.evaluate(()=>window.__claims),1);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('tf-invite-checkpoint')),null);
  console.log('PASS membership success waits for acknowledged claim and clears recovery state');
  await browser.close();server.close();
})().catch(error=>{console.error(error);process.exit(1);});
