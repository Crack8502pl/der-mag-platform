declare module 'nodemailer' {
  export interface TransportOptions {
    [key: string]: unknown;
  }

  export interface SendMailOptions {
    from?: string;
    to?: string | string[];
    subject?: string;
    html?: string;
    attachments?: unknown[];
    priority?: 'high' | 'normal' | 'low';
    [key: string]: unknown;
  }

  export interface Transporter {
    verify(): Promise<boolean>;
    sendMail(mailOptions: SendMailOptions): Promise<unknown>;
  }

  export function createTransport(options: TransportOptions): Transporter;

  const nodemailer: {
    createTransport: typeof createTransport;
  };

  export default nodemailer;
}
