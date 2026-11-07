import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestLogger } from '../src/middleware/request-logger.js';

test('request logger delegates persistence to the injected store', async () => {
  const entries = [];
  const requestLogs = {
    async create(entry) {
      entries.push(entry);
    },
  };

  const logger = createRequestLogger(requestLogs);
  let continued = false;

  await logger({ method: 'GET', path: '/jogos' }, {}, () => {
    continued = true;
  });

  assert.equal(continued, true);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].method, 'GET');
  assert.equal(entries[0].path, '/jogos');
  assert.match(entries[0].timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
});
