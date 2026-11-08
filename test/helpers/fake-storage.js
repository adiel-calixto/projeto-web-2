import { jest } from '@jest/globals';

export function createFakeStorage(publicBaseUrl = 'https://fake-s3.test') {
  const objects = new Map();
  const baseUrl = publicBaseUrl.replace(/\/+$/, '');

  return {
    objects,
    upload: jest.fn(async ({ key, body, contentType }) => {
      objects.set(key, { body, contentType });
      return { url: `${baseUrl}/${key}` };
    }),
    deleteByUrl: jest.fn(async (url) => {
      if (url?.startsWith(`${baseUrl}/`)) {
        objects.delete(url.slice(baseUrl.length + 1));
      }
    }),
  };
}
