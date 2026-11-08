import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterLogsByDate,
  isValidDateParam,
  isWeekday,
} from '../src/utils/date-utils.js';

test('weekday rule uses the Fortaleza calendar day', () => {
  assert.equal(isWeekday(new Date('2024-01-01T15:00:00.000Z')), true);
  assert.equal(isWeekday(new Date('2024-01-07T15:00:00.000Z')), false);
});

test('date parameter accepts real YYYY-MM-DD dates only', () => {
  assert.equal(isValidDateParam('2024-02-29'), true);
  assert.equal(isValidDateParam('2023-02-29'), false);
  assert.equal(isValidDateParam('2024-2-09'), false);
  assert.equal(isValidDateParam('09/02/2024'), false);
});

test('date filtering returns entries from the requested Fortaleza calendar day', () => {
  const logs = [
    { timestamp: new Date('2024-01-02T02:59:59.000Z'), path: '/jogos' },
    { timestamp: new Date('2024-01-02T03:00:00.000Z'), path: '/requisicoes' },
  ];

  assert.deepEqual(filterLogsByDate(logs, '2024-01-01'), [logs[0]]);
});
