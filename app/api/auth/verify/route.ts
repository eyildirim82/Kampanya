import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Use Anon Key
const supabase = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()
);

export async function POST(request: Request) {
    try {
        const { tckn, otp } = await request.json();

        // 1. Get member email securely using RPC
        const { data, error: rpcError } = await supabase.rpc('check_member_status', {
            input_tckn: tckn
        });

        if (rpcError) {
            console.error('RPC Error:', rpcError);
            return NextResponse.json({ error: 'Sistem hatası' }, { status: 500 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = Array.isArray(data) ? data[0] : (data as any);

        if (!result || !result.member_exists) {
            return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 });
        }

        // 2. Verify OTP
        // Using Anon Key client
        const { data: { session }, error: verifyError } = await supabase.auth.verifyOtp({
            email: result.member_email,
            token: otp,
            type: 'email'
        });

        if (verifyError || !session) {
            console.error('Verify OTP Error:', verifyError);
            return NextResponse.json({ error: 'Hatalı veya süresi dolmuş kod' }, { status: 400 });
        }

        // Success
        return NextResponse.json({
            success: true,
            session: session
        });

    } catch (error) {
        console.error('Verify API Error:', error);
        return NextResponse.json({ error: 'Doğrulama hatası' }, { status: 500 });
    }
}
