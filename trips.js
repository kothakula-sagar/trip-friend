import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,sendEmailVerification,signOut,reload,getIdToken} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import {getFirestore,collection,addDoc,doc,query,where,limit,orderBy,onSnapshot,serverTimestamp,updateDoc,arrayUnion,getDocFromServer} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = id => document.getElementById(id);
function status(message, tone = '') {
  $('status').textContent = message;
  $('status').dataset.tone = tone;
}
const email = () => auth.currentUser.email;
const format = new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'});
const money = paise => format.format(paise/100);
let stopTrips, stopExpenses, selected, tripRows = [];

function showError(error, action) {
  const messages = {
    'auth/operation-not-allowed':'Email/password sign-in must be enabled in Firebase Authentication.',
    'auth/configuration-not-found':'Firebase Authentication is still being configured.',
    'auth/invalid-credential':'Check your email and password.',
    'auth/weak-password':'Choose a password with at least six characters.',
    'auth/email-already-in-use':'This email already has an account. Sign in or reset your password.',
    'permission-denied':'Firestore denied this action. Ask the project owner to publish the Trip Friend rules, then retry.',
    'not-found':'The project database is unavailable.',
    'failed-precondition':'The project database is unavailable or requires additional configuration.'
  };
  const message = messages[error.code] || 'Try again or check your connection.';
  status(action ? action + ': ' + message : message, 'error');
}
function submit(id, action) {
  $(id).addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    const label = button?.textContent;
    if (button) { button.disabled = true; button.textContent = 'Please wait…'; }
    event.target.setAttribute('aria-busy','true');
    try { await action(new FormData(event.target),button?.value); }
    catch (error) { showError(error, label); }
    finally {
      event.target.removeAttribute('aria-busy');
      if (button) { button.disabled = false; button.textContent = label; }
    }
  });
}
function row(text) {
  const li = document.createElement('li');
  li.textContent = text;
  return li;
}
submit('auth-form',async (fields,action) => {
  const address = fields.get('email').trim();
  const password = fields.get('password');
  if (action === 'reset') {
    if (!$('auth-form').elements.email.reportValidity()) return;
    await sendPasswordResetEmail(auth,address);
    status('If this address has an account, look for a password reset email.');
    return;
  }
  if (action === 'register') {
    const {user} = await createUserWithEmailAndPassword(auth,address,password);
    await sendEmailVerification(user);
    status('Verification email sent.');
  } else {
    await signInWithEmailAndPassword(auth,address,password);
  }
  $('auth-form').reset();
});
$('sign-out').onclick = () => signOut(auth).catch(showError);
$('send-email').onclick = async () => {
  try { await sendEmailVerification(auth.currentUser); status('Verification email sent.'); }
  catch (error) { showError(error); }
};
$('check-email').onclick = async () => {
  try {
    const user = auth.currentUser;
    await reload(user);
    if (!user.emailVerified) return status('Verification hasn’t reached Firebase yet. Open the email link first.');
    await getIdToken(user,true);
    if (auth.currentUser === user) showSession(user);
  } catch (error) { showError(error); }
};
function showSession(user) {
  stopTrips?.();
  stopExpenses?.();
  selected = null;
  tripRows = [];
  $('trip-list').replaceChildren();
  $('detail').hidden = true;
  $('trip-empty').hidden = !user?.emailVerified;
  $('list-status').textContent = user?.emailVerified ? 'Loading trips…' : '';
  $('account').hidden = !!user;
  $('verification').hidden = !user || user.emailVerified;
  $('workspace').hidden = !user?.emailVerified;
  $('sign-out').hidden = !user;
  status(user?.emailVerified ? 'Signed in as '+user.email : user ? 'Email verification required.' : 'Sign in or create an account.');
  if (!user?.emailVerified) return;
  stopTrips = onSnapshot(query(collection(db,'trips'),where('memberEmails','array-contains',email()),limit(50)), snapshot => {
    $('list-status').textContent = '';
    tripRows = snapshot.docs;
    $('trip-list').replaceChildren(...tripRows.map(trip => {
      const li = row('');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'outline';
      button.dataset.tripId = trip.id;
      button.textContent = trip.data().name;
      button.onclick = () => displayTrip(trip);
      li.append(button);
      return li;
    }));
    if (!tripRows.length) $('trip-list').append(row('No private trips yet.'));
    const current = tripRows.find(trip => trip.id === selected);
    if (current) displayTrip(current);
    else if (selected) {
      stopExpenses?.();
      selected = null;
      $('detail').hidden = true;
      $('trip-empty').hidden = false;
    }
  }, error => {
    $('list-status').textContent = error.code === 'permission-denied'
      ? 'Trip list is unavailable. Firestore refused access.'
      : 'Could not load trips. Reload the page to retry.';
  });
}
onAuthStateChanged(auth,showSession,showError);
submit('create-trip',async fields => {
  const name = fields.get('name').trim();
  if (!name) return status('Enter a trip name.');
  const trip = await addDoc(collection(db,'trips'),{name,ownerUid:auth.currentUser.uid,memberEmails:[email()],createdAt:serverTimestamp()});
  $('create-trip').reset();
  const current = tripRows.find(item => item.id === trip.id);
  try {
    displayTrip(current || await getDocFromServer(trip));
    status('Trip created.', 'success');
  } catch (error) {
    showError(error, 'Trip saved, but could not be opened');
  }
});
function displayTrip(trip) {
  if (!trip.exists() || !auth.currentUser) return;
  selected = trip.id;
  const data = trip.data();
  const admin = data.ownerUid === auth.currentUser.uid;
  $('trip-empty').hidden = true;
  $('detail').hidden = false;
  for (const button of $('trip-list').querySelectorAll('button')) {
    if (button.dataset.tripId === trip.id) button.setAttribute('aria-current','true');
    else button.removeAttribute('aria-current');
  }
  $('trip-name').textContent = data.name;
  $('invite').hidden = !admin;
  $('record-expense').hidden = !admin;
  $('crew').replaceChildren(...data.memberEmails.map(row));
  const select = $('record-expense').elements.payer;
  const prior = select.value;
  select.replaceChildren(...data.memberEmails.map(member => new Option(member,member)));
  if (data.memberEmails.includes(prior)) select.value = prior;
  stopExpenses?.();
  $('expense-status').textContent = 'Loading expenses…';
  $('shared-expenses').replaceChildren();
  $('shared-balances').replaceChildren();
  stopExpenses = onSnapshot(query(collection(trip.ref,'expenses'),orderBy('createdAt','desc'),limit(100)), snapshot => {
    $('expense-status').textContent = '';
    const balances = new Map();
    $('shared-expenses').replaceChildren(...snapshot.docs.map(expense => {
      const bill = expense.data();
      const share = Math.floor(bill.paise/bill.participants.length);
      bill.participants.forEach((member,index) => {
        const difference = (member === bill.payer ? bill.paise : 0) - share - Number(index < bill.paise % bill.participants.length);
        balances.set(member,(balances.get(member) || 0) + difference);
      });
      return row(bill.label+' · '+money(bill.paise)+' · paid by '+bill.payer);
    }));
    if (snapshot.empty) $('shared-expenses').append(row('No confirmed expenses yet.'));
    $('shared-balances').replaceChildren(...[...balances].map(([member,value]) => row(member+' · '+(value === 0 ? 'Settled' : value > 0 ? 'Gets back '+money(value) : 'Owes '+money(-value)))));
  }, () => { $('expense-status').textContent = 'Could not load shared expenses.'; });
}
submit('invite',async fields => {
  const address = fields.get('email').trim().toLowerCase();
  if (!selected) return;
  await updateDoc(doc(db,'trips',selected),{memberEmails:arrayUnion(address)});
  $('invite').reset();
  status('Trip access granted to '+address+'.');
});
submit('record-expense',async fields => {
  const trip = selected && (tripRows.find(item => item.id === selected) || await getDocFromServer(doc(db,'trips',selected)));
  if (!trip) return;
  const label = fields.get('label').trim();
  const paise = Math.round(Number(fields.get('amount'))*100);
  if (!label || !Number.isSafeInteger(paise) || paise < 1) return status('Enter an expense and a valid amount.');
  await addDoc(collection(trip.ref,'expenses'),{label,paise,payer:fields.get('payer'),participants:trip.data().memberEmails,createdAt:serverTimestamp()});
  $('record-expense').reset();
  status('Confirmed expense posted.');
});
