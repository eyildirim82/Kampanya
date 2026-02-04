const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testKey(name, key) {
    if (!key) { console.log(`${name}: MISSING`); return; }
    const cleanedKey = key.trim();
    try {
        const client = createClient(url, cleanedKey, { auth: { persistSession: false } });
        const { count, error } = await client.from('member_whitelist').select('*', { count: 'exact', head: true });

        if (error) {
            console.log(`${name}: FAILED | ${error.message} | Code: ${error.code}`);
        } else {
            console.log(`${name}: SUCCESS | Count: ${count}`);
        }
    } catch (e) {
        console.log(`${name}: EXCEPTION | ${e.message}`);
    }
}

(async () => {
    console.log("STARTING TEST");
    if (!url) { console.log("URL MISSING"); return; }
    await testKey('ANON', anonKey);
    await testKey('SERVICE', serviceKey);
    console.log("FINISHED TEST");
})();
