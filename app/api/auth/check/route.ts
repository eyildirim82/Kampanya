import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getSupabaseUrl } from '@/lib/supabase-url';

export async function POST(request: Request) {
    try {
        const url = getSupabaseUrl();
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
        if (!key) {
            return NextResponse.json({ error: 'Sunucu yapılandırma hatası' }, { status: 500 });
        }
        const supabase = createClient(url, key);

        const { tckn } = await request.json();

        // 2. Check Member Status using RPC
        // This function is SECURITY DEFINER, so it can see data that Anon Key cannot directly select.
        const { data, error: rpcError } = await supabase.rpc('check_member_status', {
            input_tckn: tckn
        });

        if (rpcError) {
            console.error('RPC Error:', rpcError);
            return NextResponse.json({ error: 'Sistem hatası' }, { status: 500 });
        }

        // RPC returns the row directly as an object (or null if not found?)
        // Our function returns TABLE, so it returns an array of rows.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = Array.isArray(data) ? data[0] : (data as any);

        if (!result || !result.member_exists) {
            return NextResponse.json({ error: 'Girdiğiniz TCKN ile kayıtlı bir üye bulunamadı.' }, { status: 404 });
        }

        if (!result.has_app) {
            return NextResponse.json({ status: 'REDIRECT_FORM' });
        }

        // 3. Send OTP
        // We use the email returned by the RPC function
        const email = result.member_email;

        // signInWithOtp works with Anon Key for existing users?
        // Wait, if "shouldCreateUser: true", it signs up. Anon Key allows signup.
        // So this is fine.
        const { error: otpError } = await supabase.auth.signInWithOtp({
            email: email,
            options: { shouldCreateUser: true }
        });

        if (otpError) {
            console.error('OTP Error:', otpError.code || otpError.status, otpError.message);
            return NextResponse.json({ error: `OTP hatası: ${otpError.message}` }, { status: 500 });
        }

        // Mask email for display
        const [local, domain] = email.split('@');
        const maskedEmail = `${local.slice(0, 2)}***@${domain}`;

        return NextResponse.json({
            status: 'OTP_SENT',
            emailMasked: maskedEmail
        });

    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('Check API Error:', err.message);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
