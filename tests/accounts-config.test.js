import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAccountConfig} from '../src/accounts.js';
const url='https://fixture.supabase.co';
const jwt=role=>`header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
test('account configuration accepts only public keys and a hosted Supabase project URL',()=>{
 assert.equal(validateAccountConfig({}),null);
 assert.deepEqual(validateAccountConfig({supabaseUrl:url+'/',supabasePublishableKey:'sb_publishable_fixture'}),{url,key:'sb_publishable_fixture'});
 assert.equal(validateAccountConfig({supabaseUrl:url,supabasePublishableKey:jwt('anon')}).key,jwt('anon'));
 for(const key of ['sb_secret_fixture',jwt('service_role'),'invalid'])assert.throws(()=>validateAccountConfig({supabaseUrl:url,supabasePublishableKey:key}));
 for(const invalid of ['http://fixture.supabase.co','https://fixture.supabase.co/other','https://fixture.example.com','https://user:pass@fixture.supabase.co'])assert.throws(()=>validateAccountConfig({supabaseUrl:invalid,supabasePublishableKey:'sb_publishable_fixture'}));
});
