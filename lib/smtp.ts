
import nodemailer from 'nodemailer';

interface SendEmailParams {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailParams) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const mailOptions = {
        from: from || process.env.SMTP_FROM || process.env.SMTP_USER, // Fallback to user if FROM not set
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email via SMTP:', error);
        throw error; // Re-throw to be handled by caller
    }
}
