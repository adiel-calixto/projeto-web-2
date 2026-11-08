import { describe, expect, jest, test } from '@jest/globals';
import {
  DeleteObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { createS3Storage } from '../../src/storage/s3-storage.js';

function createStorage(client = { send: jest.fn().mockResolvedValue({}) }) {
  return {
    client,
    storage: createS3Storage({
      bucket: 'bucket-de-teste',
      region: 'sa-east-1',
      publicBaseUrl: 'https://capas.test/',
      client,
    }),
  };
}

describe('createS3Storage', () => {
  test('envia o objeto e devolve a URL pública', async () => {
    const { client, storage } = createStorage();
    const body = Buffer.from('imagem');

    await expect(storage.upload({
      key: 'games/G001/foto.png',
      body,
      contentType: 'image/png',
    })).resolves.toEqual({ url: 'https://capas.test/games/G001/foto.png' });

    expect(client.send).toHaveBeenCalledTimes(1);
    const command = client.send.mock.calls[0][0];

    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'bucket-de-teste',
      Key: 'games/G001/foto.png',
      Body: body,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    });
  });

  test('apaga apenas objetos da base pública configurada', async () => {
    const { client, storage } = createStorage();

    await storage.deleteByUrl('https://capas.test/games/G001/foto.png');

    const command = client.send.mock.calls[0][0];
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'bucket-de-teste',
      Key: 'games/G001/foto.png',
    });
  });

  test.each([
    ['URL de outro domínio', 'https://outro.test/games/G001/foto.png'],
    ['URL vazia', null],
    ['apenas a base', 'https://capas.test'],
  ])('ignora %s', async (_label, url) => {
    const { client, storage } = createStorage();

    await storage.deleteByUrl(url);

    expect(client.send).not.toHaveBeenCalled();
  });
});
