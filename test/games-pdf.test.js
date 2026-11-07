import test from 'node:test';
import assert from 'node:assert/strict';
import { renderGamesPdf } from '../src/pdf/games-pdf.js';

async function collectPdf(games) {
  const chunks = [];

  for await (const chunk of renderGamesPdf(games)) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

test('games PDF starts with the PDF signature and ends with the EOF marker', async () => {
  const pdf = await collectPdf([
    { code: 'G001', title: 'Hades', price: 49.9, genre: 'Ação' },
  ]);

  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.match(pdf.toString('latin1').trimEnd(), /%%EOF$/);
});

test('games PDF renders an empty catalog', async () => {
  const pdf = await collectPdf([]);

  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.match(pdf.toString('latin1').trimEnd(), /%%EOF$/);
});
