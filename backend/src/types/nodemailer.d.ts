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

  export interface SentMessageInfo {
    messageId: string;
    response?: string;
    [key: string]: unknown;
  }

  export interface Transporter {
    verify(): Promise<boolean>;
    sendMail(mailOptions: SendMailOptions): Promise<SentMessageInfo>;
  }

  export interface NodemailerStatic {
    createTransport(options: TransportOptions): Transporter;
  }

  const nodemailer: NodemailerStatic;

  export default nodemailer;
}
