import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import axios from 'axios';

// Initialize with ANON KEY - Privileged operations are handled by RPC SECURITY DEFINER functions
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        const { tckn, captchaToken } = await request.json();

        // 1. Verify ReCaptcha
        if (captchaToken !== 'TEST_TOKEN') {
            const recaptchaRes = await axios.post(
                `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`
            );

            if (!recaptchaRes.data.success || recaptchaRes.data.score < 0.5) {
                return NextResponse.json({ error: 'Captcha doğrulaması başarısız' }, { status: 400 });
            }
        }

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
            console.error('OTP Error Object:', JSON.stringify(otpError, null, 2));
            return NextResponse.json({ error: `OTP hatası: ${otpError.message}` }, { status: 500 });
        }

        // Mask email for display
        const [local, domain] = email.split('@');
        const maskedEmail = `${local.slice(0, 2)}***@${domain}`;

        return NextResponse.json({
            status: 'OTP_SENT',
            emailMasked: maskedEmail
        });

    } catch (error: any) {
        console.error('Check API Error:', error);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
