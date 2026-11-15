import {after,before,test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {assertFails,assertSucceeds,initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {collection,doc,deleteDoc,updateDoc,getDoc,getDocs,limit,query,serverTimestamp,setDoc} from 'firebase/firestore';
let env;
before(async () => {
  env = await initializeTestEnvironment({projectId:'demo-tripfriend',firestore:{rules:await readFile('firestore.rules','utf8')}});
  await env.withSecurityRulesDisabled(async context => {
    for (const id of ['open','closed']) await setDoc(doc(context.firestore(),'trips',id),{
      ownerUid:'admin',memberEmails:[],memberUids:['admin','member'],status:id === 'closed' ? 'closed' : 'active'
    });
  });
});
after(async () => { await env?.cleanup(); });
const account = (uid, verified = true) => env.authenticatedContext(uid,{email:uid+'@example.test',email_verified:verified}).firestore();
test('Nonmembers and unverified members cannot read a trip',async () => {
  await assertFails(getDoc(doc(account('outside'),'trips/open')));
  await assertFails(getDoc(doc(account('member',false),'trips/open')));
  await assertSucceeds(getDoc(doc(account('member'),'trips/open')));
});
test('Profile writes require self identity and an active trip; listing requires a limit',async () => {
  const client = account('member');
  const profile = {name:'Meera',updatedAt:serverTimestamp()};
  await assertSucceeds(setDoc(doc(client,'trips/open/profiles/member'),profile));
  await assertFails(setDoc(doc(client,'trips/open/profiles/admin'),profile));
  await assertFails(setDoc(doc(client,'trips/closed/profiles/member'),profile));
  await assertFails(getDocs(collection(client,'trips/open/profiles')));
  await assertSucceeds(getDocs(query(collection(client,'trips/open/profiles'),limit(20))));
});
test('Only the admin can edit or delete pending invites on active trips',async () => {
  const path = (trip,address) => 'trips/'+trip+'/invites/'+address;
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    for (const [trip,address,acceptedUid] of [
      ['open','pending@example.test',''], ['open','joined@example.test','member'],
      ['closed','pending@example.test','']
    ]) await setDoc(doc(db,path(trip,address)),{name:'Traveler',mobile:'+919876543210',acceptedUid});
  });
  const pending = path('open','pending@example.test');
  const admin = account('admin');
  await assertFails(updateDoc(doc(account('member'),pending),{name:'New name'}));
  await assertFails(deleteDoc(doc(account('outside'),pending)));
  await assertFails(updateDoc(doc(admin,pending),{acceptedUid:'other'}));
  await assertFails(deleteDoc(doc(admin,path('open','joined@example.test'))));
  await assertFails(updateDoc(doc(admin,path('closed','pending@example.test')),{name:'New name'}));
  await assertFails(deleteDoc(doc(admin,path('closed','pending@example.test'))));
  await assertSucceeds(updateDoc(doc(admin,pending),{name:'New name'}));
  await assertSucceeds(deleteDoc(doc(admin,pending)));
});
