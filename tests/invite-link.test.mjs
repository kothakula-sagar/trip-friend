import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readInviteTrip,inviteError,validCheckpoint} from '../invite-flow.mjs';
const trip = 'abcdefghijklmnopqrst';
test('Trip state survives wrapped Firebase email links and rejects malformed IDs',() => {
  const target = 'https://example.test/trips.html?trip='+trip;
  assert.equal(readInviteTrip(target),trip);
  assert.equal(readInviteTrip('https://example.test/action?continueUrl='+encodeURIComponent(target)),trip);
  assert.equal(readInviteTrip('https://example.test/link?link='+encodeURIComponent('https://example.test/action?continueUrl='+encodeURIComponent(target))),trip);
  assert.equal(readInviteTrip('https://example.test/?trip=../../private'),null);
  assert.equal(readInviteTrip('not-a-url'),null);
});
test('Recovery progress is bound to the verified UID and trip and expires after one hour',() => {
  const now = 5000000, checkpoint = {tripId:trip,uid:'member',at:now-1};
  assert.equal(validCheckpoint(checkpoint,trip,'member',now),true);
  assert.equal(validCheckpoint(checkpoint,trip,'other',now),false);
  assert.equal(validCheckpoint(checkpoint,'other','member',now),false);
  assert.equal(validCheckpoint({...checkpoint,at:now-3600001},trip,'member',now),false);
  assert.equal(validCheckpoint({...checkpoint,at:now+1},trip,'member',now),false);
  assert.equal(validCheckpoint({...checkpoint,at:'yesterday'},trip,'member',now),false);
});
test('Invite errors explain address, expiry, connectivity and free email quota recovery',() => {
  assert.match(inviteError('auth/invalid-email'),/exact email address/);
  assert.match(inviteError('auth/invalid-credential'),/does not match/);
  assert.match(inviteError('auth/invalid-action-code'),/fresh sign-in email/);
  assert.match(inviteError('auth/network-request-failed'),/connection/);
  assert.match(inviteError('auth/quota-exceeded'),/free email quota/);
  assert.match(inviteError('invite/not-found'),/no pending invitation/);
});
test('Invite recovery never uses a redirect email as authentication and ships in Android',async () => {
  const source = await readFile('trips.js','utf8');
  assert.doesNotMatch(source,/searchParams\.get\(['"](?:email|inviteEmail)['"]\)/);
  assert.match(source,/signInWithEmailLink\(auth,address,location.href\)/);
  assert.match(source,/await batch.commit\(\)/);
  assert.match(await readFile('scripts/prepare-android.mjs','utf8'),/'invite-flow.mjs'/);
  const html = await readFile('trips.html','utf8');
  for (const id of ['accept-invite','set-password','resend-invite-email','invite-password-link','invite-help']) assert.ok(html.includes('id="'+id+'"'));
});
