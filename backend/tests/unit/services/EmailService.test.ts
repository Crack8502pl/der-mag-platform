const mockVerify = jest.fn().mockResolvedValue(true);
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'message-1' });
const mockCreateTransport = jest.fn(() => ({
  verify: mockVerify,
  sendMail: mockSendMail,
}));

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: mockCreateTransport,
  },
}));

jest.mock('../../../src/config/email', () => ({
  isEmailConfigured: jest.fn().mockReturnValue(true),
  emailConfig: {
    smtp: {
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'smtp-user',
        pass: 'smtp-pass',
      },
    },
    from: {
      name: 'Grover Platform',
      address: 'noreply@example.com',
    },
    frontendUrl: 'https://frontend.example.com',
  },
}));

jest.mock('../../../src/services/EmailAutomationGuardService', () => ({
  __esModule: true,
  default: {
    filterAutomatedRecipients: jest.fn(),
  },
}));

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes a nodemailer transporter and verifies the SMTP connection', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { default: emailService } = await import('../../../src/services/EmailService');

    await emailService.initialize();

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'smtp-user',
        pass: 'smtp-pass',
      },
    });
    expect(mockVerify).toHaveBeenCalledTimes(1);

    logSpy.mockRestore();
  });

  it('sends email using the initialized transporter', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { default: emailService } = await import('../../../src/services/EmailService');
    const { EmailTemplate } = await import('../../../src/types/EmailTypes');

    await emailService.initialize();
    jest.spyOn(emailService as any, 'renderTemplate').mockResolvedValue('<p>Rendered</p>');

    await emailService.sendEmail({
      to: ['user1@example.com', 'user2@example.com'],
      subject: 'Test subject',
      template: EmailTemplate.USER_WELCOME,
      context: { firstName: 'Jan' },
      priority: 'high',
    });

    expect(mockSendMail).toHaveBeenCalledWith({
      from: '"Grover Platform" <noreply@example.com>',
      to: 'user1@example.com, user2@example.com',
      subject: 'Test subject',
      html: '<p>Rendered</p>',
      attachments: undefined,
      priority: 'high',
    });

    logSpy.mockRestore();
  });
});
