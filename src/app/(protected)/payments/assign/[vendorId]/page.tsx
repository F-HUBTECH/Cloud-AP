"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createPayment } from "@/modules/payment/payment.actions";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ArrowLeft, Save, Loader2, Check } from "lucide-react";
import Link from "next/link";

interface Vendor {
  id: string;
  code: string;
  name_en: string;
  name_th: string | null;
}

interface OutstandingInvoice {
  id: string;
  doc_number: string;
  doc_date: string;
  inv_number: string | null;
  total_amount: number;
  paid_amount: number;
  balance: number;
  selected: boolean;
  pay_amount: number;
}

export default function AssignPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const vendorId = params.vendorId as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [invoices, setInvoices] = useState<OutstandingInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [header, setHeader] = useState({
    doc_date: new Date().toISOString().slice(0, 10),
    pay_method: "cheque",
    cheque_number: "",
    bank_code: "",
    bank_name: "",
    remark: "",
  });

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const { data: vendorData } = await supabase
        .from("vendors")
        .select("id, code, name_en, name_th")
        .eq("id", vendorId)
        .single();

      if (vendorData) {
        setVendor(vendorData as Vendor);
      }

      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("id, doc_number, doc_date, inv_number, total_amount, paid_amount, balance")
        .eq("supplier_id", vendorId)
        .in("status", ["approved", "posted"])
        .gt("balance", 0)
        .order("doc_date");

      if (invoiceData) {
        setInvoices(
          invoiceData.map((inv) => ({
            ...inv,
            total_amount: Number(inv.total_amount) || 0,
            paid_amount: Number(inv.paid_amount) || 0,
            balance: Number(inv.balance) || 0,
            selected: false,
            pay_amount: 0,
          }))
        );
      }

      setIsLoading(false);
    }

    fetchData();
  }, [vendorId]);

  const toggleInvoice = useCallback((index: number) => {
    setInvoices((prev) =>
      prev.map((inv, i) => {
        if (i !== index) return inv;
        const selected = !inv.selected;
        return {
          ...inv,
          selected,
          pay_amount: selected ? inv.balance : 0,
        };
      })
    );
  }, []);

  const updatePayAmount = useCallback((index: number, amount: number) => {
    setInvoices((prev) =>
      prev.map((inv, i) =>
        i === index ? { ...inv, pay_amount: Math.min(amount, inv.balance) } : inv
      )
    );
  }, []);

  const selectAll = useCallback(() => {
    setInvoices((prev) =>
      prev.map((inv) => ({
        ...inv,
        selected: true,
        pay_amount: inv.balance,
      }))
    );
  }, []);

  const deselectAll = useCallback(() => {
    setInvoices((prev) =>
      prev.map((inv) => ({
        ...inv,
        selected: false,
        pay_amount: 0,
      }))
    );
  }, []);

  const totalPayAmount = invoices
    .filter((inv) => inv.selected)
    .reduce((sum, inv) => sum + inv.pay_amount, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const selectedInvoices = invoices.filter((inv) => inv.selected && inv.pay_amount > 0);
    if (selectedInvoices.length === 0) {
      setError("Please select at least one invoice to pay");
      return;
    }

    if (!vendor) {
      setError("Vendor not found");
      return;
    }

    setIsSaving(true);

    try {
      const result = await createPayment({
        doc_date: header.doc_date,
        supplier_code: vendor.code,
        supplier_id: vendor.id,
        pay_method: header.pay_method,
        cheque_number: header.cheque_number || undefined,
        cheque_date: header.pay_method === "cheque" ? header.doc_date : undefined,
        bank_code: header.bank_code || undefined,
        bank_name: header.bank_name || undefined,
        remark: header.remark || undefined,
        total_amount: totalPayAmount,
        items: [
          {
            dr_amount: totalPayAmount,
            cr_amount: 0,
          },
        ],
        invoices: selectedInvoices.map((inv) => ({
          invoice_id: inv.id,
          voucher_number: inv.doc_number,
          amount_paid: inv.pay_amount,
        })),
      });

      if (!result.success) {
        setError(result.error ?? "Failed to create payment");
        return;
      }

      router.push("/payments");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Vendor not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/payments" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Assign Payment — {vendor.code}
          </h1>
          <p className="text-muted-foreground">
            {vendor.name_th || vendor.name_en}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Payment Details</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="doc_date" className="label-text">
                Payment Date *
              </label>
              <input
                id="doc_date"
                type="date"
                value={header.doc_date}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, doc_date: e.target.value }))
                }
                className="input-field"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="pay_method" className="label-text">
                Payment Method *
              </label>
              <select
                id="pay_method"
                value={header.pay_method}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, pay_method: e.target.value }))
                }
                className="input-field"
                required
              >
                <option value="cheque">Cheque</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
              </select>
            </div>
            {header.pay_method === "cheque" && (
              <>
                <div className="space-y-2">
                  <label htmlFor="cheque_number" className="label-text">
                    Cheque Number
                  </label>
                  <input
                    id="cheque_number"
                    value={header.cheque_number}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, cheque_number: e.target.value }))
                    }
                    className="input-field"
                    maxLength={30}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="bank_code" className="label-text">
                    Bank Code
                  </label>
                  <input
                    id="bank_code"
                    value={header.bank_code}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, bank_code: e.target.value }))
                    }
                    className="input-field"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="bank_name" className="label-text">
                    Bank Name
                  </label>
                  <input
                    id="bank_name"
                    value={header.bank_name}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, bank_name: e.target.value }))
                    }
                    className="input-field"
                    maxLength={60}
                  />
                </div>
              </>
            )}
          </div>
          <div className="mt-4 space-y-2">
            <label htmlFor="remark" className="label-text">
              Remark
            </label>
            <textarea
              id="remark"
              value={header.remark}
              onChange={(e) =>
                setHeader((h) => ({ ...h, remark: e.target.value }))
              }
              className="input-field min-h-[80px]"
              rows={2}
            />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold">Outstanding Invoices</h2>
            <div className="flex gap-2">
              <button type="button" onClick={selectAll} className="btn-ghost text-sm">
                Select All
              </button>
              <button type="button" onClick={deselectAll} className="btn-ghost text-sm">
                Deselect All
              </button>
            </div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-12">
                    <Check className="mx-auto h-4 w-4" />
                  </th>
                  <th>Doc Number</th>
                  <th>Date</th>
                  <th>Invoice No.</th>
                  <th className="text-right">Total Amount</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right">Balance</th>
                  <th className="text-right">Pay Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 text-center text-muted-foreground"
                    >
                      No outstanding invoices
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv, index) => (
                    <tr
                      key={inv.id}
                      className={cn(inv.selected && "bg-primary/5")}
                    >
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={inv.selected}
                          onChange={() => toggleInvoice(index)}
                          className="h-4 w-4 rounded border-input"
                        />
                      </td>
                      <td className="font-medium">{inv.doc_number}</td>
                      <td>{formatDate(inv.doc_date)}</td>
                      <td className="text-muted-foreground">
                        {inv.inv_number ?? "-"}
                      </td>
                      <td className="text-right font-mono">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="text-right font-mono">
                        {formatCurrency(inv.paid_amount)}
                      </td>
                      <td className="text-right font-mono font-semibold">
                        {formatCurrency(inv.balance)}
                      </td>
                      <td>
                        {inv.selected ? (
                          <input
                            type="number"
                            step="0.01"
                            value={inv.pay_amount || ""}
                            onChange={(e) =>
                              updatePayAmount(
                                index,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="input-field text-right"
                            max={inv.balance}
                          />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {totalPayAmount > 0 && (
                <tfoot>
                  <tr className="border-t-2 bg-primary/5 font-semibold">
                    <td colSpan={7} className="text-right">
                      Total Payment
                    </td>
                    <td className="text-right font-mono">
                      {formatCurrency(totalPayAmount)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/payments" className="btn-outline">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Payment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}