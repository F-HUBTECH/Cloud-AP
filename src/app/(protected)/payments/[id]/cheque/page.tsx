import Link from "next/link";
import { AppError } from "@/lib/errors";
import { loadChequePrintData } from "@/modules/payment/cheque.service";
import { ChequePrinter } from "@/components/payments/cheque-printer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Print Cheque | KSAP" };

export default async function ChequePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let payment;
  try {
    payment = await loadChequePrintData(id);
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    return <div className="card space-y-4 p-6"><h1 className="text-2xl font-bold">Print Cheque</h1><p role="alert">{error.message}</p><Link href="/payments" className="btn-outline">กลับไป Payments</Link></div>;
  }
  return <ChequePrinter payment={payment} />;
}
