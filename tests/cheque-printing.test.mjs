import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Execute the production TypeScript helpers without requiring a test bundler.
const require = createRequire(import.meta.url);
async function importTypeScript(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  });
  const resolved = outputText.replace('from "zod"', `from ${JSON.stringify(pathToFileURL(require.resolve('zod')).href)}`);
  return import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`);
}
const { chequeSatang, chequeAmountWords, chequeAmountNumber, chequeDateText, chequePrintIssues } = await importTypeScript('../src/modules/payment/cheque.ts');
const { DEFAULT_CHEQUE_LAYOUT, chequeLayoutIssues, chequeLayoutSchema } = await importTypeScript('../src/components/payments/cheque-layout.ts');

test('Thai amount words cover tens, final one, millions and satang', () => {
  const cases = [
    [1, 'หนึ่งบาทถ้วน'], [11, 'สิบเอ็ดบาทถ้วน'], [21, 'ยี่สิบเอ็ดบาทถ้วน'],
    [101, 'หนึ่งร้อยเอ็ดบาทถ้วน'], [1001, 'หนึ่งพันเอ็ดบาทถ้วน'],
    [1000000, 'หนึ่งล้านบาทถ้วน'], [1000001, 'หนึ่งล้านเอ็ดบาทถ้วน'],
    [0.01, 'ศูนย์บาทหนึ่งสตางค์'], [1.01, 'หนึ่งบาทหนึ่งสตางค์'],
    [1234.56, 'หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบหกสตางค์'],
    ['21.25', 'ยี่สิบเอ็ดบาทยี่สิบห้าสตางค์'],
  ];
  for (const [value, expected] of cases) assert.equal(chequeAmountWords(value), expected);
});

test('amounts remain exact and malformed money cannot be silently rounded', () => {
  assert.equal(chequeSatang('999999999.99'), 99999999999);
  assert.equal(chequeAmountNumber(1234.56), '**1,234.56**');
  assert.equal(chequeSatang(0.29), 29);
  for (const value of [null, 0, -1, NaN, Infinity, 1.001, 1000000000, '1e3', '1,000', '']) {
    assert.throws(() => chequeSatang(value), String(value));
  }
});

test('dates validate the calendar and support CE and BE without time-zone shifts', () => {
  assert.equal(chequeDateText('2026-10-11', true), '11/10/2569');
  assert.equal(chequeDateText('2026-10-11', false), '11/10/2026');
  assert.equal(chequeDateText('2024-02-29', false), '29/02/2024');
  for (const value of ['', '2026-02-29', '2026-13-01', '11/10/2026']) assert.equal(chequeDateText(value, false), '');
});

const valid = { status: 'approved', currency: 'THB', chequeNumber: '123456', chequeDate: '2026-10-11', payee: 'บริษัท ตัวอย่าง จำกัด', amount: 1234.56 };
test('actual cheques require eligible status and complete valid payment data', () => {
  assert.deepEqual(chequePrintIssues(valid), []);
  assert.deepEqual(chequePrintIssues({ ...valid, status: 'paid' }), []);
  for (const status of ['draft', 'pending_approval', 'rejected', 'cancelled', 'voided']) assert(chequePrintIssues({ ...valid, status }).length);
  for (const patch of [{ currency: 'USD' }, { chequeNumber: ' ' }, { chequeDate: '' }, { payee: '' }, { amount: null }]) assert(chequePrintIssues({ ...valid, ...patch }).length);
});

test('layout rejects off-paper fields, invalid persisted values and clipping after offsets', () => {
  assert.deepEqual(chequeLayoutIssues(DEFAULT_CHEQUE_LAYOUT), []);
  assert(chequeLayoutIssues({ ...DEFAULT_CHEQUE_LAYOUT, width: 120 }).length);
  assert(chequeLayoutIssues({ ...DEFAULT_CHEQUE_LAYOUT, offsetX: -30 }).length);
  assert(chequeLayoutIssues({ ...DEFAULT_CHEQUE_LAYOUT, offsetY: 30 }).length);
  assert.deepEqual(chequeLayoutIssues({ ...DEFAULT_CHEQUE_LAYOUT, paper: 'a4', offsetY: 80 }), []);
  assert.equal(chequeLayoutSchema.safeParse({ ...DEFAULT_CHEQUE_LAYOUT, width: '180; color:red' }).success, false);
  assert.equal(chequeLayoutSchema.safeParse({ version: 5 }).success, false);
});
