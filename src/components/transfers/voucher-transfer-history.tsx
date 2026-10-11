"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils/format";

interface HistoryRow {
  id: string;
  doc_number: string;
  transfer_date: string;
  from_vendor_code: string;
  to_vendor_code: string;
  source_invoice_id: string;
  destination_invoice_id: string;
  adjustment_invoice_id: string;
  amount: number;
  remark: string;
  status: string;
}

export function VoucherTransferHistory({ invoiceId }: { invoiceId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setRows([]);
    setFailed(false);
    supabase.from("transfers").select("*")
      .or(`source_invoice_id.eq.${invoiceId},destination_invoice_id.eq.${invoiceId},adjustment_invoice_id.eq.${invoiceId}`)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => { if (active) { setRows((data ?? []) as HistoryRow[]); setFailed(Boolean(error)); } });
    return () => { active = false; };
  }, [invoiceId, supabase]);
  if (failed) return <p role="alert" className="text-sm text-destructive">Transfer history could not be loaded.</p>;
  if (!rows.length) return null;
  return <section className="card space-y-4 p-5" aria-label="Voucher transfer history">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Transfer history</h2><Link href="/transfers" className="text-sm text-primary hover:underline">Manage transfers</Link></div>
    {rows.map((row) => <div key={row.id} className="space-y-2 border-t pt-3 text-sm">
      <p className="font-medium">{row.doc_number} · {formatDate(row.transfer_date)} <span className={row.status === "active" ? "badge-success" : "badge-danger"}>{row.status}</span></p>
      <p>{row.from_vendor_code} → {row.to_vendor_code} · {formatCurrency(Number(row.amount))}</p>
      <p className="text-muted-foreground">{row.remark}</p>
      <div className="flex flex-wrap gap-4 text-primary">
        <Link className="hover:underline" href={`/postings/${row.source_invoice_id}`}>Source voucher</Link>
        <Link className="hover:underline" href={`/postings/${row.adjustment_invoice_id}`}>Source adjustment</Link>
        <Link className="hover:underline" href={`/postings/${row.destination_invoice_id}`}>Destination voucher</Link>
      </div>
    </div>)}
  </section>;
}
