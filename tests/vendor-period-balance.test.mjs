import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const vendor = '4404868e-47e7-4052-8464-a3711421d681';
const otherVendor = '00000000-0000-0000-0000-000000000002';
const migration = await readFile(new URL('../supabase/migrations/20261010000001_delphi_vendor_period_balance.sql', import.meta.url), 'utf8');

async function database() {
  const db = new PGlite();
  await db.waitReady;
  // Only the columns used by this migration; the SQL itself runs in PostgreSQL.
  await db.exec(`
    CREATE TABLE vendors (id uuid PRIMARY KEY, code text, total_amount numeric,
      total_payment numeric, open_amount numeric, deposit_balance numeric);
    CREATE TABLE config (period_year text, period_month text);
    CREATE TABLE periods (period_year text, period_month text, closed boolean);
    CREATE TABLE vendor_monthly_balances (vendor_id uuid, period_year text,
      period_month text, open_balance numeric DEFAULT 0, balance numeric);
    CREATE TABLE month_end (supplier_code text, period_year text,
      period_month text, balance numeric, open_balance numeric DEFAULT 0);
    CREATE TABLE invoices (supplier_id uuid, supplier_code text, doc_date date,
      doc_number text, ap_type_code text, total_amount numeric, status text);
    CREATE TABLE payments (supplier_id uuid, supplier_code text, doc_date date,
      paid_at timestamptz, total_amount numeric, total_net numeric, status text);
    CREATE TABLE deposit_payments (supplier_id uuid, remaining_amount numeric, status text);
    INSERT INTO vendors (id,code) VALUES ('${vendor}','V002'), ('${otherVendor}','V003');
    INSERT INTO config VALUES ('2026','10');
  `);
  await db.exec(migration);
  return db;
}

async function summary(db, year = '2026', month = '10') {
  const { rows } = await db.query('SELECT * FROM vendor_period_balance($1,$2,$3)', [vendor, year, month]);
  return Object.fromEntries(Object.entries(rows[0]).map(([key, value]) => [key, Number(value)]));
}

await test('V002: an approved voucher with NULL AP type and a paid payment settle to zero', async () => {
  const db = await database();
  try {
    await db.exec(`
      INSERT INTO invoices VALUES ('${vendor}','V002','2026-10-09','APV00029',NULL,1000,'approved');
      INSERT INTO payments VALUES ('${vendor}','V002','2026-10-09','2026-10-09',1000,1000,'paid');
    `);
    assert.deepEqual(await summary(db), { opening_balance: 0, invoiced: 1000, debit_notes: 0, paid: 1000, outstanding: 0 });
    const { rows } = await db.query('SELECT total_amount,total_payment,open_amount FROM vendors WHERE id=$1', [vendor]);
    assert.deepEqual(Object.values(rows[0]).map(Number), [1000, 1000, 0]);
  } finally { await db.close(); }
});

await test('Delphi month-end: opening + charges - debit notes - gross settlement; exclude drafts and cancellations', async () => {
  const db = await database();
  try {
    await db.exec(`
      INSERT INTO periods VALUES ('2026','09',true);
      INSERT INTO vendor_monthly_balances VALUES ('${vendor}','2026','09',0,500);
      INSERT INTO invoices VALUES
        ('${vendor}','V002','2026-09-10','OLD','APV',9000,'approved'),
        ('${vendor}','V002','2026-10-01','APV01','N',1000,'approved'),
        ('${vendor}','V002','2026-10-02','ADN01','ADN',200,'posted'),
        ('${vendor}','V002','2026-10-03','DR02','DR',-50,'approved'),
        ('${vendor}','V002','2026-10-04','DRAFT','APV',5000,'draft'),
        ('${vendor}','V002','2026-10-04','PENDING','APV',5000,'pending_approval'),
        ('${vendor}','V002','2026-10-04','VOID','APV',5000,'voided'),
        ('${vendor}','V002','2026-10-04','REJECT','APV',5000,'rejected'),
        ('${vendor}','V002','2026-11-01','FUTURE','APV',5000,'approved');
      INSERT INTO payments VALUES
        ('${vendor}','V002','2026-10-05','2026-10-05',1000,970,'paid'),
        ('${vendor}','V002','2026-10-05','2026-10-05',999,999,'cancelled');
    `);
    assert.deepEqual(await summary(db), { opening_balance: 500, invoiced: 1000, debit_notes: 250, paid: 1000, outstanding: 250 });
    await db.exec("SELECT recalculate_vendor_balance('V002'); SELECT recalculate_vendor_balance('V002');");
    const { rows } = await db.query('SELECT open_amount FROM vendors WHERE id=$1', [vendor]);
    assert.equal(Number(rows[0].open_amount), 250);
  } finally { await db.close(); }
});

await test('carry forward across a year boundary and a gap without double counting a closed snapshot', async () => {
  const db = await database();
  try {
    await db.exec(`
      INSERT INTO periods VALUES ('2025','12',true);
      INSERT INTO month_end (supplier_code,period_year,period_month,balance) VALUES ('V002','2025','12',800);
      INSERT INTO invoices VALUES
        ('${vendor}','V002','2025-12-20','OLD','APV',9999,'approved'),
        ('${vendor}','V002','2026-01-10','JAN','APV',200,'approved'),
        ('${vendor}','V002','2026-02-10','FEB','APV',300,'approved');
      INSERT INTO payments VALUES ('${vendor}','V002','2026-01-10','2026-01-10',100,100,'paid');
    `);
    assert.equal((await summary(db, '2026', '01')).opening_balance, 800);
    assert.deepEqual(await summary(db, '2026', '02'), { opening_balance: 900, invoiced: 300, debit_notes: 0, paid: 0, outstanding: 1200 });
  } finally { await db.close(); }
});

await test('without snapshots, historical movements supply the opening; settlement uses the actual payment date in Bangkok', async () => {
  const db = await database();
  try {
    await db.exec(`
      INSERT INTO invoices VALUES ('${vendor}','V002','2026-09-10','OLD',NULL,1500,'approved');
      INSERT INTO vendor_monthly_balances VALUES ('${vendor}','2026','10',0,0);
      INSERT INTO payments VALUES ('${vendor}','V002','2026-09-20','2026-09-30T18:00:00Z',1000,970,'paid');
    `);
    assert.deepEqual(await summary(db), { opening_balance: 1500, invoiced: 0, debit_notes: 0, paid: 1000, outstanding: 500 });
  } finally { await db.close(); }
});

await test('preserve imported opening and refresh both suppliers after a move, cancellation, or deletion', async () => {
  const db = await database();
  try {
    await db.exec(`
      INSERT INTO vendor_monthly_balances VALUES ('${vendor}','2026','10',250,250);
      INSERT INTO invoices VALUES ('${vendor}','V002','2026-10-09','APV01',NULL,1000,'approved');
    `);
    assert.equal((await summary(db)).outstanding, 1250);
    await db.exec(`UPDATE invoices SET supplier_id='${otherVendor}',supplier_code='V003';`);
    let { rows } = await db.query('SELECT code,open_amount FROM vendors ORDER BY code');
    assert.deepEqual(rows.map(row => Number(row.open_amount)), [250, 1000]);
    await db.exec("UPDATE invoices SET status='cancelled';");
    ({ rows } = await db.query('SELECT open_amount FROM vendors WHERE id=$1', [otherVendor]));
    assert.equal(Number(rows[0].open_amount), 0);
    await db.exec("UPDATE invoices SET status='approved'; DELETE FROM invoices;");
    ({ rows } = await db.query('SELECT open_amount FROM vendors WHERE id=$1', [otherVendor]));
    assert.equal(Number(rows[0].open_amount), 0);
  } finally { await db.close(); }
});
