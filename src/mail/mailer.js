import nodemailer from 'nodemailer';

export function createMailer({ smtp }) {
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });

  return {
    async send({ to, subject, text, html }) {
      await transport.sendMail({
        from: smtp.from,
        to,
        subject,
        text,
        html,
      });
    },
  };
}
