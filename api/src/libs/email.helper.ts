import nodemailer from 'nodemailer';
import { Transporter, SendMailOptions } from 'nodemailer';

export default class EmailSender {
    private transporter: Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST, // Mailgun's SMTP host
            port: 587, // Port for Mailgun (587 for TLS)
            secure: false, // Use TLS but not SSL
            requireTLS: true, // Forces TLS for the connection
            auth: {
                user: process.env.MAILGUN_SMTP_USER, // Your Mailgun SMTP user
                pass: process.env.MAILGUN_SMTP_PASSWORD, // Your Mailgun SMTP password
            },
            logger: true, // Log information during sending
        });
    }

    async sendMail(to: string, subject: string, heading: string, body: string) {
        const html = this.createHtmlEmail(heading, body);

        const mailOptions: SendMailOptions = {
            from: `BAVA <${process.env.MAILGUN_SMTP_FROM || 'you@yourdomain.com'}>`, // Specify the sender's name and email
            to,
            subject,
            html,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Message sent: %s', info.messageId);
            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            return false;
        }
    }

    private createHtmlEmail(heading: string, body: string, footer = "BAVA"): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #fdf7ec;
                        color: #333333;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        background-color: #ffffff;
                        width: 90%;
                        max-width: 600px;
                        margin: 20px auto;
                        border-radius: 10px;
                        overflow: hidden;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                        border: 1px solid #e2d3b7;
                    }
                    .header {
                        background-color: #ffe5b4;
                        color: #333333;
                        text-align: center;
                        padding: 20px;
                        font-size: 24px;
                        font-weight: bold;
                    }
                    .body {
                        padding: 30px 20px;
                        color: #333333;
                        font-size: 16px;
                        line-height: 1.6;
                    }
                    .body p {
                        font-size: 14px;
                        margin: 0 0 10px;
                    }
                    .cta-button {
                        display: inline-block;
                        background-color: #ffcc66;
                        color: #333333;
                        padding: 10px 20px;
                        margin: 20px 0;
                        text-decoration: none;
                        font-weight: bold;
                        border-radius: 5px;
                        text-align: center;
                        transition: background-color 0.3s ease;
                    }
                    .cta-button:hover {
                        background-color: #e2b854;
                    }
                    .footer {
                        background-color: #ffe5b4;
                        color: #333333;
                        text-align: center;
                        padding: 15px;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        ${heading}
                    </div>
                    <div class="body">
                        ${body}
                        <p>Best regards,</p>
                        <p>${footer}</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
}
