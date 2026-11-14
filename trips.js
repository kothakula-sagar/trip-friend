import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,sendEmailVerification,signOut,reload,getIdToken,sendSignInLinkToEmail,isSignInWithEmailLink,signInWithEmailLink,updatePassword,verifyBeforeUpdateEmail,reauthenticateWithCredential,EmailAuthProvider} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import {getFirestore,collection,addDoc,doc,query,where,limit,orderBy,onSnapshot,serverTimestamp,updateDoc,arrayUnion,getDocFromServer,getDoc,setDoc,writeBatch,or,getDocs,deleteDoc} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';
import {createTripMap} from './trip-map.js';
import {firebaseConfig} from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const meetingPoint = id => doc(db,'trips',id,'map','meeting');
const showTripMap = createTripMap({
  listen: (id,change,error) => onSnapshot(meetingPoint(id),snapshot => change(snapshot.data()),error),
  save: (id,point) => setDoc(meetingPoint(id),{...point,updatedAt:serverTimestamp()}),
  remove: id => deleteDoc(meetingPoint(id))
});
const $ = id => document.getElementById(id);
function status(message, tone = '') {
  $('status').textContent = message;
  $('status').dataset.tone = tone;
}
const email = () => auth.currentUser.email;
const format = new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'});
const money = paise => format.format(paise/100);
let stopTrips, stopExpenses, selected, tripRows = [];
const inviteUrl = new URL(location.href);
function tripFromLink(url, depth = 0) {
  if (depth > 3) return null;
  const trip = url.searchParams.get('trip');
  if (trip) return trip;
  for (const key of ['continueUrl','link']) {
    const value = url.searchParams.get(key);
    if (!value) continue;
    try {
      const nested = tripFromLink(new URL(value),depth+1);
      if (nested) return nested;
    } catch {}
  }
  return null;
}
const inviteTrip = tripFromLink(inviteUrl);
const validInviteTrip = inviteTrip && /^[A-Za-z0-9]{20}$/.test(inviteTrip);
const emailLink = validInviteTrip && isSignInWithEmailLink(auth,location.href);
let linkInProgress = Boolean(emailLink);
let nameLookup = new Map();

function showError(error, action) {
  const messages = {
    'auth/operation-not-allowed':'Email/password sign-in must be enabled in Firebase Authentication.',
    'auth/configuration-not-found':'Firebase Authentication is still being configured.',
    'auth/invalid-credential':'Check your email and password.',
    'auth/invalid-action-code':'This invitation link is expired or has already been used.',
    'auth/too-many-requests':'Firebase has reached its email sending limit. Try again later.',
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
  showTripMap(null);
  tripRows = [];
  $('trip-list').replaceChildren();
  $('detail').hidden = true;
  $('trip-empty').hidden = !user?.emailVerified;
  $('list-status').textContent = user?.emailVerified ? 'Loading trips…' : '';
  $('account').hidden = !!user || linkInProgress;
  $('settings').hidden = !user?.emailVerified || linkInProgress;
  $('verification').hidden = !user || user.emailVerified;
  $('workspace').hidden = !user?.emailVerified;
  $('sign-out').hidden = !user;
  status(user?.emailVerified ? 'Signed in as '+user.email : user ? 'Email verification required.' : 'Sign in or create an account.');
  if (!user?.emailVerified || linkInProgress) { $('workspace').hidden = true; return; }
  stopTrips = onSnapshot(query(collection(db,'trips'),or(where('memberEmails','array-contains',email()),where('memberUids','array-contains',user.uid)),limit(50)), snapshot => {
    $('list-status').textContent = '';
    tripRows = snapshot.docs;
    $('trip-list').replaceChildren(...tripRows.map(trip => {
      const li = row('');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'outline trip-tile';
      button.dataset.tripId = trip.id;
      const data = trip.data();
      const cover = document.createElement('img');
      cover.src = './photos/beas.webp';
      cover.alt = '';
      cover.loading = 'lazy';
      const title = document.createElement('strong');
      title.textContent = data.name;
      const crew = document.createElement('span');
      crew.className = 'crew-stack';
      crew.setAttribute('aria-label','Trip crew');
      const members = [...data.memberEmails,...(data.memberUids || [])];
      members.slice(0,4).forEach(member => {
        const avatar = document.createElement('span');
        avatar.textContent = member === auth.currentUser.uid || member === email() ? 'Y' : member.includes('@') ? member[0].toUpperCase() : '•';
        crew.append(avatar);
      });
      const chip = document.createElement('span');
      chip.className = 'chip trip-chip';
      chip.textContent = members.length+' '+(members.length === 1 ? 'member' : 'members');
      button.append(cover,title,crew,chip);
      const created = data.createdAt?.toDate();
      if (created) {
        const date = document.createElement('time');
        date.dateTime = created.toISOString();
        date.textContent = 'Created '+new Intl.DateTimeFormat('en-IN',{dateStyle:'medium'}).format(created);
        button.append(date);
      }
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
      showTripMap(null);
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
  const trip = await addDoc(collection(db,'trips'),{name,ownerUid:auth.currentUser.uid,memberEmails:[],memberUids:[auth.currentUser.uid],createdAt:serverTimestamp()});
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
  showTripMap(trip.id,admin);
  $('trip-empty').hidden = true;
  $('detail').hidden = false;
  for (const button of $('trip-list').querySelectorAll('button')) {
    if (button.dataset.tripId === trip.id) button.setAttribute('aria-current','true');
    else button.removeAttribute('aria-current');
  }
  $('trip-name').textContent = data.name;
  $('member-panel').hidden = !admin;
  $('invites').replaceChildren();
  nameLookup = new Map([[auth.currentUser.uid, 'You']]);
  if (admin) getDocs(query(collection(trip.ref,'invites'),limit(50))).then(snapshot => {
    if (selected !== trip.id || auth.currentUser?.uid !== data.ownerUid) return;
    $('invites').replaceChildren(...snapshot.docs.map(item => {
      const value = item.data();
      if (value.acceptedUid) nameLookup.set(value.acceptedUid,value.name);
      return row(value.name+' · '+item.id+' · '+(value.acceptedUid ? 'Joined' : 'Pending'));
    }));
    renderCrew();
  }).catch(() => {});
  function renderCrew() {
    const name = id => nameLookup.get(id) || (id.includes('@') ? id : 'Trip member');
    $('crew').replaceChildren(...participants.map(id => row(name(id))));
    const select = $('record-expense').elements.payer;
    const prior = select.value;
    select.replaceChildren(...participants.map(id => new Option(name(id),id)));
    if (participants.includes(prior)) select.value = prior;
  }
  $('record-expense').hidden = !admin;
  const participants = [...data.memberEmails,...(data.memberUids || [])];
  renderCrew();
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
      return row(bill.label+' · '+money(bill.paise)+' · paid by '+(nameLookup.get(bill.payer) || (bill.payer.includes('@') ? bill.payer : 'Trip member')));
    }));
    const active = [...$('trip-list').querySelectorAll('button')].find(button => button.dataset.tripId === trip.id);
    if (active) {
      const value = (balances.get(auth.currentUser.uid) || 0) + (balances.get(email()) || 0);
      active.querySelector('.trip-chip').textContent = snapshot.empty ? 'No expenses' :
        value === 0 ? 'Settled' : (value > 0 ? 'Gets back ' : 'Owes ')+money(Math.abs(value));
    }
    if (snapshot.empty) $('shared-expenses').append(row('No confirmed expenses yet.'));
    $('shared-balances').replaceChildren(...[...balances].map(([member,value]) => row((nameLookup.get(member) || (member.includes('@') ? member : 'Trip member'))+' · '+(value === 0 ? 'Settled' : value > 0 ? 'Gets back '+money(value) : 'Owes '+money(-value)))));
  }, () => { $('expense-status').textContent = 'Could not load shared expenses.'; });
}
submit('invite',async fields => {
  const tripId = selected;
  if (!tripId) return;
  const address = fields.get('email').trim().toLowerCase();
  const name = fields.get('name').trim();
  const mobile = fields.get('mobile').trim();
  const trip = tripRows.find(item => item.id === tripId);
  if (trip && (trip.data().memberEmails.some(value => value.toLowerCase() === address) || address === email().toLowerCase())) {
    return status('This email already has access to the trip.', 'error');
  }
  if (!name || !/^\+?[0-9 ()-]{7,22}$/.test(mobile) || mobile.replace(/\D/g,'').length < 7) {
    return status('Enter a name and valid mobile number.', 'error');
  }
  const ref = doc(db,'trips',tripId,'invites',address);
  const existing = await getDoc(ref);
  if (existing.exists() && existing.data().acceptedUid) return status('This invitation has already been accepted.');
  if (!existing.exists()) await setDoc(ref,{name,mobile,acceptedUid:''});
  const url = new URL('./trips.html',location.href);
  url.searchParams.set('trip',tripId);
  try {
    await sendSignInLinkToEmail(auth,address,{url:url.href,handleCodeInApp:true});
  } catch (error) {
    $('invite-status').textContent = 'Invitation saved. Email delivery failed. Submit again to retry.';
    throw error;
  }
  $('invite').reset();
  if (trip && selected === tripId) displayTrip(trip);
  $('invite-status').textContent = 'Invitation email requested for '+address+'.';
});
$('join').hidden = !emailLink;
submit('accept-invite',async fields => {
  const address = fields.get('email').trim();
  await signInWithEmailLink(auth,address,location.href);
  $('accept-invite').hidden = true;
  $('set-password').hidden = false;
  status('Email verified. Create your password to finish.');
});
async function claimTrip(user) {
  await getIdToken(user,true);
  const trip = doc(db,'trips',inviteTrip);
  const ref = doc(trip,'invites',user.email.toLowerCase());
  const invite = await getDocFromServer(ref);
  if (!invite.exists()) throw {code:'auth/invalid-action-code'};
  if (invite.data().acceptedUid === user.uid) return;
  const batch = writeBatch(db);
  batch.update(trip,{memberUids:arrayUnion(user.uid)});
  batch.update(ref,{acceptedUid:user.uid});
  await batch.commit();
}
submit('set-password',async fields => {
  await updatePassword(auth.currentUser,fields.get('password'));
  await claimTrip(auth.currentUser);
  history.replaceState(null,'',location.pathname);
  linkInProgress = false;
  $('join').hidden = true;
  $('set-password').reset();
  showSession(auth.currentUser);
  status('Password created. Your trip is ready.', 'success');
});
submit('change-email',async fields => {
  if (tripRows.some(trip => trip.data().memberEmails.includes(email()))) {
    return status('An older trip stores access by email. Contact the trip owner before changing your address.', 'error');
  }
  const user = auth.currentUser;
  await reauthenticateWithCredential(user,EmailAuthProvider.credential(user.email,fields.get('password')));
  await verifyBeforeUpdateEmail(user,fields.get('email').trim());
  $('change-email').reset();
  status('Open the verification link sent to your new email, then sign in with that address.');
});
submit('record-expense',async fields => {
  const trip = selected && (tripRows.find(item => item.id === selected) || await getDocFromServer(doc(db,'trips',selected)));
  if (!trip) return;
  const label = fields.get('label').trim();
  const paise = Math.round(Number(fields.get('amount'))*100);
  if (!label || !Number.isSafeInteger(paise) || paise < 1) return status('Enter an expense and a valid amount.');
  await addDoc(collection(trip.ref,'expenses'),{label,paise,payer:fields.get('payer'),participants:[...trip.data().memberEmails,...(trip.data().memberUids || [])],createdAt:serverTimestamp()});
  $('record-expense').reset();
  status('Confirmed expense posted.');
});
