import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const root = new URL('../supabase/migrations/', import.meta.url);
const initial = await readFile(new URL('00001_initial_schema.sql', root), 'utf8');
const journalSQL = await readFile(new URL('20260421000002_journal_entries_and_audit.sql', root), 'utf8');
const balanceSQL = await readFile(new URL('20261010000001_delphi_vendor_period_balance.sql', root), 'utf8');
const transferSQL = await readFile(new URL('20261011000002_ap_voucher_transfers.sql', root), 'utf8');
const ids = Array.from({length: 6}, (_, i) => `00000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`);
const [actor, authUser, source, dest, invoice, payment] = ids;
function table(sql, name) {
  return sql.match(new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?${name} \\([\\s\\S]*?\\n\\);`))[0]
    .replace(/\b(app_currency|vat_type|invoice_status|payment_method|payment_status)\b(?=\s+DEFAULT|\s+NOT|,)/g, 'text');
}
async function database() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${authUser}'::uuid $$;
    CREATE FUNCTION can_create(text) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.allowed',true),'true')='true' $$;
    CREATE FUNCTION can_delete(text) RETURNS boolean LANGUAGE sql AS $$ SELECT can_create($1) $$;
    CREATE TABLE app_users(id uuid PRIMARY KEY,auth_uid uuid,is_active boolean);
    INSERT INTO app_users VALUES('${actor}','${authUser}',true);
    CREATE TABLE vendors(id uuid PRIMARY KEY,code varchar(20) UNIQUE,is_active boolean DEFAULT true,total_amount numeric,total_payment numeric,open_amount numeric,deposit_balance numeric);
    INSERT INTO vendors(id,code) VALUES('${source}','V001'),('${dest}','V002');
    CREATE TABLE config(company_code text,period_year text,period_month text,acc_trade text);
    INSERT INTO config VALUES('AP','2026','11','2000');
    CREATE TABLE periods(id uuid DEFAULT gen_random_uuid(),period_year varchar(4),period_month varchar(2),date_from date,date_to date,closed boolean DEFAULT false);
    INSERT INTO periods(period_year,period_month,date_from,date_to) VALUES('2026','10','2026-10-01','2026-10-31'),('2026','11','2026-11-01','2026-11-30');
    CREATE TABLE vendor_monthly_balances(vendor_id uuid,period_year text,period_month text,open_balance numeric,balance numeric);
    CREATE TABLE month_end(supplier_code text,period_year text,period_month text,open_balance numeric,balance numeric);
    CREATE TABLE deposit_payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),supplier_id uuid,remaining_amount numeric,status text);
    CREATE TABLE deposit_applications(id uuid DEFAULT gen_random_uuid(),deposit_id uuid,invoice_id uuid,amount_applied numeric,status text);
    CREATE SEQUENCE doc_seq;
    CREATE FUNCTION next_doc_number(varchar,varchar,varchar,varchar,integer) RETURNS varchar LANGUAGE sql AS $$ SELECT $4||nextval('doc_seq')::text $$;
  `);
  for (const name of ['invoices','invoice_items','payments','payment_invoices','transfers']) await db.exec(table(initial,name));
  for (const name of ['journal_entries','journal_entry_lines','audit_logs']) await db.exec(table(journalSQL,name));
  await db.exec(balanceSQL);
  await db.exec(transferSQL);
  await db.exec(`INSERT INTO invoices(id,doc_number,doc_date,supplier_id,supplier_code,total_amount,balance,status,due_date)
    VALUES('${invoice}','AP001','2026-10-05','${source}','V001',1000,1000,'approved','2026-11-30');`);
  return db;
}
async function transfer(db, id=invoice) {
  return (await db.query("SELECT * FROM transfer_ap_voucher($1,$2,'2026-11-05','Correct vendor')",[id,dest])).rows[0];
}
async function balance(db, vendor, month) {
  return (await db.query("SELECT * FROM vendor_period_balance($1,'2026',$2)",[vendor,month])).rows[0];
}
await test('Transfers full voucher, preserves historical balances and produces linked audit/GL records; cancellation restores balances', async()=>{
  const db=await database(); try {
    const t=await transfer(db);
    assert.equal(Number(t.amount),1000);
    assert.equal(t.source_invoice_id,invoice);
    assert.equal(Number((await balance(db,source,'10')).outstanding),1000);
    assert.equal(Number((await balance(db,source,'11')).outstanding),0);
    assert.equal(Number((await balance(db,dest,'11')).outstanding),1000);
    const {rows}=await db.query('SELECT balance,paid_amount FROM invoices WHERE id=$1',[invoice]);
    assert.equal(Number(rows[0].balance),0); assert.equal(Number(rows[0].paid_amount),0);
    assert.equal((await db.query('SELECT count(*) n FROM journal_entry_lines')).rows[0].n,2);
    assert.equal((await db.query('SELECT count(*) n FROM audit_logs')).rows[0].n,1);
    await assert.rejects(transfer(db),/full unpaid|already transferred/);
    await assert.rejects(db.query("UPDATE invoices SET status='cancelled' WHERE id=$1",[invoice]),/Cancel the voucher transfer/);
    await db.query('SELECT cancel_ap_voucher_transfer($1)',[t.id]);
    assert.equal(Number((await balance(db,source,'11')).outstanding),1000);
    assert.equal(Number((await balance(db,dest,'11')).outstanding),0);
    assert.equal(Number((await db.query('SELECT balance FROM invoices WHERE id=$1',[invoice])).rows[0].balance),1000);
    await assert.rejects(db.query("UPDATE invoices SET status='posted' WHERE id=$1",[t.destination_invoice_id]),/Manage this voucher/);
    await assert.rejects(db.query('SELECT cancel_ap_voucher_transfer($1)',[t.id]),/already cancelled/);
  } finally {await db.close();}
});
await test('Reject paid, partial, allocated and deposited vouchers, same vendor, invalid date and closed period',async()=>{
 const db=await database();try {
  await db.exec(`UPDATE invoices SET doc_number='ADN001' WHERE id='${invoice}'`);
  await assert.rejects(transfer(db),/full unpaid/);
  await db.exec(`UPDATE invoices SET doc_number='AP001' WHERE id='${invoice}'`);
  await db.exec(`UPDATE invoices SET paid_amount=1 WHERE id='${invoice}'`);
  await assert.rejects(transfer(db),/full unpaid/);
  await db.exec(`UPDATE invoices SET paid_amount=0,balance=500 WHERE id='${invoice}'`);
  await assert.rejects(transfer(db),/full unpaid/);
  await db.exec(`UPDATE invoices SET balance=1000 WHERE id='${invoice}'; INSERT INTO payments(id,doc_number,doc_date,supplier_id,supplier_code,status) VALUES('${payment}','PAY1','2026-11-01','${source}','V001','draft'); INSERT INTO payment_invoices(payment_id,invoice_id) VALUES('${payment}','${invoice}');`);
  await assert.rejects(transfer(db),/assigned to a payment/);
  await db.exec(`UPDATE payments SET status='cancelled' WHERE id='${payment}'; INSERT INTO deposit_applications(invoice_id,status) VALUES('${invoice}','active');`);
  await assert.rejects(transfer(db),/deposit application/);
  await db.exec("UPDATE deposit_applications SET status='cancelled'");
  await assert.rejects(db.query("SELECT transfer_ap_voucher($1,$2,'2026-11-05','Reason')",[invoice,source]),/same/);
  await assert.rejects(db.query("SELECT transfer_ap_voucher($1,$2,'2026-10-01','Reason')",[invoice,dest]),/precede/);
  await db.exec("UPDATE periods SET closed=true WHERE period_month='11'");
  await assert.rejects(transfer(db),/open accounting period/);
 } finally {await db.close();}
});
await test('Reject stale source allocations and block cancellation after destination allocation',async()=>{
 const db=await database();try {
  const t=await transfer(db);
  await db.exec(`INSERT INTO payments(id,doc_number,doc_date,supplier_id,supplier_code,status) VALUES('${payment}','PAY1','2026-11-01','${dest}','V002','draft')`);
  await assert.rejects(db.query('INSERT INTO payment_invoices(payment_id,invoice_id) VALUES($1,$2)',[payment,invoice]),/transferred/);
  await db.query('INSERT INTO payment_invoices(payment_id,invoice_id) VALUES($1,$2)',[payment,t.destination_invoice_id]);
  await assert.rejects(db.query('SELECT cancel_ap_voucher_transfer($1)',[t.id]),/assigned/);
  await db.exec("UPDATE payments SET status='cancelled'; UPDATE periods SET closed=true WHERE period_month='11'");
  await assert.rejects(db.query('SELECT cancel_ap_voucher_transfer($1)',[t.id]),/closed/);
 } finally {await db.close();}
});
await test('Permission and downstream errors roll back the whole transfer',async()=>{
 const db=await database();try {
  await db.exec("SET test.allowed='false'"); await assert.rejects(transfer(db),/permission/);
  await db.exec("SET test.allowed='true'; ALTER TABLE audit_logs ADD CONSTRAINT force_failure CHECK(false)");
  await assert.rejects(transfer(db),/force_failure/);
  assert.equal((await db.query('SELECT count(*) n FROM transfers')).rows[0].n,0);
  assert.equal((await db.query('SELECT count(*) n FROM invoices')).rows[0].n,1);
  assert.equal((await db.query('SELECT count(*) n FROM journal_entries')).rows[0].n,0);
  assert.equal(Number((await db.query('SELECT balance FROM invoices')).rows[0].balance),1000);
 } finally {await db.close();}
});
await test('Destination can be transferred onward; cancellation must follow reverse order',async()=>{
 const db=await database();try {
  const first=await transfer(db);
  const second=(await db.query("SELECT * FROM transfer_ap_voucher($1,$2,'2026-11-06','Return to original vendor')",[first.destination_invoice_id,source])).rows[0];
  await assert.rejects(db.query('SELECT cancel_ap_voucher_transfer($1)',[first.id]),/full unpaid|already transferred/);
  await db.query('SELECT cancel_ap_voucher_transfer($1)',[second.id]);
  await db.query('SELECT cancel_ap_voucher_transfer($1)',[first.id]);
  assert.equal(Number((await balance(db,source,'11')).outstanding),1000);
  assert.equal(Number((await balance(db,dest,'11')).outstanding),0);
 } finally {await db.close();}
});
await test('Failed cancellation rolls back all voucher, journal and transfer changes',async()=>{
 const db=await database();try {
  const t=await transfer(db);
  await db.exec("ALTER TABLE audit_logs ADD CONSTRAINT reject_cancel CHECK(action<>'cancel')");
  await assert.rejects(db.query('SELECT cancel_ap_voucher_transfer($1)',[t.id]),/reject_cancel/);
  assert.equal((await db.query('SELECT status FROM transfers WHERE id=$1',[t.id])).rows[0].status,'active');
  assert.equal(Number((await db.query('SELECT balance FROM invoices WHERE id=$1',[invoice])).rows[0].balance),0);
  assert.equal((await db.query('SELECT cancelled FROM journal_entries')).rows[0].cancelled,false);
  assert.equal(Number((await balance(db,dest,'11')).outstanding),1000);
  await assert.rejects(db.query('DELETE FROM invoices WHERE id=$1',[t.destination_invoice_id]),/retained/);
  await assert.rejects(db.query("INSERT INTO invoice_items(invoice_id,line_no,description) VALUES($1,1,'Edited')",[t.destination_invoice_id]),/cannot be changed/);
 } finally {await db.close();}
});
