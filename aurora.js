const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const friends = ['You','Meera','Aarav','Kavya'];
const seed = [{label:'Dinner at Johnson’s Café',amount:248000,payer:'Meera'},{label:'Taxi to Old Manali',amount:96000,payer:'You'}];
const ballots = [['Johnson’s Café',2],['Old Manali momos',1],['Riverside thali',0]];
const initial = {expenses:seed, vote:null, plans:['6:30 PM · Meet at Old Manali bridge'],theme:0,surface:0};
let state = structuredClone(initial);
try {
  const saved = JSON.parse(localStorage.getItem('trip-friend-manali') || 'null');
  if (saved) state = {...state,...saved};
} catch {}
function save() {
  try { localStorage.setItem('trip-friend-manali',JSON.stringify(state)); } catch {}
}
function node(tag,value,style) {
  const result = document.createElement(tag);
  result.textContent = value;
  if (style) result.className = style;
  return result;
}
const currency = new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:0,maximumFractionDigits:2});
const rupees = paise => currency.format(paise/100);
let totalFrame;
function renderExpenses(added = false) {
  const net = Object.fromEntries(friends.map(friend => [friend,0]));
  let total = 0;
  $('expense-list').replaceChildren(...state.expenses.map((expense,index) => {
    total += expense.amount;
    net[expense.payer] += expense.amount;
    const share = Math.floor(expense.amount/friends.length);
    friends.forEach((friend,i) => { net[friend] -= share + Number(i < expense.amount%friends.length); });
    const row = node('li','',added && index === 0 ? 'added' : '');
    row.append(node('span',expense.label+' · '+expense.payer),node('strong',rupees(expense.amount)));
    return row;
  }));
  $('balances').replaceChildren(...friends.map(friend => {
    const amount = net[friend];
    const row = node('li','',added ? 'added' : '');
    row.append(node('span',friend),node('strong',amount === 0 ? 'Settled' : (amount > 0 ? 'Gets back ' : 'Owes ')+rupees(Math.abs(amount)),amount > 0 ? 'positive' : amount < 0 ? 'negative' : ''));
    return row;
  }));
  cancelAnimationFrame(totalFrame);
  const totalChip = $('total');
  const start = Number(totalChip.dataset.amount || 0);
  const display = value => { totalChip.textContent = rupees(value)+' total'; totalChip.dataset.amount = value; };
  if (!added || reduced.matches) return display(total);
  const time = performance.now();
  function tick(now) {
    const progress = Math.min((now-time)/520,1);
    display(Math.round(start + (total-start)*(1-Math.pow(1-progress,3))));
    if (progress < 1) totalFrame = requestAnimationFrame(tick);
  }
  totalFrame = requestAnimationFrame(tick);
}
$('expense-form').addEventListener('submit',event => {
  event.preventDefault();
  const fields = new FormData(event.target);
  const label = fields.get('label').trim();
  const amount = Math.round(Number(fields.get('amount'))*100);
  if (!label || amount < 1 || amount > 10000000) return;
  state.expenses.unshift({label,amount,payer:fields.get('payer')});
  save();
  renderExpenses(true);
  event.target.reset();
});
renderExpenses();
const poll = ballots.map(([label],index) => {
  const button = node('button','');
  button.type = 'button';
  const bar = node('span','','bar');
  const votes = node('strong','');
  bar.setAttribute('aria-hidden','true');
  button.append(bar,node('span',label),votes);
  button.addEventListener('click',() => { state.vote = index; save(); renderPoll(true); });
  $('poll').append(button);
  return {button,bar,votes};
});
function renderPoll(animate = false) {
  const counts = ballots.map(([,base],index) => base + Number(state.vote === index));
  const total = counts.reduce((sum,count) => sum+count,0);
  poll.forEach(({button,bar,votes},index) => {
    button.setAttribute('aria-pressed',String(state.vote === index));
    bar.style.width = (100*counts[index]/total)+'%';
    votes.textContent = counts[index] + (counts[index] === 1 ? ' vote' : ' votes');
    button.classList.remove('winner');
    if (animate && counts[index] === Math.max(...counts) && counts.filter(count => count === counts[index]).length === 1) {
      requestAnimationFrame(() => button.classList.add('winner'));
    }
  });
}
renderPoll();
function renderPlans() {
  $('plan-list').replaceChildren(...state.plans.map(plan => node('li',plan)));
}
function addPlan(plan) {
  if (!plan || state.plans.includes(plan)) return;
  state.plans.push(plan);
  save();
  renderPlans();
  $('notice').textContent = 'Added to the plan: '+plan;
}
renderPlans();
$('add-plan').onclick = () => $('plan-dialog').showModal();
$('cancel-plan').onclick = () => $('plan-dialog').close();
$('plan-form').onsubmit = event => {
  event.preventDefault();
  addPlan(new FormData(event.target).get('plan').trim());
  event.target.reset();
  $('plan-dialog').close();
};
const suggestion = 'Sunset at the river is 12 minutes away. Want me to add it to the plan?';
const sunset = 'Sunset walk by the Beas River';
let typing;
$('guide-toggle').onclick = () => {
  const tip = $('tip');
  tip.hidden = !tip.hidden;
  $('guide-toggle').setAttribute('aria-expanded',String(!tip.hidden));
  clearInterval(typing);
  if (tip.hidden) return;
  if (reduced.matches) { $('suggestion').textContent = suggestion; return; }
  let char = 0;
  $('suggestion').textContent = '';
  typing = setInterval(() => {
    $('suggestion').textContent = suggestion.slice(0,++char);
    if (char >= suggestion.length) clearInterval(typing);
  },18);
};
$('guide-add').onclick = () => {
  addPlan(sunset);
  $('guide-toggle').click();
  location.hash = '#plans';
  $('add-plan').focus({preventScroll:true});
};
const call = $('call-dialog');
let callTimer;
document.querySelectorAll('[data-call]').forEach(button => button.onclick = () => {
  call.classList.remove('connected');
  $('call-title').textContent = 'Meera is calling';
  $('call-note').textContent = 'Preview the incoming call screen.';
  $('accept').hidden = false;
  $('hangup').textContent = 'Decline';
  call.showModal();
  if (!reduced.matches) {
    $('phone').classList.add('vibrate');
    setTimeout(() => $('phone').classList.remove('vibrate'),480);
    navigator.vibrate?.([70,45,70]);
  }
});
$('hangup').onclick = () => call.close();
$('accept').onclick = () => {
  call.classList.add('connected');
  $('call-title').textContent = 'You’re connected';
  $('call-note').textContent = 'Opening the shared demo route…';
  $('accept').hidden = true;
  $('hangup').textContent = 'End preview';
  callTimer = setTimeout(() => {
    call.close();
    $('route-map').classList.add('zoom');
    $('route-map').scrollIntoView({block:'center',behavior:reduced.matches?'instant':'smooth'});
    $('route-map').querySelector('.friend').focus({preventScroll:true});
    setTimeout(() => $('route-map').classList.remove('zoom'),850);
  },reduced.matches?0:950);
};
call.onclose = () => clearTimeout(callTimer);
const points = [[76,25],[77,30],[78,36],[79,44],[78,49],[72,49],[66,47],[61,46],[56,51],[53,55],[49,53],[43,51],[39,51],[33,55],[28,59],[24,60],[23,66],[21,73]];
let point = 0;
let direction = 1;
const pin = document.querySelector('.pin.friend');
setInterval(() => {
  if (reduced.matches || document.hidden) return;
  const [left,top] = points[point];
  const dot = node('span','','trail');
  dot.style.left = left+'%';
  dot.style.top = top+'%';
  $('route-map').append(dot);
  dot.addEventListener('animationend',() => dot.remove(),{once:true});
  setTimeout(() => dot.remove(),1700);
  if (point + direction === points.length || point + direction < 0) direction *= -1;
  point += direction;
  pin.style.left = points[point][0]+'%';
  pin.style.top = points[point][1]+'%';
  $('distance').textContent = (4.2-Math.min(point,3)/10).toFixed(1)+' km';
},1800);
const photos = [
  ['beas','Pines and the Beas River below Manali','Along the Beas'],
  ['solang','A rocky Himalayan riverbank in Solang Valley','Solang Valley']
];
let index = 0;
const lightbox = $('lightbox');
function photoView(next,direction = 1) {
  index = (next+photos.length)%photos.length;
  const [file,alt,title] = photos[index];
  const image = node('img','');
  image.id = 'light-image';
  image.src = './photos/'+file+'.webp';
  image.alt = alt;
  image.style.setProperty('--direction',direction*20+'px');
  $('light-image').replaceWith(image);
  $('light-caption').textContent = title;
}
photos.forEach(([file,alt,title],i) => {
  const button = node('button','');
  button.type = 'button';
  const image = node('img','');
  image.alt = alt;
  image.loading = 'lazy';
  image.addEventListener('load',() => image.classList.add('loaded'),{once:true});
  image.src = './photos/'+file+'.webp';
  button.append(image,node('span',title));
  button.onclick = () => { photoView(i); lightbox.showModal(); };
  $('album').append(button);
});
function changePhoto(delta) { photoView(index+delta,delta); }
document.querySelector('.close-photo').onclick = () => lightbox.close();
$('prev-photo').onclick = () => changePhoto(-1);
$('next-photo').onclick = () => changePhoto(1);
lightbox.addEventListener('keydown',event => {
  if (event.key === 'ArrowLeft') changePhoto(-1);
  if (event.key === 'ArrowRight') changePhoto(1);
});
let startX;
lightbox.addEventListener('touchstart',event => { startX = event.changedTouches[0].clientX; },{passive:true});
lightbox.addEventListener('touchend',event => {
  const delta = event.changedTouches[0].clientX-startX;
  if (Math.abs(delta) > 45) changePhoto(delta < 0 ? 1 : -1);
},{passive:true});
const themes = [
  ['Ivory Regal','#FBF7EE','#1F3A93','#4864d5','#efd073','#75d3b8','#eab1c7'],
  ['Alpine Mist','#f3f8f8','#245562','#52869d','#e2dbb4','#78c9c4','#b1badf'],
  ['Rose Palace','#fff4f2','#77385c','#b9618c','#efd492','#a8c3af','#f29f99'],
  ['Lavender Dusk','#f6f2ff','#503485','#755bc1','#ebce92','#8bc6d9','#daa2cc'],
  ['Jade Garden','#eff8f1','#195344','#418876','#e9d080','#7bdabc','#d7b6cb']
];
const surfaces = [
  ['Frosted glass','#ffffff61','#ffffffcc','blur(26px) saturate(180%)'],
  ['Porcelain','#fffcf2f5','#fff','none'],
  ['Soft satin','#fffefaac','#ffffffeb','blur(15px) saturate(140%)'],
  ['Clear crystal','#ffffff52','#fff','blur(12px) saturate(125%)'],
  ['Opal','#f7f2ffe8','#fff','blur(28px) saturate(160%)'],
  ['Paper','#f9f5eb','#e5d9cd','none']
];
const selectors = [];
function pick(list,id,key) {
  list.forEach(([name,color],index) => {
    const button = node('button',name,'outline');
    button.type = 'button';
    if (key === 'theme') {
      const swatch = node('span','','swatch');
      swatch.style.background = color;
      button.prepend(swatch);
    }
    button.onclick = () => { state[key] = index; save(); applyStyle(); };
    selectors.push({button,key,index});
    $(id).append(button);
  });
}
function applyStyle() {
  const [,base,blue,b1,b2,b3,b4] = themes[state.theme] || themes[0];
  const [,fill,edge,blur] = surfaces[state.surface] || surfaces[0];
  const variables = {base,blue,blob1:b1,blob2:b2,blob3:b3,blob4:b4,fill,edge,blur};
  Object.entries(variables).forEach(([key,value]) => document.documentElement.style.setProperty('--'+key,value));
  document.querySelector('meta[name="theme-color"]').content = base;
  selectors.forEach(({button,key,index}) => button.setAttribute('aria-pressed',String(state[key] === index)));
}
pick(themes,'palette','theme');
pick(surfaces,'surfaces','surface');
applyStyle();
if (window.IntersectionObserver && !reduced.matches) {
  document.documentElement.classList.add('motion');
  let word = 0;
  document.querySelectorAll('h1 > span').forEach(line => {
    const words = line.textContent.split(' ');
    line.replaceChildren(...words.flatMap((text,index) => {
      const span = node('span',text,'word');
      span.style.setProperty('--word',word++);
      return index ? [document.createTextNode(' '),span] : [span];
    }));
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  },{threshold:.13});
  document.querySelectorAll('.reveal,.steps').forEach(target => observer.observe(target));
  document.querySelectorAll('.feature-grid,.steps,.demo-grid').forEach(group => {
    [...group.children].forEach((item,i) => item.style.setProperty('--delay',i*80+'ms'));
  });
  let hueFrame;
  window.addEventListener('scroll',() => {
    if (reduced.matches || hueFrame) return;
    hueFrame = requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--hue',Math.sin(scrollY/850)*14+'deg');
      hueFrame = null;
    });
  },{passive:true});
}
let installPrompt;
window.addEventListener('beforeinstallprompt',event => { event.preventDefault(); installPrompt = event; });
$('get-app').onclick = async () => {
  if (installPrompt) {
    const prompt = installPrompt;
    installPrompt = undefined;
    await prompt.prompt();
    return;
  }
  $('install').showModal();
};
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
