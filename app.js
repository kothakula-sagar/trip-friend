'use strict';
const names = ['Sagar', 'Satvik', 'Meera', 'Asha', 'Nikhil'];
const key = 'trip-friend-demo-v1';
const $ = id => document.getElementById(id);
const money = paise => new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR'}).format(paise / 100);
const initial = {
  bills:[{id:'sample',title:'Hotel deposit',payer:'Satvik',shares:{Sagar:1000,Satvik:1000,Meera:0,Asha:0,Nikhil:0},amount:2000,mode:'equal'}],
  payments:{}, messages:[{name:'Meera',text:'Meet at the homestay by 5 PM?'}], vote:'', photos:[]
};
let state = structuredClone(initial);
try { const saved = localStorage.getItem(key); if (saved) state = JSON.parse(saved); } catch {}
function say(message) { $('status').textContent = message; }
function save() {
  try { localStorage.setItem(key, JSON.stringify(state)); return true; }
  catch { say('Browser storage is full or unavailable. Changes may only last for this visit.'); return false; }
}
function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text, action) {
  const node = element('button', text, 'secondary small');
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}
function paise(value) {
  return /^\d+(?:\.\d{1,2})?$/.test(value) ? Math.round(Number(value) * 100) : 0;
}
function navigate() {
  const wanted = location.hash.slice(1);
  const id = ['expenses','map','chat','album','packing','trip'].includes(wanted) ? wanted : 'expenses';
  document.querySelectorAll('.panel').forEach(panel => { panel.hidden = panel.id !== id; });
  document.querySelectorAll('.tabs a').forEach(link => {
    if (link.hash === '#' + id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  say('');
}
window.addEventListener('hashchange', navigate);
navigate();
const form = $('bill');
for (const name of names) {
  form.elements.payer.add(new Option(name));
  $('actor').add(new Option(name));
  $('closure-actor').add(new Option(name));
  const label = element('label', ' ' + name);
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.value = name;
  checkbox.name = 'member';
  checkbox.checked = true;
  label.prepend(checkbox);
  $('members').append(label);
}
form.elements.payer.value = 'Satvik';
const selected = () => [...form.querySelectorAll('[name=member]:checked')].map(field => field.value);
function amountInput() {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.max = '1000000';
  input.step = '.01';
  input.placeholder = '0.00';
  return input;
}
function addItem() {
  const row = element('div', '', 'row item');
  const title = document.createElement('input');
  title.placeholder = 'Item name';
  title.setAttribute('aria-label', 'Item name');
  title.maxLength = 60;
  const amount = amountInput();
  amount.setAttribute('aria-label', 'Item amount in rupees');
  const owner = document.createElement('select');
  owner.setAttribute('aria-label', 'Who shares this item?');
  owner.add(new Option('Share among selected friends', 'shared'));
  selected().forEach(name => owner.add(new Option(name)));
  row.append(title, amount, owner, button('Remove item', () => { row.remove(); preview(); }));
  $('allocation').insertBefore(row, $('add-item'));
}
function configure() {
  const mode = form.elements.mode.value;
  const active = selected();
  const area = $('allocation');
  if (area.dataset.mode !== mode) area.replaceChildren();
  area.dataset.mode = mode;
  $('total-label').hidden = mode === 'items';
  form.elements.amount.disabled = mode === 'items';
  if (mode === 'custom') {
    const prior = Object.fromEntries([...area.querySelectorAll('input')].map(field => [field.dataset.member, field.value]));
    area.replaceChildren(...active.map(name => {
      const label = element('label', name + '’s share in rupees', 'field');
      const input = amountInput();
      input.dataset.member = name;
      input.value = prior[name] || '';
      label.append(input);
      return label;
    }));
  }
  if (mode === 'items') {
    if (!$('add-item')) {
      const add = button('Add item', () => { addItem(); preview(); });
      add.id = 'add-item';
      area.append(add);
      addItem();
    }
    area.querySelectorAll('select').forEach(select => {
      const prior = select.value;
      select.replaceChildren(new Option('Share among selected friends', 'shared'));
      active.forEach(name => select.add(new Option(name)));
      if (active.includes(prior)) select.value = prior;
    });
  }
  preview();
}
function calculate() {
  const active = selected();
  const shares = Object.fromEntries(names.map(name => [name, 0]));
  const mode = form.elements.mode.value;
  let amount = paise(form.elements.amount.value);
  const items = [];
  const divide = value => {
    active.forEach((name, index) => {
      shares[name] += Math.floor(value / active.length) + Number(index < value % active.length);
    });
  };
  if (!active.length) return {error:'Select at least one friend.'};
  if (mode === 'equal') divide(amount);
  if (mode === 'custom') {
    $('allocation').querySelectorAll('input').forEach(field => { shares[field.dataset.member] = paise(field.value); });
    const remaining = amount - Object.values(shares).reduce((sum, share) => sum + share, 0);
    if (remaining) return {error:remaining > 0 ? money(remaining) + ' left to assign.' : money(-remaining) + ' assigned above the total.',shares};
  }
  if (mode === 'items') {
    amount = 0;
    for (const row of $('allocation').querySelectorAll('.item')) {
      const [title, field] = row.querySelectorAll('input');
      const value = paise(field.value);
      if (!title.value.trim() || !value) return {error:'Enter a name and an amount for each item.'};
      const owner = row.querySelector('select').value;
      items.push({name:title.value.trim(),value,owner});
      amount += value;
      if (owner === 'shared') divide(value);
      else shares[owner] += value;
    }
  }
  if (!amount) return {error:'Enter a bill amount to see the split.'};
  return {amount,shares,mode,items};
}
function preview() {
  const split = calculate();
  const output = $('split-preview');
  output.replaceChildren(element('strong', split.error || 'Bill total ' + money(split.amount)));
  if (split.shares) names.forEach(name => {
    output.append(element('div', name + ' · ' + money(split.shares[name]) + (selected().includes(name) ? '' : ' · Excluded')));
  });
}
form.addEventListener('input', event => {
  if (!['member','mode'].includes(event.target.name)) preview();
});
form.addEventListener('change', event => {
  if (['member','mode'].includes(event.target.name)) configure();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (state.closure?.requested) return say('Expenses are locked during trip completion.');
  const split = calculate();
  if (split.error) { say(split.error); return; }
  const title = form.elements.title.value.trim();
  if (!title) { say('Enter a name for the bill.'); return; }
  state.bills.unshift({id:crypto.randomUUID(),title,payer:form.elements.payer.value,...split});
  if (save()) say('Expense saved in this browser.');
  form.reset();
  form.elements.payer.value = 'Satvik';
  configure();
  renderBills();
});
function renderBills() {
  const actor = $('actor').value;
  $('payments').replaceChildren();
  $('bill-list').replaceChildren();
  const stats = Object.fromEntries(names.map(name => [name,{paid:0,share:0,open:0}]));
  let total = 0;
  for (const bill of state.bills) {
    total += bill.amount;
    stats[bill.payer].paid += bill.amount;
    const details = element('details','');
    details.append(element('summary', bill.title + ' · ' + money(bill.amount) + ' paid by ' + bill.payer));
    for (const item of bill.items || []) details.append(element('div', item.name + ' · ' + money(item.value) + ' · ' + (item.owner === 'shared' ? 'Shared' : item.owner)));
    for (const name of names) {
      const amount = bill.shares[name];
      stats[name].share += amount;
      details.append(element('div', name + ' · ' + money(amount)));
      if (!amount || name === bill.payer) continue;
      const id = bill.id + ':' + name;
      const payment = state.payments[id] || {status:'Due'};
      if (payment.status !== 'Settled') stats[name].open += amount;
      if (![name,bill.payer].includes(actor)) continue;
      const row = element('div','', 'line');
      row.append(element('strong', name + ' → ' + bill.payer + ' · ' + money(amount)),
        element('div', bill.title + ' · ' + payment.status, 'subtle'));
      if (payment.rejected) row.append(element('p', bill.payer + ' couldn’t confirm receipt. Check your payment and resubmit.', 'notice'));
      const actions = element('div','','row');
      const setPayment = (status, rejected = false) => {
        state.payments[id] = {status,rejected};
        if (save()) say(status === 'Due' ? 'Payment rejected. The balance is due again.' : 'Payment status updated to ' + status.toLowerCase() + '.');
        renderBills();
        renderClosure();
        $('actor').focus();
      };
      if (actor === name && payment.status === 'Due') actions.append(button('Mark as paid', () => setPayment('Awaiting confirmation')));
      if (actor === bill.payer && payment.status === 'Due') actions.append(button('Preview payment reminder', () => say('Demo reminder for ' + name + ' to pay ' + money(amount) + '.')));
      if (actor === name && payment.status === 'Awaiting confirmation') actions.append(button('Remind to confirm', () => say('Demo reminder for ' + bill.payer + ' to confirm receipt.')));
      if (actor === bill.payer && payment.status === 'Awaiting confirmation') {
        actions.append(button('Confirm receipt', () => setPayment('Settled')), button('Reject payment', () => setPayment('Due', true)));
      }
      row.append(actions);
      $('payments').append(row);
    }
    $('bill-list').append(details);
  }
  if (!$('payments').children.length) $('payments').append(element('p', 'No repayments for ' + actor + ' yet.', 'subtle'));
  const table = element('table','','table');
  const heading = table.createTHead().insertRow();
  ['Friend','Paid','Share','Still owes'].forEach(label => heading.append(element('th',label)));
  const body = table.createTBody();
  names.forEach(name => {
    const row = body.insertRow();
    [name,money(stats[name].paid),money(stats[name].share),money(stats[name].open)].forEach(value => row.append(element('td',value)));
  });
  $('totals').replaceChildren(element('p','Total expenses · ' + money(total)),table);
}
$('actor').addEventListener('change', renderBills);
configure();
renderBills();
const places = {
  Sagar:'Homestay · updated just now · accuracy ±25 m',
  Satvik:'Coffee stop · updated 2 min ago · accuracy ±30 m',
  Meera:'Viewpoint · last seen 15 min ago · accuracy ±40 m',
  Asha:'Town centre · updated 4 min ago · accuracy ±20 m',
  Nikhil:'Market · updated 1 min ago · accuracy ±15 m'
};
let sharing = true;
document.querySelectorAll('[data-pin]').forEach(pin => pin.addEventListener('click', () => {
  const name = pin.dataset.pin;
  $('pin-info').textContent = name + ' · ' + (name === 'Sagar' && !sharing ? 'Location sharing paused' : places[name]);
}));
$('sharing').addEventListener('click', () => {
  sharing = !sharing;
  $('sharing').textContent = (sharing ? 'Pause' : 'Resume') + ' sample location sharing';
  $('pin-info').textContent = sharing ? 'Sagar · ' + places.Sagar : 'Sagar · Location sharing paused';
});
function renderMessages() {
  $('messages').replaceChildren(...state.messages.map(message => {
    const row = element('div','', 'line');
    row.append(element('strong',message.name),element('div',message.text));
    return row;
  }));
}
$('message').addEventListener('submit', event => {
  event.preventDefault();
  if (state.closure?.closed) return say('This trip is closed and read-only.');
  const text = event.target.elements.text.value.trim();
  if (!text) return;
  state.messages.push({name:'Sagar',text});
  if (save()) say('Message added to this demo chat.');
  event.target.reset();
  renderMessages();
});
renderMessages();
function renderVote() {
  $('vote').textContent = state.vote ? 'Your vote: ' + state.vote : 'Choose your breakfast.';
  document.querySelectorAll('[data-vote]').forEach(option => option.setAttribute('aria-pressed', String(option.dataset.vote === state.vote)));
}
document.querySelectorAll('[data-vote]').forEach(option => option.addEventListener('click', () => {
  if (state.closure?.closed) return say('This trip is closed and read-only.');
  state.vote = option.dataset.vote;
  save();
  renderVote();
}));
renderVote();
for (const [id,message] of Object.entries({voice:'Demo alert · Sagar sent a voice note. Tap the alert to open the chat.',call:'Demo alert · Sagar is calling. In the connected app, friends could tap to join.'})) {
  $(id).addEventListener('click', () => { $('call-info').hidden = false; $('call-info').textContent = message; });
}
let soundUrl;
$('sound').addEventListener('change', event => {
  const file = event.target.files[0];
  if (soundUrl) URL.revokeObjectURL(soundUrl);
  const preview = $('sound-preview');
  preview.removeAttribute('src');
  preview.hidden = !file;
  if (file) { soundUrl = URL.createObjectURL(file); preview.src = soundUrl; }
});
function renderPhotos() {
  $('photos').replaceChildren(...state.photos.map(photo => {
    const figure = element('figure','');
    const image = document.createElement('img');
    image.src = photo.url;
    image.alt = photo.caption || 'Trip photo';
    figure.append(image,element('figcaption',photo.caption || 'Trip photo'));
    return figure;
  }));
}
$('photo').addEventListener('submit', event => {
  event.preventDefault();
  if (state.closure?.closed) return say('This trip is closed and read-only.');
  const file = event.target.elements.photo.files[0];
  if (!file || !['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || file.size > 2000000) {
    say('Choose a JPEG, PNG, WebP or GIF photo under 2 MB.');
    return;
  }
  const caption = event.target.elements.caption.value.trim();
  const reader = new FileReader();
  reader.onload = () => {
    if (state.closure?.closed) return say('This trip is closed and read-only.');
    state.photos.unshift({url:reader.result,caption});
    if (save()) say('Photo saved to this browser.');
    event.target.reset();
    renderPhotos();
  };
  reader.onerror = () => say('Could not open this photo. Try a different file.');
  reader.readAsDataURL(file);
});
renderPhotos();

const suggestedPacking = ['Phone charger', 'Power bank and cable', 'Offline route and booking details', 'Water bottle', 'First-aid kit', 'Rain jacket'];
state.packing ??= suggestedPacking.map(name => ({name, checked:false}));
state.closure ??= {requested:false, confirmed:[], closed:false};
function renderPacking() {
  $('packing-list').replaceChildren(...state.packing.map(item => {
    const label = element('label', ' ' + item.name);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.checked;
    checkbox.disabled = state.closure.closed;
    checkbox.addEventListener('change', () => { item.checked = checkbox.checked; save(); });
    label.prepend(checkbox);
    return label;
  }));
}
$('packing-form').addEventListener('submit', event => {
  event.preventDefault();
  if (state.closure.closed) return say('This trip is closed and read-only.');
  const name = event.target.elements.item.value.trim();
  if (!name) return;
  state.packing.push({name, checked:false});
  save();
  event.target.reset();
  renderPacking();
});
function pendingRepayments() {
  return state.bills.reduce((total, bill) => total + names.filter(name =>
    name !== bill.payer && bill.shares[name] > 0 &&
    state.payments[bill.id + ':' + name]?.status !== 'Settled'
  ).length, 0);
}
function renderClosure() {
  const closure = state.closure;
  const view = $('closure');
  const actor = $('closure-actor').value;
  const pending = pendingRepayments();
  view.replaceChildren();
  for (const control of form.elements) control.disabled = closure.requested || (control.name === 'amount' && form.elements.mode.value === 'items');
  for (const id of ['message','photo','packing-form']) {
    for (const control of $(id).elements) control.disabled = closure.closed;
  }
  document.querySelectorAll('[data-vote]').forEach(control => { control.disabled = closure.closed; });
  $('sharing').disabled = closure.closed;
  if (closure.closed) {
    view.append(element('p', 'Trip closed · Read-only', 'notice'));
    return;
  }
  if (!closure.requested) {
    view.append(element('p', pending ? pending + ' repayment(s) still need confirmation.' : 'All repayments are settled.', 'notice'));
    if (actor === 'Satvik' && !pending) {
      view.append(button('Request trip completion', () => {
        if (pendingRepayments()) return;
        closure.requested = true;
        save();
        say('Demo notification sent to all five friends.');
        renderClosure();
      }));
    }
    return;
  }
  view.append(element('p', 'Upload any remaining photos, then confirm you’re done.', 'notice'));
  names.forEach(name => view.append(element('div', name + ' · ' + (closure.confirmed.includes(name) ? 'Done' : 'Waiting'), 'line')));
  if (!closure.confirmed.includes(actor)) {
    view.append(button('I’m done', () => {
      closure.confirmed.push(actor);
      closure.closed = names.every(name => closure.confirmed.includes(name));
      if (closure.closed) sharing = false;
      save();
      renderClosure();
      renderPacking();
    }));
  }
}
form.addEventListener('submit', renderClosure);
$('closure-actor').addEventListener('change', renderClosure);
renderPacking();
renderClosure();
