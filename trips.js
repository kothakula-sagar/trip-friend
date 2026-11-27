import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import {getAuth,setPersistence,browserLocalPersistence,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,sendEmailVerification,signOut,reload,getIdToken,sendSignInLinkToEmail,isSignInWithEmailLink,signInWithEmailLink,updatePassword,verifyBeforeUpdateEmail,reauthenticateWithCredential,EmailAuthProvider} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,collection,addDoc,doc,query,where,limit,orderBy,onSnapshot,serverTimestamp,updateDoc,arrayUnion,getDocFromServer,getDoc,setDoc,writeBatch,or,getDocs,deleteDoc,runTransaction,arrayRemove} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';
import {createTripMap} from './trip-map.js';
import {createRealTrip} from './real-trip.js';
import {readInviteTrip,inviteError,validCheckpoint} from './invite-flow.mjs';
import {firebaseConfig} from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const requestedTrip = new URL(location.href).searchParams.get('open');
const db = initializeFirestore(app, window.TripShell.native ? {
  localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})
} : {});
const real = createRealTrip({
  subscribe: (id,path,field,direction,update,error) => onSnapshot(
    query(collection(db,'trips',id,path),orderBy(field,direction),limit(100)),
    {includeMetadataChanges:true}, snapshot => update(snapshot.docs.map(item => ({...item.data(),id:item.id,pending:item.metadata.hasPendingWrites})),snapshot.metadata),error),
  write: (id,path,data,key) => key
    ? setDoc(doc(db,'trips',id,path,key),{...data,updatedAt:serverTimestamp()})
    : addDoc(collection(db,'trips',id,path),{...data,createdAt:serverTimestamp()}),
  vote: (id,pollId,option) => setDoc(doc(db,'trips',id,'polls',pollId,'votes',auth.currentUser.uid),{option,updatedAt:serverTimestamp()}),
  patch: (id,path,key,fields) => updateDoc(doc(db,'trips',id,path,key),fields),
  erase: (id,path,key) => deleteDoc(doc(db,'trips',id,path,key)),
  identity: () => auth.currentUser,
  openTrip: id => {
    const found = tripRows.find(trip => trip.id === id);
    if (found && selected !== id) displayTrip(found);
  },
  showList: () => {
    if (!window.TripShell.native && !selected) return;
    stopExpenses?.();
    selected = null;
    showTripMap(null);
    real.select(null);
    $('detail').hidden = true;
    $('real-trip-list').hidden = false;
    $('trip-empty').hidden = window.TripShell.native;
  }
});
const meetingPoint = id => doc(db,'trips',id,'map','meeting');
const showTripMap = createTripMap({
  viewer: () => auth.currentUser?.uid,
  listen: (id,change,error) => onSnapshot(meetingPoint(id),snapshot => change(snapshot.data()),error),
  save: (id,point) => setDoc(meetingPoint(id),{...point,updatedAt:serverTimestamp()}),
  remove: id => deleteDoc(meetingPoint(id))
});
const $ = id => document.getElementById(id);
function status(message, tone = '') {
  $('status').textContent = message;
  $('status').dataset.tone = tone;
  $('status').dataset.session = String(message.startsWith('Signed in as '));
}
const email = () => auth.currentUser.email;
const format = new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'});
const money = paise => format.format(paise/100);
let stopTrips, stopExpenses, selected, tripRows = [];
const inviteUrl = new URL(location.href);
const inviteTrip = readInviteTrip(location.href);
const validInviteTrip = inviteTrip && /^[A-Za-z0-9]{20}$/.test(inviteTrip);
const sharedLink = Boolean(validInviteTrip && (inviteUrl.searchParams.get('join') === '1' || inviteUrl.searchParams.get('finish') === '1'));
let resumeTrip;
const emailLink = validInviteTrip && isSignInWithEmailLink(auth,location.href);
let linkInProgress = Boolean(emailLink || (validInviteTrip && inviteUrl.searchParams.get('finish') === '1'));
let inviteCheckpoint;
try { inviteCheckpoint = JSON.parse(sessionStorage.getItem('tf-invite-checkpoint')); } catch {}
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
  const message = ((linkInProgress || action?.includes('invitation')) && inviteError(error.code)) || messages[error.code] || inviteError(error.code) || 'Could not complete this action. Retry, or contact the organizer. Error: '+String(error.code || 'unknown').replace(/[^a-zA-Z0-9_/-]/g,'').slice(0,80);
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
$('sign-out').onclick = () => {
  real.stopLocation();
  signOut(auth).catch(showError);
};
$('real-sign-out').onclick = () => $('sign-out').click();
if (window.TripShell.native) {
  const openLink = url => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'tripfriend:' && parsed.hostname === 'trip' && /^\/[A-Za-z0-9]{20}$/.test(parsed.pathname)) real.go(parsed.pathname.slice(1));
    } catch {}
  };
  const plugin = window.Capacitor.Plugins.App;
  plugin.addListener('appUrlOpen',event => openLink(event.url));
  plugin.addListener('appStateChange',event => { if (!event.isActive) real.stopLocation(); });
  plugin.getLaunchUrl().then(event => { if (event?.url) openLink(event.url); }).catch(() => {});
}

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
  if (validInviteTrip && user?.emailVerified && validCheckpoint(inviteCheckpoint,inviteTrip,user.uid)) {
    linkInProgress = true;
    $('join').hidden = false;
    $('accept-invite').hidden = true;
    $('set-password').hidden = false;
    $('invite-help').textContent = 'Email confirmed. Finish creating your password to join. If saving fails, you can retry here.';
  } else if (linkInProgress && !emailLink) {
    linkInProgress = false;
    $('join').hidden = true;
  }
  clearTimeout(window.tripConnectionTimer);
  $('retry-connect').hidden = true;
  $('link-join').hidden = !sharedLink || !user?.emailVerified || !!resumeTrip || linkInProgress;
  stopTrips?.();
  stopExpenses?.();
  real.select(null);
  $('real-trip-list').hidden = false;
  $('real-sign-out').hidden = !user;
  selected = null;
  showTripMap(null);
  tripRows = [];
  $('trip-list').replaceChildren();
  $('detail').hidden = true;
  $('trip-empty').hidden = window.TripShell.native || !user?.emailVerified;
  window.TripShell.state($('list-status'), user?.emailVerified ? 'loading' : 'idle', user?.emailVerified ? 'Loading trips…' : '');
  $('account').hidden = !!user || linkInProgress;
  $('settings').hidden = !user?.emailVerified || linkInProgress;
  $('verification').hidden = !user || user.emailVerified;
  $('workspace').hidden = !user?.emailVerified;
  $('sign-out').hidden = !user;
  status(user?.emailVerified ? 'Signed in as '+user.email : user ? 'Email verification required.' :
    sharedLink ? 'Sign in with the email your organizer invited.' : 'Sign in or create an account.');
  if (!user?.emailVerified || linkInProgress) { $('workspace').hidden = true; return; }
  stopTrips = onSnapshot(query(collection(db,'trips'),or(where('memberEmails','array-contains',email()),where('memberUids','array-contains',user.uid)),limit(50)), snapshot => {
    window.TripShell.state($('list-status'), 'ready');
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
      button.onclick = () => { real.go(trip.id); };
      li.append(button);
      return li;
    }));
    if (!tripRows.length) $('trip-list').append(row('No private trips yet.'));
    const current = tripRows.find(trip => trip.id === (window.TripShell.route().id || selected || resumeTrip || requestedTrip));
    if (current) { if (!window.TripShell.route().id) real.go(current.id); else displayTrip(current); }
    else if (selected) {
      stopExpenses?.();
      selected = null;
      showTripMap(null);
      real.select(null);
      $('real-trip-list').hidden = false;
      $('detail').hidden = true;
      $('trip-empty').hidden = false;
    }
  }, error => {
    $('list-status').textContent = error.code === 'permission-denied'
      ? 'Trip list is unavailable. Firestore refused access.'
      : 'Could not load trips. Reload the page to retry.';
  });
}
$('new-trip-toggle').onclick = () => {
  const form = $('create-trip');
  form.hidden = !form.hidden;
  $('new-trip-toggle').setAttribute('aria-expanded',String(!form.hidden));
  if (!form.hidden) form.elements.name.focus();
};
setPersistence(auth,browserLocalPersistence).catch(() => {
  status('Persistent sign-in storage is unavailable on this device.');
}).finally(() => onAuthStateChanged(auth,showSession,showError));
submit('create-trip',async fields => {
  const name = fields.get('name').trim();
  if (!name) return status('Enter a trip name.');
  const trip = await addDoc(collection(db,'trips'),{name,ownerUid:auth.currentUser.uid,memberEmails:[],memberUids:[auth.currentUser.uid],crewRemovalTracked:true,createdAt:serverTimestamp()});
  $('create-trip').reset();
  $('create-trip').hidden = true;
  $('new-trip-toggle').setAttribute('aria-expanded','false');
  const current = tripRows.find(item => item.id === trip.id);
  try {
    const created = current || await getDocFromServer(trip);
    real.go(created.id);
    displayTrip(created);
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
  real.select({id:trip.id,name:data.name,admin,memberUids:[...new Set([data.ownerUid,...(data.memberUids || []),auth.currentUser.uid])],closed:data.status === 'closed' || data.closed === true});
  $('real-trip-list').hidden = window.TripShell.native;
  const share = $('native-share-trip');
  const nativeShare = window.Capacitor?.Plugins?.Share;
  share.hidden = !window.Capacitor?.isNativePlatform?.() || !nativeShare;
  share.onclick = () => {
    const url = new URL('https://kothakula-sagar.github.io/trip-friend/trips.html');
    url.searchParams.set('open',trip.id);
    nativeShare.share({title:data.name,text:'Open this trip with your invited account.',url:url.href}).catch(showError);
  };
  $('trip-empty').hidden = true;
  $('detail').hidden = false;
  for (const button of $('trip-list').querySelectorAll('button')) {
    if (button.dataset.tripId === trip.id) button.setAttribute('aria-current','true');
    else button.removeAttribute('aria-current');
  }
  if ($('invite-copy-url').value && new URL($('invite-copy-url').value).searchParams.get('trip') !== trip.id) {
    $('invite-copy-area').hidden = true;
    $('invite-copy-url').value = '';
    $('invite-status').textContent = '';
  }
  $('crew-feedback').textContent = '';
  $('trip-name').textContent = data.name;
  $('trip-role').textContent = admin ? 'You’re the trip admin' : 'You’re a trip member';
  $('member-panel').hidden = !admin;
  $('crew-invite-action').hidden = !admin;
  $('crew-invite-action').onclick = () => {
    real.go(trip.id,'invite');
    $('invite').elements.name.focus();
    $('member-panel').scrollIntoView({block:'start'});
  };
  $('crew-invites').hidden = !admin;
  $('invites').replaceChildren();
  nameLookup = new Map([[auth.currentUser.uid, 'You']]);
  if (admin) getDocs(query(collection(trip.ref,'invites'),limit(50))).then(snapshot => {
    if (selected !== trip.id || auth.currentUser?.uid !== data.ownerUid) return;
    $('invites').replaceChildren(...snapshot.docs.map(item => {
      const value = item.data();
      if (value.acceptedUid && value.acceptedUid !== auth.currentUser.uid) nameLookup.set(value.acceptedUid,value.name);
      const li = row(value.name+' · '+item.id+' · '+(value.acceptedUid ? 'Joined' : 'Pending'));
      if (value.acceptedUid && (data.memberUids || []).includes(value.acceptedUid) && value.acceptedUid !== data.ownerUid) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'outline';
        remove.textContent = 'Remove member';
        li.append(remove);
        remove.onclick = async () => {
          if (!data.crewRemovalTracked || data.memberEmails.length) {
            $('crew-feedback').textContent = 'This older trip needs a financial history check before members can be removed.';
            return;
          }
          if (!confirm('Remove '+value.name+' from this trip? They will lose access.')) return;
          remove.disabled = true;
          try {
            await runTransaction(db,async transaction => {
              const expenseMarker = await transaction.get(doc(trip.ref,'finance','firstExpense'));
              if (expenseMarker.exists()) throw new Error('This trip has posted expenses. Member removal requires a settlement check.');
              transaction.update(trip.ref,{memberUids:arrayRemove(value.acceptedUid)});
            });
            status('Member removed.');
          } catch (error) {
            if (error.code) showError(error,'Remove member');
            else status(error.message,'error');
          } finally { remove.disabled = false; }
        };
        remove.disabled = data.status === 'closed' || data.status === 'closing' || !!data.closed;
        return li;
      }
      if (value.acceptedUid) {
        li.textContent = value.name+' · '+item.id+' · Removed';
        return li;
      }
      if (value.acceptedUid || data.status === 'closed' || data.status === 'closing' || data.closed) return li;
      const actions = document.createElement('div');
      actions.className = 'actions';
      for (const [label,run] of [
        ['Copy invite link',async () => {
          const url = inviteLink(trip.id);
          real.go(trip.id,'invite');
          $('invite-copy-area').hidden = false;
          $('invite-copy-url').value = url.href;
          await copyInviteLink();
          return false;
        }],
        ['Edit invite',async () => {
          const name = prompt('Member name',value.name)?.trim();
          if (!name || name.length > 80) return;
          const mobile = prompt('Mobile number',value.mobile)?.trim();
          if (!mobile || !/^\+?[0-9 ()-]{7,22}$/.test(mobile)) return;
          await updateDoc(item.ref,{name,mobile});
          status('Invitation updated.');
        }],
        ['Delete invite',async () => {
          if (!confirm('Delete the pending invitation for '+value.name+'?')) return;
          await deleteDoc(item.ref);
          status('Invitation deleted.');
        }]
      ]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'outline';
        button.textContent = label;
        button.onclick = async () => {
          button.disabled = true;
          try { const refresh = await run(); if (refresh !== false && selected === trip.id) displayTrip(trip); }
          catch (error) { showError(error,label); }
          finally { button.disabled = false; }
        };
        actions.append(button);
      }
      li.append(actions);
      return li;
    }));
    renderCrew();
  }).catch(() => { if (selected === trip.id) $('crew-feedback').textContent = 'Could not load invitations. Reopen the trip to retry.'; });
  function renderCrew() {
    const name = id => nameLookup.get(id) || (id.includes('@') ? id : 'Trip member');
    $('crew').replaceChildren(...participants.map(id => row(name(id)+' · '+(id === data.ownerUid || (admin && id === email() && !(data.memberUids || []).includes(data.ownerUid)) ? 'Admin' : 'Member'))));
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
    let total = 0;
    $('shared-expenses').replaceChildren(...snapshot.docs.map(expense => {
      const bill = expense.data();
      total += bill.paise;
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
    $('real-wrap-summary').textContent = money(total)+' spent across '+snapshot.size+' recent expenses.';
    if (snapshot.empty) $('shared-expenses').append(row('No confirmed expenses yet.'));
    $('shared-balances').replaceChildren(...[...balances].map(([member,value]) => row((nameLookup.get(member) || (member.includes('@') ? member : 'Trip member'))+' · '+(value === 0 ? 'Settled' : value > 0 ? 'Gets back '+money(value) : 'Owes '+money(-value)))));
  }, () => { $('expense-status').textContent = 'Could not load shared expenses.'; });
}
submit('invite',async (fields,action) => {
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
  const url = new URL('https://kothakula-sagar.github.io/trip-friend/trips.html');
  url.searchParams.set('trip',tripId);
  const fallback = inviteLink(tripId);
  if (selected !== tripId) return;
  $('invite-copy-area').hidden = false;
  $('invite-copy-url').value = fallback.href;
  $('invite-status').textContent = 'Invitation is ready. Share the link with '+address+'.';
  if (action !== 'share') {
    try {
      await sendSignInLinkToEmail(auth,address,{url:url.href,handleCodeInApp:true});
      if (selected === tripId) $('invite-status').textContent = 'Firebase accepted the email request. If your friend can’t find it, share the link below.';
    } catch (error) {
      if (selected === tripId) $('invite-status').textContent = ['auth/too-many-requests','auth/quota-exceeded'].includes(error.code)
        ? 'The Firebase email limit was reached. Share the invite link below.'
        : 'The email could not be sent. Share the invite link below.';
    }
  }
  if (selected !== tripId) return;
  $('invite').reset();
  if (trip) displayTrip(trip);

});
function inviteLink(tripId) {
  const url = new URL('https://kothakula-sagar.github.io/trip-friend/trips.html');
  url.searchParams.set('trip',tripId);
  url.searchParams.set('join','1');
  return url;
}
async function copyInviteLink() {
  const field = $('invite-copy-url');
  try {
    await navigator.clipboard.writeText(field.value);
    $('invite-status').textContent = 'Invite link copied.';
  } catch { field.focus(); field.select(); $('invite-status').textContent = 'Copy the selected link and share it with your friend.'; }
}
$('copy-invite').onclick = copyInviteLink;
$('join-shared-link').onclick = async () => {
  const button = $('join-shared-link');
  button.disabled = true;
  try {
    await claimTrip(auth.currentUser);
    resumeTrip = inviteTrip;
    history.replaceState(null,'',location.pathname);
    showSession(auth.currentUser);
    status('Invitation accepted.', 'success');
  } catch (error) { showError(error,'Accept invitation'); }
  finally { button.disabled = false; }
};
$('join').hidden = !emailLink;
if (validInviteTrip) $('invite-password-link').href = inviteLink(inviteTrip).href;
let resendUntil = 0;
$('resend-invite-email').onclick = async () => {
  const form = $('accept-invite');
  if (!form.elements.email.reportValidity() || Date.now() < resendUntil || !validInviteTrip) return;
  const button = $('resend-invite-email');
  button.disabled = true;
  try {
    const url = new URL(location.pathname,location.origin);
    url.searchParams.set('trip',inviteTrip);
    await sendSignInLinkToEmail(auth,form.elements.email.value.trim(),{url:url.href,handleCodeInApp:true});
    resendUntil = Date.now()+60000;
    status('Firebase accepted the email request. Open the newest message in that mailbox. Trip access still requires an invitation from your organizer.','success');
  } catch (error) { showError(error,'Send fresh invitation link'); }
  finally {
    if (Date.now() < resendUntil) {
      button.textContent = 'Wait 60 seconds before resending';
      setTimeout(() => { button.disabled = false; button.textContent = 'Send a fresh sign-in email'; },60000);
    } else button.disabled = false;
  }
};
submit('accept-invite',async fields => {
  const address = fields.get('email').trim();
  const credential = await signInWithEmailLink(auth,address,location.href);
  // Remember progress only after Firebase confirms the mailbox. Never store the action code.
  inviteCheckpoint = {tripId:inviteTrip,uid:credential.user.uid,at:Date.now()};
  try { sessionStorage.setItem('tf-invite-checkpoint',JSON.stringify(inviteCheckpoint)); } catch {}
  const finish = new URL(location.pathname,location.origin);
  finish.searchParams.set('trip',inviteTrip);
  finish.searchParams.set('finish','1');
  history.replaceState(null,'',finish.href);
  $('accept-invite').hidden = true;
  $('set-password').hidden = false;
  status('Email verified. Create your password to finish.');
});
async function claimTrip(user) {
  await getIdToken(user,true);
  const trip = doc(db,'trips',inviteTrip);
  const ref = doc(trip,'invites',user.email.toLowerCase());
  const invite = await getDocFromServer(ref);
  if (!invite.exists()) throw {code:'invite/not-found'};
  if (invite.data().acceptedUid && invite.data().acceptedUid !== user.uid) throw {code:'invite/already-claimed'};
  if (invite.data().acceptedUid === user.uid) {
    const current = await getDocFromServer(trip);
    if (!current.data()?.memberUids?.includes(user.uid)) throw {code:'auth/invalid-action-code'};
    return;
  }
  const batch = writeBatch(db);
  batch.update(trip,{memberUids:arrayUnion(user.uid)});
  batch.update(ref,{acceptedUid:user.uid});
  await batch.commit();
}
submit('set-password',async fields => {
  await updatePassword(auth.currentUser,fields.get('password'));
  await claimTrip(auth.currentUser);
  resumeTrip = inviteTrip;
  history.replaceState(null,'',location.pathname);
  linkInProgress = false;
  inviteCheckpoint = null;
  try { sessionStorage.removeItem('tf-invite-checkpoint'); } catch {}
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
  const bill = doc(collection(trip.ref,'expenses'));
  const marker = doc(trip.ref,'finance','firstExpense');
  if (!trip.data().crewRemovalTracked) {
    const previous = trip.data();
    await setDoc(bill,{label,paise,payer:fields.get('payer'),participants:[...previous.memberEmails,...(previous.memberUids || [])],createdAt:serverTimestamp()});
  } else await runTransaction(db,async transaction => {
    const latest = (await transaction.get(trip.ref)).data();
    const first = latest.crewRemovalTracked ? await transaction.get(marker) : null;
    transaction.set(bill,{label,paise,payer:fields.get('payer'),participants:[...latest.memberEmails,...(latest.memberUids || [])],createdAt:serverTimestamp()});
    if (first && !first.exists()) transaction.set(marker,{expenseId:bill.id});
  });
  $('record-expense').reset();
  status('Confirmed expense posted.');
});
