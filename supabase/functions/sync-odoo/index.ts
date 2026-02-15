import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Odoo from "npm:odoo-xmlrpc";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const authHeader = req.headers.get('Authorization');

        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }

        let isAuthorized = false;

        // 1. Service Role Key Check (for Cron/Internal)
        if (authHeader === `Bearer ${serviceRoleKey}`) {
            isAuthorized = true;
        } else {
            // 2. Admin User Check (for Manual Trigger)
            const supabaseClient = createClient(
                supabaseUrl,
                Deno.env.get('SUPABASE_ANON_KEY') ?? '',
                { global: { headers: { Authorization: authHeader } } }
            );

            const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

            if (!userError && user) {
                // Check if user is an admin
                const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
                const { data: admin } = await supabaseAdmin
                    .from('admins')
                    .select('id')
                    .eq('id', user.id)
                    .single();

                if (admin) {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            });
        }

        // Odoo Connection
        const odooConfig = {
            url: Deno.env.get('ODOO_URL'),
            db: Deno.env.get('ODOO_DB'),
            username: Deno.env.get('ODOO_USERNAME'),
            password: Deno.env.get('ODOO_PASSWORD'),
        };

        if (!odooConfig.url || !odooConfig.db || !odooConfig.username || !odooConfig.password) {
            throw new Error('Missing Odoo configuration');
        }

        const odoo = new Odoo(odooConfig);

        console.log('Connecting to Odoo...');
        await new Promise((resolve, reject) => {
            odoo.connect((err: any) => {
                if (err) return reject(err);
                resolve(true);
            });
        });
        console.log('Connected to Odoo');

        // Fetch Members
        console.log('Fetching members...');
        const members = await new Promise<any[]>((resolve, reject) => {
            const params = {
                domain: [['vat', '!=', false]], // Only with TCKN
                fields: ['name', 'email', 'vat'],
                limit: 1000 // Reasonable limit for demo
            };

            odoo.execute_kw('res.partner', 'search_read', [
                params.domain
            ], {
                fields: params.fields,
                limit: params.limit
            }, (err: any, value: any) => {
                if (err) return reject(err);
                resolve(value);
            });
        });

        console.log(`Fetched ${members.length} members`);

        // Transform Data
        const validMembers = members
            .filter((m: any) => m.vat && m.name) // Ensure valid data
            .map((m: any) => ({
                tckn: m.vat,
                masked_name: m.name, // Using 'masked_name' column as per schema, temporarily storing full name (legacy decision)
                // is_active: true, // Optional: default to true if not present
                synced_at: new Date().toISOString()
            }));

        if (validMembers.length === 0) {
            return new Response(JSON.stringify({ message: "No valid members found to sync" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // Upsert to Supabase (using Service Role to bypass RLS)
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        const { error: upsertError } = await supabaseAdmin
            .from('member_whitelist') // Fixed table name from 'members'
            .upsert(validMembers, { onConflict: 'tckn' });

        if (upsertError) {
            throw upsertError;
        }

        return new Response(JSON.stringify({
            message: "Sync successful",
            count: validMembers.length
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
