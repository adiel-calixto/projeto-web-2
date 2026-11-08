import { jest } from '@jest/globals';

export function createFakeMailer() {
  const sent = [];

  return {
    sent,
    send: jest.fn(async (mail) => {
      sent.push(mail);
    }),
  };
}
