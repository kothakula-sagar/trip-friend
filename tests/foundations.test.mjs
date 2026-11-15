import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../worker/index.mjs';
import {createStorageAdapter} from '../storage-adapter.mjs';

test('Worker denies untrusted origin, invalid token, rate limit and nonmembership',async () => {
  const url = 'https://example.test/membership?tripId=abcdefghijklmnopqrst';
  const handle = createHandler({
    verify: async token => { if (token !== 'valid') throw new Error(); return 'member'; },
    membership: async env => env.member
  });
  const make = (token,origin = 'https://localhost') => new Request(url,{headers:{Origin:origin,Authorization:'Bearer '+token}});
  const env = (allowed,member) => ({member,UID_RATE_LIMIT:{limit:async () => ({success:allowed})}});
  assert.equal((await handle(make('valid','https://other.test'),env(true,true))).status,403);
  assert.equal((await handle(make('invalid'),env(true,true))).status,401);
  assert.equal((await handle(make('valid'),env(false,true))).status,429);
  assert.equal((await handle(make('valid'),env(true,false))).status,403);
  assert.equal((await handle(make('valid'),env(true,true))).status,200);
  assert.equal((await handle(make('valid'),{})).status,503);
});
test('Storage adapter validates interface and forwards arguments',async () => {
  assert.throws(() => createStorageAdapter({}));
  const adapter = createStorageAdapter({upload:async value => value,getUrl:async () => 'url',delete:async () => true});
  assert.equal(await adapter.upload('draft'),'draft');
  assert.equal(await adapter.getUrl('photo'),'url');
  assert.equal(await adapter.delete('photo'),true);
});
