import nodemailer from 'nodemailer';

interface MailOptions {
    to: string;
    subject: string;
    html: string;
    senderName?: string;
    data?: Record<string, any>;
}

/**
 * Replaces all {{key}} placeholders with corresponding values from data object.
 */
export function renderEmailTemplate(html: string, data: Record<string, any> = {}): string {
    return html.replace(/\{\{(.*?)\}\}/g, (match, key) => {
        const trimmedKey = key.trim();
        return data[trimmedKey] !== undefined ? String(data[trimmedKey]) : match;
    });
}

/**
 * Sends a transactional email with retry logic.
 */
export async function sendTransactionalEmail(options: MailOptions): Promise<{ success: boolean; messageId?: string }> {
    const { to, subject, html, senderName, data = {} } = options;

    // Render template with data
    const renderedHtml = renderEmailTemplate(html, data);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_PORT === '465',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const from = senderName
        ? `${senderName} <${process.env.SMTP_USER}>`
        : `${process.env.SMTP_SENDER_DEFAULT || 'TALPA'} <${process.env.SMTP_USER}>`;

    const mailOptions = {
        from,
        to,
        subject,
        html: renderedHtml,
    };

    const MAX_RETRIES = 3;
    let attempt = 0;
    let lastError: any = null;

    while (attempt < MAX_RETRIES) {
        attempt++;
        try {
            console.log(`[SMTP] Attempt ${attempt} to send email to ${to}...`);
            const info = await transporter.sendMail(mailOptions);
            console.log(`[SMTP] Success! Message ID: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            lastError = error;
            console.error(`[SMTP] Attempt ${attempt} failed:`, error instanceof Error ? error.message : error);

            if (attempt < MAX_RETRIES) {
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s
                console.log(`[SMTP] Retrying in ${delay / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    console.error(`[SMTP] All ${MAX_RETRIES} attempts failed for ${to}.`);
    // Throw explicit error to halt application process as requested
    throw new Error(`Failed to deliver transactional email to ${to} after ${MAX_RETRIES} attempts. Last error: ${lastError?.message || lastError}`);
}
