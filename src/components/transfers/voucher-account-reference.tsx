import Link from "next/link";
import { formatCurrency } from "@/lib/utils/format";
import type { VoucherAccountReference } from "@/modules/transfer/voucher-account-reference";

export function VoucherAccountReferenceDetails({ reference }: { reference: VoucherAccountReference }) {
  return (
    <section className="card" aria-label="Source voucher accounting reference">
      <div className="space-y-2 border-b px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Source Voucher Details / รายละเอียดต้นฉบับ</h2>
          <Link href={`/postings/${reference.invoiceId}`} className="text-sm text-primary hover:underline">
            {reference.docNumber}
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Account Code และยอด Debit/Credit ในตารางนี้เป็นข้อมูลอ้างอิงจาก voucher ต้นฉบับ
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-12">#</th>
              <th>Account Code</th>
              <th>Description</th>
              <th className="text-right">Original Debit</th>
              <th className="text-right">Original Credit</th>
            </tr>
          </thead>
          <tbody>
            {reference.lines.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">ต้นฉบับไม่มีรายละเอียดบัญชี</td></tr>
            ) : reference.lines.map((line) => (
              <tr key={line.id}>
                <td className="text-center text-muted-foreground">{line.lineNo}</td>
                <td className="font-medium">{line.accountCode || "—"}</td>
                <td className="text-muted-foreground">{line.description || "—"}</td>
                <td className="text-right tabular-nums">{formatCurrency(line.debit)}</td>
                <td className="text-right tabular-nums">{formatCurrency(line.credit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
