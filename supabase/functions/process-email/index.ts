
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.7";

const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "587");
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");
const SMTP_FROM = Deno.env.get("SMTP_FROM") || "noreply@talpa.org";

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

serve(async (req: Request) => {
    try {
        const payload = await req.json();
        const { type, table, record, old_record } = payload;

        console.log(`Received webhook: ${type} on ${table}`);

        // We only care about applications table
        if (table !== 'applications') {
            return new Response("Ignored table", { status: 200 });
        }

        // Determine the Trigger Event
        let triggerEvent: string | null = null;
        let shouldProcess = false;

        if (type === 'INSERT') {
            triggerEvent = 'SUBMISSION';
            shouldProcess = true;
        } else if (type === 'UPDATE') {
            // Check for status change
            const oldStatus = old_record?.status;
            const newStatus = record?.status;

            if (oldStatus !== newStatus) {
                if (newStatus === 'APPROVED') {
                    triggerEvent = 'STATUS_APPROVED';
                    shouldProcess = true;
                } else if (newStatus === 'REJECTED') {
                    triggerEvent = 'STATUS_REJECTED';
                    shouldProcess = true;
                }
            }
        }

        if (!shouldProcess || !triggerEvent) {
            console.log(`No applicable trigger event found. Type: ${type}, Trigger: ${triggerEvent}`);
            return new Response("No trigger event", { status: 200 });
        }

        const email = record.email;
        const fullName = record.full_name;

        // Basic data extraction
        const tckn = record.tckn || "";
        const phone = record.phone || "";
        const address = record.address || "";
        const formData = record.form_data || {};
        const deliveryMethodRaw = formData.deliveryMethod || "";

        let deliveryMethod = deliveryMethodRaw;
        if (deliveryMethodRaw === 'address') deliveryMethod = 'Adrese Teslim';
        if (deliveryMethodRaw === 'branch') deliveryMethod = 'Şubeden Teslim';

        if (!email) {
            console.error("No email in record");
            return new Response("No email", { status: 400 });
        }

        console.log(`Processing ${triggerEvent} email for ${email}`);

        // 1. Fetch Matching Configs
        const supabaseUrl = Deno.env.get('MY_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('MY_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const recordCampaignId = record.campaign_id as string | null;

        let query = supabase
            .from('email_configurations')
            .select('*')
            .eq('is_active', true)
            .eq('trigger_event', triggerEvent);

        if (recordCampaignId) {
            query = query.eq('campaign_id', recordCampaignId);
        } else {
            query = query.is('campaign_id', null);
        }

        const { data: configs, error: configError } = await query;

        if (configError) {
            console.error("Config fetch error:", configError);
            return new Response(JSON.stringify({ error: configError.message }), { status: 500 });
        }

        if (!configs || configs.length === 0) {
            console.log(`No active email configurations found for trigger: ${triggerEvent} and campaign: ${recordCampaignId}`);
            return new Response("No config found", { status: 200 });
        }

        console.log(`Found ${configs.length} email configurations.`);

        // 2. Loop and Process Each
        const results: Array<{ email: string; id: string }> = [];
        const errors: Array<{ configId: string; error: string }> = [];

        for (const config of configs) {
            try {
                let targetEmail = "";

                if (config.recipient_type === 'applicant') {
                    targetEmail = email;
                } else if (config.recipient_type === 'custom' || config.recipient_type === 'admin') {
                    targetEmail = config.recipient_email;
                }

                if (!targetEmail) {
                    console.warn(`Skipping config ${config.id}: No target email defined.`);
                    continue;
                }

                // Prepare Data for Template
                const flatData: Record<string, string> = {
                    full_name: fullName,
                    name: fullName,
                    email: email,
                    tckn: tckn,
                    phone: phone,
                    address: address,
                    deliveryMethod: deliveryMethod,
                    status: record.status || '', // APPROVED, REJECTED, etc.
                    admin_notes: record.admin_notes || '',
                    date: new Date().toLocaleDateString('tr-TR'),
                    created_at: new Date().toLocaleDateString('tr-TR'),
                    year: new Date().getFullYear().toString(),
                    ...Object.entries(formData).reduce((acc, [key, val]) => {
                        if (typeof val === 'boolean') {
                            acc[key] = val ? 'Evet' : 'Hayır';
                        } else if (typeof val === 'object' && val !== null) {
                            acc[key] = JSON.stringify(val);
                        } else {
                            acc[key] = String(val || '');
                        }
                        return acc;
                    }, {} as Record<string, string>)
                };

                const replaceAll = (str: string) => {
                    if (!str) return "";
                    let result = str;
                    for (const [key, val] of Object.entries(flatData)) {
                        const regex = new RegExp(`{{${key}}}`, 'g');
                        result = result.replace(regex, val);
                    }
                    return result;
                };

                const compiledSubject = replaceAll(config.subject_template);
                const compiledBody = replaceAll(config.body_template);

                console.log(`Sending email to ${targetEmail}: ${compiledSubject}`);

                const info = await transporter.sendMail({
                    from: SMTP_FROM,
                    to: targetEmail,
                    subject: compiledSubject,
                    html: compiledBody,
                });

                results.push({ email: targetEmail, id: info.messageId });

            } catch (innerError: any) {
                console.error(`Failed to send email for config ${config.id}:`, innerError);
                errors.push({
                    configId: String(config.id),
                    error: innerError?.message || String(innerError),
                });
            }
        }

        return new Response(JSON.stringify({
            success: errors.length === 0,
            processed: configs.length,
            results,
            errors
        }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Error processing webhook:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
});
