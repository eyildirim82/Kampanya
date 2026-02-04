
import { sendEmail } from '../lib/smtp';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function test() {
    console.log('--- Testing SMTP Email ---');
    console.log('Host:', process.env.SMTP_HOST);
    console.log('User:', process.env.SMTP_USER);

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.error('Missing SMTP environment variables!');
        return;
    }

    try {
        const result = await sendEmail({
            to: process.env.ADMIN_EMAIL || 'test@example.com',
            subject: 'SMTP Test Email',
            html: '<p>This is a test email from the SMTP test script.</p>'
        });
        console.log('Success:', result);
    } catch (e) {
        console.error('Failed:', e);
    }
}

test();
