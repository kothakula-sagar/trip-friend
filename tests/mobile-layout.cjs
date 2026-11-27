const {chromium}=require('playwright');
const fs=require('fs');
const http=require('http');
const path=require('path');
// Render real HTML/CSS with an isolated local fixture; never connects to Firebase.
const server=http.createServer((req,res)=>{
 const file=path.join(process.cwd(),new URL(req.url,'http://local').pathname);
 const type={'.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.html':'text/html'}[path.extname(file)] || 'application/octet-stream';
 try{res.setHeader('Content-Type',type);res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}
});
(async()=>{
await new Promise(resolve=>server.listen(8177,'127.0.0.1',resolve));
const browser=await chromium.launch({args:['--no-sandbox']});
const page=await browser.newPage();
let html=fs.readFileSync('trips.html','utf8').replace(/<script[\s\S]*?<\/script>/g,'').replace(/<link[^>]*fonts.googleapis[^>]*>/g,'');
await page.route('**/trips.html',route=>route.fulfill({contentType:'text/html',body:html}));
await page.goto('http://127.0.0.1:8177/trips.html');
await page.evaluate(()=>document.documentElement.className='native-runtime real-runtime trip-focused');
await page.addScriptTag({url:'http://127.0.0.1:8177/android-shell.js'});
await page.evaluate(()=>{
 document.documentElement.className='native-runtime real-runtime trip-focused';
 for(const id of ['workspace','detail','real-top','real-tabs','real-add'])document.getElementById(id).hidden=false;
 document.getElementById('status').textContent='';
 document.getElementById('real-title').textContent='Manali getaway';
 document.getElementById('trip-name').textContent='Manali getaway';
});
for(const width of [360,393,430]){
 await page.setViewportSize({width,height:850});
 for(const screen of ['home','chat','map','photos','addexpense','invite','plans','polls','packing','settings','crew','wrapup']){
 await page.evaluate(screen=>{
  document.querySelectorAll('[data-real-screen]').forEach(el=>el.hidden=el.dataset.realScreen!==screen);
  document.getElementById('trip-map-panel').open=true;
  document.getElementById('real-messages').innerHTML='<li class="chat-row mine"><span class="chat-avatar">K</span><div class="chat-bubble"><strong>kothakulasagar2002</strong><div>Hello crew</div><small>Sending…</small></div></li>';
  window.scrollTo(0,document.body.scrollHeight);
 },screen);
 await page.waitForTimeout(100);
 const result=await page.evaluate(()=>{
  const nav=document.getElementById('real-tabs').getBoundingClientRect();
  const form=document.getElementById('real-chat-form').getBoundingClientRect();
  return {bottom:nav.bottom,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,bodyParent:document.getElementById('real-tabs').parentElement===document.body,formBottom:form.bottom,navTop:nav.top};
 });
 if(Math.abs(result.bottom-result.height)>1||result.overflow||!result.bodyParent||(screen==='chat'&&result.formBottom>result.navTop))throw Error(JSON.stringify({width,screen,...result}));
 console.log('PASS',width,screen,JSON.stringify(result));
 }
}
await page.evaluate(()=>document.querySelectorAll('[data-real-screen]').forEach(el=>el.hidden=el.dataset.realScreen!=='chat'));
await page.locator('#real-chat-form input').focus();
await page.setViewportSize({width:430,height:500});
await page.waitForTimeout(100);
if(!await page.locator('#real-tabs').isHidden())throw Error('Keyboard overlaps tab bar');
fs.mkdirSync('test-results',{recursive:true});
await page.screenshot({path:'test-results/trip-chat-keyboard.png'});
await page.locator('#real-chat-form input').blur();
await page.setViewportSize({width:393,height:850});
await page.waitForTimeout(100);
await page.screenshot({path:'test-results/trip-chat-layout.png'});
console.log('PASS keyboard hide and restore');
await browser.close();
server.close();
})().catch(error=>{console.error(error);process.exit(1);});
