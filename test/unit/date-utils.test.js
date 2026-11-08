import { describe, expect, test } from '@jest/globals';
import {
  TIME_ZONE,
  filterLogsByDate,
  isValidDateParam,
  isWeekday,
} from '../../src/utils/date-utils.js';

describe('isWeekday', () => {
  test('identifica dias úteis e o fim de semana', () => {
    expect(isWeekday(new Date('2024-01-08T15:00:00.000Z'))).toBe(true);
    expect(isWeekday(new Date('2024-01-05T15:00:00.000Z'))).toBe(true);
    expect(isWeekday(new Date('2024-01-06T15:00:00.000Z'))).toBe(false);
    expect(isWeekday(new Date('2024-01-07T15:00:00.000Z'))).toBe(false);
  });

  test('considera a virada do dia no fuso America/Fortaleza', () => {
    expect(TIME_ZONE).toBe('America/Fortaleza');
    expect(isWeekday(new Date('2024-01-06T02:59:59.000Z'))).toBe(true);
    expect(isWeekday(new Date('2024-01-06T03:00:00.000Z'))).toBe(false);
    expect(isWeekday(new Date('2024-01-08T02:59:59.000Z'))).toBe(false);
    expect(isWeekday(new Date('2024-01-08T03:00:00.000Z'))).toBe(true);
  });
});

describe('isValidDateParam', () => {
  test.each(['2024-01-01', '2024-02-29', '2024-12-31'])('aceita a data %s', (value) => {
    expect(isValidDateParam(value)).toBe(true);
  });

  test.each([
    '2023-02-29',
    '2024-13-01',
    '2024-00-10',
    '2024-01-32',
    '2024-1-01',
    '01/01/2024',
    '',
    null,
    undefined,
    20240101,
  ])('rejeita o valor %p', (value) => {
    expect(isValidDateParam(value)).toBe(false);
  });
});

describe('filterLogsByDate', () => {
  test('filtra pelo dia local sem alterar a lista original', () => {
    const januaryFirst = {
      timestamp: new Date('2024-01-02T02:59:59.000Z'),
      path: '/jogos',
    };
    const januarySecond = {
      timestamp: new Date('2024-01-02T03:00:00.000Z'),
      path: '/requisicoes',
    };
    const logs = [januaryFirst, januarySecond];

    expect(filterLogsByDate(logs, '2024-01-01')).toEqual([januaryFirst]);
    expect(logs).toHaveLength(2);
  });

  test('retorna lista vazia quando nada corresponde à data', () => {
    expect(filterLogsByDate([], '2024-01-01')).toEqual([]);
    expect(filterLogsByDate([
      { timestamp: new Date('2024-02-01T12:00:00.000Z'), path: '/jogos' },
    ], '2024-01-01')).toEqual([]);
  });
});
