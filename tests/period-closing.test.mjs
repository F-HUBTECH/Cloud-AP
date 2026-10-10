import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const root = new URL('../supabase/migrations/', import.meta.url);
const balanceSQL = await readFile(new URL('20261010000001_delphi_vendor_period_balance.sql', root), 'utf8');
const closingSQL = await readFile(new URL('20261011000001_period_closing.sql', root), 'utf8');
const vendor = '00000000-0000-0000-0000-000000000001';
const actor = '00000000-0000-0000-0000-000000000002';
const authUser = '00000000-0000-0000-0000-000000000003';
async function database() {
  const db = new PGlite();
  await db.waitReady;
  await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${authUser}'::uuid $$;
    CREATE FUNCTION is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.admin',true),'true')='true' $$;
    CREATE TABLE app_users(id uuid PRIMARY KEY,auth_uid uuid,is_active boolean);
    INSERT INTO app_users VALUES('${actor}','${authUser}',true);
    CREATE TABLE config(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_code text,period_year text,period_month text,updated_at timestamptz);
    CREATE TABLE vendors(id uuid PRIMARY KEY,code text UNIQUE,name_en text,name_th text,is_active boolean,total_amount numeric,total_payment numeric,open_amount numeric,deposit_balance numeric,
      ${Array.from({length:15},(_,i)=>`amt_${String(i+1).padStart(2,'0')} numeric DEFAULT 0,pay_${String(i+1).padStart(2,'0')} numeric DEFAULT 0`).join(',')});
    CREATE TABLE periods(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),period_year text,period_month text,date_from date,date_to date,closed boolean DEFAULT false,closed_at timestamptz,closed_by uuid REFERENCES app_users(id),UNIQUE(period_year,period_month));
    CREATE TABLE vendor_monthly_balances(id uuid DEFAULT gen_random_uuid(),vendor_id uuid REFERENCES vendors(id),period_year text,period_month text,open_amount numeric DEFAULT 0,open_balance numeric DEFAULT 0,inv_amount numeric,dr_amount numeric,paid_amount numeric,balance numeric,updated_at timestamptz,UNIQUE(vendor_id,period_year,period_month));
    CREATE TABLE month_end(id uuid DEFAULT gen_random_uuid(),supplier_code text,period_year text,period_month text,open_amount numeric DEFAULT 0,open_balance numeric DEFAULT 0,inv_amount numeric,dr_amount numeric,paid_amount numeric,balance numeric,updated_at timestamptz,UNIQUE(supplier_code,period_year,period_month));
    CREATE TABLE invoices(supplier_id uuid,supplier_code text,doc_date date,doc_number text,ap_type_code text,total_amount numeric,status text,period_year text,period_month text);
    CREATE TABLE payments(supplier_id uuid,supplier_code text,doc_date date,paid_at timestamptz,total_amount numeric,status text,period_year text,period_month text);
    CREATE TABLE deposit_payments(supplier_id uuid,remaining_amount numeric,status text);
    CREATE TABLE audit_logs(table_name text,record_id uuid,action text,performed_by uuid REFERENCES app_users(id),detail text,new_data jsonb);
    CREATE FUNCTION validate_period_can_close(text,text) RETURNS text LANGUAGE sql AS $$ SELECT NULL::text $$;
    INSERT INTO vendors(id,code,name_en,is_active,amt_12) VALUES('${vendor}','V001','Vendor',false,500);
    INSERT INTO config(company_code,period_year,period_month) VALUES('AP','2026','11');
    INSERT INTO periods(period_year,period_month,date_from,date_to) VALUES('2026','11','2026-11-01','2026-11-30'),('2026','12','2026-12-01','2026-12-31');
  `);
  await db.exec(balanceSQL);
  await db.exec(closingSQL);
  return db;
}
async function close(db, month) {
  return (await db.query(`SELECT close_ap_month(id) result FROM periods WHERE period_year='2026' AND period_month=$1`,[month])).rows[0].result;
}
async function config(db) { return (await db.query('SELECT period_year,period_month FROM config')).rows[0]; }
await test('Month End snapshots inactive vendors, advances config and leaves final month for Year End', async()=>{
  const db=await database();try {
    await db.exec(`INSERT INTO invoices VALUES('${vendor}','V001','2026-11-10','AP1',NULL,1000,'approved','2026','11');
      INSERT INTO payments VALUES('${vendor}','V001','2026-11-11','2026-11-11',200,'paid','2026','11');`);
    assert.equal((await close(db,'11')).vendorsProcessed,1);
    assert.deepEqual(await config(db),{period_year:'2026',period_month:'12'});
    const {rows}=await db.query('SELECT balance FROM month_end');assert.equal(Number(rows[0].balance),800);
    await close(db,'12'); assert.equal((await config(db)).period_month,'12');
    await assert.rejects(close(db,'12'),/already closed/);
  }finally{await db.close();}
});
await test('Reject future close and unfinished historical documents without changing state',async()=>{
  const db=await database();try {
    await assert.rejects(close(db,'12'),/current accounting period/);
    await db.exec(`INSERT INTO invoices VALUES('${vendor}','V001','2026-10-10','DRAFT',NULL,100,'draft','2026','10');`);
    await assert.rejects(close(db,'11'),/Unfinished/);
    assert.equal((await config(db)).period_month,'11');
    assert.equal((await db.query('SELECT count(*) n FROM month_end')).rows[0].n,0);
  }finally{await db.close();}
});
await test('Year End requires all months closed; archives and carries balances, fills missing next-year periods using correct dates',async()=>{
  const db=await database();try {
    await assert.rejects(db.query("SELECT close_ap_year('2026')"),/final period/);
    await db.exec(`INSERT INTO invoices VALUES('${vendor}','V001','2026-11-10','AP1',NULL,500,'posted','2026','11');`);
    await close(db,'11');
    await assert.rejects(db.query("SELECT close_ap_year('2026')"),/every period/);
    await close(db,'12');
    await db.exec("INSERT INTO periods(period_year,period_month,date_from,date_to) VALUES('2027','01','2027-01-01','2027-01-31');");
    const result=(await db.query("SELECT close_ap_year('2026') result")).rows[0].result;
    assert.equal(result.nextYearCreated,true);assert.equal(result.vendorsProcessed,1);
    assert.deepEqual(await config(db),{period_year:'2027',period_month:'01'});
    assert.equal((await db.query("SELECT count(*) n FROM periods WHERE period_year='2027'")).rows[0].n,12);
    assert.equal((await db.query("SELECT date_to::text d FROM periods WHERE period_year='2027' AND period_month='02'")).rows[0].d,'2027-02-28');
    const balance=(await db.query("SELECT open_balance FROM vendor_monthly_balances WHERE period_year='2027' AND period_month='01'")).rows[0];assert.equal(Number(balance.open_balance),500);
    const snapshot=(await db.query('SELECT vendor_snapshots FROM year_end_runs')).rows[0];assert.equal(snapshot.vendor_snapshots[0].amt_12,500);
    assert.equal(Number((await db.query('SELECT amt_12 FROM vendors')).rows[0].amt_12),0);
    await assert.rejects(db.query("SELECT close_ap_year('2026')"),/already closed/);
    await assert.rejects(db.query("SELECT reopen_ap_period(id) FROM periods WHERE period_year='2026' AND period_month='12'"),/Year End/);
  }finally{await db.close();}
});
await test('Database error rolls back snapshots, period close and config advancement together',async()=>{
  const db=await database();try {
    await db.exec("ALTER TABLE audit_logs ADD CONSTRAINT force_failure CHECK(false);");
    await assert.rejects(close(db,'11'),/force_failure/);
    assert.equal((await config(db)).period_month,'11');
    assert.equal((await db.query('SELECT count(*) n FROM month_end')).rows[0].n,0);
    assert.equal((await db.query('SELECT bool_or(closed) c FROM periods')).rows[0].c,false);
  }finally{await db.close();}
});
await test('Reopen only latest close and restore config; denied users cannot mutate',async()=>{
  const db=await database();try {
    await db.exec("SET test.admin='false';");await assert.rejects(close(db,'11'),/permission/);
    await db.exec("SET test.admin='true';");await close(db,'11');await close(db,'12');
    await assert.rejects(db.query("SELECT reopen_ap_period(id) FROM periods WHERE period_month='11'"),/later close/);
    await db.query("SELECT reopen_ap_period(id) FROM periods WHERE period_month='12'");
    assert.equal((await config(db)).period_month,'12');await close(db,'12');
  }finally{await db.close();}
});
await test('Summary uses selected month and closed snapshots, with year totals',async()=>{
  const db=await database();try {
    await db.exec(`INSERT INTO invoices VALUES('${vendor}','V001','2026-11-10','AP1',NULL,500,'posted','2026','11'),('${vendor}','V001','2026-12-10','AP2',NULL,100,'posted','2026','12');`);
    await close(db,'11');await close(db,'12');
    const nov=(await db.query("SELECT * FROM ap_period_summary('2026','11')")).rows[0];assert.equal(Number(nov.total_amount),500);
    const year=(await db.query("SELECT * FROM ap_period_summary('2026')")).rows[0];assert.equal(Number(year.total_amount),600);assert.equal(Number(year.balance),600);
  }finally{await db.close();}
});
await test('Year End failure rolls back archive, carry-forward, annual reset and next-year periods',async()=>{
  const db=await database();try {
    await close(db,'11');await close(db,'12');
    await db.exec("ALTER TABLE audit_logs ADD CONSTRAINT force_year_failure CHECK(action <> 'create');");
    await assert.rejects(db.query("SELECT close_ap_year('2026')"),/force_year_failure/);
    assert.deepEqual(await config(db),{period_year:'2026',period_month:'12'});
    assert.equal((await db.query("SELECT count(*) n FROM periods WHERE period_year='2027'")).rows[0].n,0);
    assert.equal(Number((await db.query('SELECT amt_12 FROM vendors')).rows[0].amt_12),500);
    assert.equal((await db.query('SELECT count(*) n FROM year_end_runs')).rows[0].n,0);
  }finally{await db.close();}
});
