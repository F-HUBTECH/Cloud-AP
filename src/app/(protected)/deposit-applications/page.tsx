"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Loader2, ArrowRight, XCircle } from "lucide-react";
import { applyDeposit, cancelDepositApplication } from "@/modules/deposit-application/deposit-application.actions";
import type { DepositApplicationFormData } from "@/modules/deposit-application/deposit-application.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface AvailableDeposit {
  id: string;
  docNumber: string;
  depositDate: string;
  amount: number;
  vatAmount: number;
  appliedAmount: number;
  remainingAmount: number;
  supplierCode: string;
  status: string;
}

interface AvailableInvoice {
  id: string;
  docNumber: string;
  docDate: string;
  invNumber: string | null;
  totalAmount: number;
  balance: number;
  supplierCode: string;
  apTypeCode: string | null;
}

interface ApplicationRecord {
  id: string;
  depositId: string;
  invoiceId: string;
  amountApplied: number;
  vatApplied: number;
  status: string;
  appliedAt: string;
  depositDocNumber: string;
  depositDate: string;
  depositAmount: number;
  invoiceDocNumber: string;
  invoiceDate: string;
  invoiceBalance: number;
  vendorCode: string;
  vendorName: string;
}

export default function DepositApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [deposits, setDeposits] = useState<AvailableDeposit[]>([]);
  const [invoices, setInvoices] = useState<AvailableInvoice[]>([]);
  const [vendors, setVendors] = useState<{ code: string; name_en: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showApply, setShowApply] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedDeposit, setSelectedDeposit] = useState("");
  const [selectedInvoices, setSelectedInvoices] = useState<Map<string, number>>(new Map());

  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const supabase = createClient();

  const fetchApplications = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("deposit_applications")
      .select("id, deposit_id, invoice_id, amount_applied, vat_applied, status, applied_at")
      .order("applied_at", { ascending: false })
      .limit(100);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    const appData = (data ?? []) as Record<string, unknown>[];
    if (appData.length === 0) {
      setApplications([]);
      return;
    }

    const depositIds = [...new Set(appData.map((a) => a.deposit_id as string))];
    const invoiceIds = [...new Set(appData.map((a) => a.invoice_id as string))];

    const [{ data: depositData }, { data: invoiceData }] = await Promise.all([
      supabase.from("deposit_payments").select("id, doc_number, deposit_date, amount, supplier_code").in("id", depositIds),
      supabase.from("invoices").select("id, doc_number, doc_date, balance").in("id", invoiceIds),
    ]);

    const depositMap = new Map((depositData ?? []).map((d: Record<string, unknown>) => [d.id as string, d as Record<string, unknown>]));
    const invoiceMap = new Map((invoiceData ?? []).map((i: Record<string, unknown>) => [i.id as string, i as Record<string, unknown>]));

    const supplierCodes = [...new Set([...depositData ?? []].map((d: Record<string, unknown>) => d.supplier_code as string).filter(Boolean))];
    const { data: vendorData } = await supabase.from("vendors").select("code, name_en").in("code", supplierCodes);
    const vendorMap = new Map((vendorData ?? []).map((v: Record<string, unknown>) => [v.code as string, v.name_en as string]));

    const results: ApplicationRecord[] = appData.map((app) => {
      const dep = depositMap.get(app.deposit_id as string) ?? {} as Record<string, unknown>;
      const inv = invoiceMap.get(app.invoice_id as string) ?? {} as Record<string, unknown>;
      const vCode = (dep.supplier_code as string) ?? "";
      return {
        id: app.id as string,
        depositId: app.deposit_id as string,
        invoiceId: app.invoice_id as string,
        amountApplied: Number(app.amount_applied) || 0,
        vatApplied: Number(app.vat_applied) || 0,
        status: app.status as string,
        appliedAt: app.applied_at as string,
        depositDocNumber: (dep.doc_number as string) ?? "",
        depositDate: (dep.deposit_date as string) ?? "",
        depositAmount: Number(dep.amount) || 0,
        invoiceDocNumber: (inv.doc_number as string) ?? "",
        invoiceDate: (inv.doc_date as string) ?? "",
        invoiceBalance: Number(inv.balance) || 0,
        vendorCode: vCode,
        vendorName: vendorMap.get(vCode) ?? "",
      };
    });

    setApplications(results);
  }, [supabase]);

  const fetchVendors = useCallback(async () => {
    const { data } = await supabase
      .from("vendors")
      .select("code, name_en")
      .eq("is_active", true)
      .order("code");
    if (data) setVendors(data as { code: string; name_en: string }[]);
  }, [supabase]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchApplications(), fetchVendors()]).finally(() => setLoading(false));
  }, [fetchApplications, fetchVendors]);

  async function fetchDepositsForVendor(vendorCode: string) {
    if (!vendorCode) {
      setDeposits([]);
      setInvoices([]);
      return;
    }

    const { data } = await supabase
      .from("deposit_payments")
      .select("id, doc_number, deposit_date, amount, vat_amount, applied_amount, remaining_amount, supplier_code, status")
      .eq("supplier_code", vendorCode)
      .neq("status", "cancelled")
      .order("deposit_date", { ascending: false });

    const depositData = (data ?? []).map((d: Record<string, unknown>) => {
      const amount = Number(d.amount) || 0;
      const applied = Number(d.applied_amount) || 0;
      const remaining = Number(d.remaining_amount) || (amount - applied);
      return {
        id: d.id as string,
        docNumber: d.doc_number as string,
        depositDate: d.deposit_date as string,
        amount,
        vatAmount: Number(d.vat_amount) || 0,
        appliedAmount: applied,
        remainingAmount: remaining,
        supplierCode: d.supplier_code as string,
        status: d.status as string,
      };
    }).filter((d: AvailableDeposit) => d.remainingAmount > 0);

    setDeposits(depositData);

    const { data: invoiceData } = await supabase
      .from("invoices")
      .select("id, doc_number, doc_date, inv_number, total_amount, balance, supplier_code, ap_type_code")
      .eq("supplier_code", vendorCode)
      .in("status", ["approved", "posted"])
      .gt("balance", 0)
      .order("doc_date", { ascending: true });

    setInvoices((invoiceData ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      docNumber: row.doc_number as string,
      docDate: row.doc_date as string,
      invNumber: row.inv_number as string | null,
      totalAmount: Number(row.total_amount) || 0,
      balance: Number(row.balance) || 0,
      supplierCode: row.supplier_code as string,
      apTypeCode: row.ap_type_code as string | null,
    })));
  }

  async function handleApply() {
    if (!selectedDeposit || selectedInvoices.size === 0) {
      setError("Please select a deposit and at least one invoice");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const apps: DepositApplicationFormData["applications"] = [];
      for (const [invoiceId, amount] of selectedInvoices) {
        if (amount > 0) {
          apps.push({ invoiceId, amountApplied: amount, vatApplied: 0 });
        }
      }

      if (apps.length === 0) {
        setError("Please enter amounts for at least one invoice");
        setSaving(false);
        return;
      }

      const formData: DepositApplicationFormData = {
        depositId: selectedDeposit,
        applications: apps,
      };

      const result = await applyDeposit(formData);
      if (!result.success) {
        setError(result.error ?? "Failed to apply deposit");
        return;
      }

      setShowApply(false);
      setSelectedDeposit("");
      setSelectedInvoices(new Map());
      await fetchApplications();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!cancelId || !cancelReason.trim()) return;
    setCancelLoading(true);
    setError(null);

    try {
      const result = await cancelDepositApplication(cancelId, cancelReason);
      if (!result.success) {
        setError(result.error ?? "Failed to cancel application");
        setCancelId(null);
        return;
      }

      setCancelId(null);
      setCancelReason("");
      await fetchApplications();
    } catch {
      setError("An unexpected error occurred");
      setCancelId(null);
    } finally {
      setCancelLoading(false);
    }
  }

  const toggleInvoice = (invoiceId: string, balance: number) => {
    setSelectedInvoices((prev) => {
      const next = new Map(prev);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.set(invoiceId, balance);
      }
      return next;
    });
  };

  const updateAmount = (invoiceId: string, amount: number) => {
    setSelectedInvoices((prev) => {
      const next = new Map(prev);
      next.set(invoiceId, amount);
      return next;
    });
  };

  const totalToApply = Array.from(selectedInvoices.values()).reduce((s, a) => s + a, 0);
  const selectedDepositData = deposits.find((d) => d.id === selectedDeposit);

  const activeApps = applications.filter((a) => a.status === "active");
  const cancelledApps = applications.filter((a) => a.status === "cancelled");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deposit Applications</h1>
          <p className="text-muted-foreground">Apply advance deposits to outstanding invoices</p>
        </div>
        <button onClick={() => setShowApply(true)} className="btn-primary">
          <ArrowRight className="h-4 w-4" />
          Apply Deposit
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {activeApps.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Active Applications</h2>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Deposit No.</th>
                      <th className="date-column">Deposit Date</th>
                      <th>Invoice No.</th>
                      <th className="date-column">Invoice Date</th>
                      <th>Vendor</th>
                      <th className="text-right">Amount Applied</th>
                      <th className="text-right">VAT Applied</th>
                      <th>Applied At</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeApps.map((app) => (
                      <tr key={app.id}>
                        <td className="font-medium">{app.depositDocNumber}</td>
                        <td className="date-column">{formatDate(app.depositDate)}</td>
                        <td className="font-medium">{app.invoiceDocNumber}</td>
                        <td className="date-column">{formatDate(app.invoiceDate)}</td>
                        <td>
                          <span className="font-medium">{app.vendorCode}</span>
                          <span className="ml-1 text-muted-foreground">{app.vendorName}</span>
                        </td>
                        <td className="text-right font-mono">{formatCurrency(app.amountApplied)}</td>
                        <td className="text-right font-mono">{formatCurrency(app.vatApplied)}</td>
                        <td className="text-muted-foreground">{formatDate(app.appliedAt, "dd/MM/yyyy HH:mm")}</td>
                        <td className="text-right">
                          <button onClick={() => setCancelId(app.id)} className="btn-ghost gap-1 text-sm text-destructive">
                            <XCircle className="h-4 w-4" />
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {cancelledApps.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-muted-foreground">Cancelled Applications</h2>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Deposit No.</th>
                      <th>Invoice No.</th>
                      <th>Vendor</th>
                      <th className="text-right">Amount</th>
                      <th>Applied At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cancelledApps.map((app) => (
                      <tr key={app.id} className="opacity-60">
                        <td>{app.depositDocNumber}</td>
                        <td>{app.invoiceDocNumber}</td>
                        <td>{app.vendorCode} - {app.vendorName}</td>
                        <td className="text-right font-mono">{formatCurrency(app.amountApplied)}</td>
                        <td className="text-muted-foreground">{formatDate(app.appliedAt, "dd/MM/yyyy HH:mm")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {applications.length === 0 && (
            <div className="card p-12 text-center text-muted-foreground">
              No deposit applications found. Click &quot;Apply Deposit&quot; to create one.
            </div>
          )}
        </>
      )}

      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply Deposit to Invoices</DialogTitle>
            <DialogDescription>Select a vendor, choose a deposit, then apply amounts to outstanding invoices</DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="label-text">Vendor *</label>
                <select
                  value={selectedVendor}
                  onChange={(e) => {
                    setSelectedVendor(e.target.value);
                    setSelectedDeposit("");
                    setSelectedInvoices(new Map());
                    fetchDepositsForVendor(e.target.value);
                  }}
                  className="input-field"
                >
                  <option value="">Select vendor...</option>
                  {vendors.map((v) => (
                    <option key={v.code} value={v.code}>{v.code} - {v.name_en}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="label-text">Deposit *</label>
                <select
                  value={selectedDeposit}
                  onChange={(e) => setSelectedDeposit(e.target.value)}
                  className="input-field"
                  disabled={!selectedVendor}
                >
                  <option value="">Select deposit...</option>
                  {deposits.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.docNumber} - {formatDate(d.depositDate)} (Remaining: {formatCurrency(d.remainingAmount)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedDepositData && (
              <div className="card p-3 bg-muted/30">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Deposit Amount</p>
                    <p className="font-mono font-semibold">{formatCurrency(selectedDepositData.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Already Applied</p>
                    <p className="font-mono font-semibold">{formatCurrency(selectedDepositData.appliedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className="font-mono font-semibold text-success">{formatCurrency(selectedDepositData.remainingAmount)}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedVendor && invoices.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Outstanding Invoices</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-10"><input type="checkbox" onChange={(e) => {
                          if (e.target.checked) {
                            const next = new Map<string, number>();
                            invoices.forEach((inv) => next.set(inv.id, inv.balance));
                            setSelectedInvoices(next);
                          } else {
                            setSelectedInvoices(new Map());
                          }
                        }} /></th>
                        <th>Doc No.</th>
                        <th className="date-column">Date</th>
                        <th>Inv No.</th>
                        <th>Type</th>
                        <th className="text-right">Total Amount</th>
                        <th className="text-right">Balance</th>
                        <th className="text-right">Apply Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} className={cn(selectedInvoices.has(inv.id) && "bg-primary/5")}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedInvoices.has(inv.id)}
                              onChange={() => toggleInvoice(inv.id, inv.balance)}
                            />
                          </td>
                          <td className="font-medium">{inv.docNumber}</td>
                          <td className="date-column">{formatDate(inv.docDate)}</td>
                          <td>{inv.invNumber ?? "-"}</td>
                          <td>{inv.apTypeCode ?? "-"}</td>
                          <td className="text-right font-mono">{formatCurrency(inv.totalAmount)}</td>
                          <td className="text-right font-mono font-semibold">{formatCurrency(inv.balance)}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max={inv.balance}
                              step="0.01"
                              value={selectedInvoices.get(inv.id) ?? ""}
                              onChange={(e) => updateAmount(inv.id, parseFloat(e.target.value) || 0)}
                              className="input-field w-28 text-right"
                              disabled={!selectedInvoices.has(inv.id)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total to Apply:</span>{" "}
                    <span className={cn("font-mono font-semibold", totalToApply > (selectedDepositData?.remainingAmount ?? 0) ? "text-danger" : "text-success")}>
                      {formatCurrency(totalToApply)}
                    </span>
                    {selectedDepositData && (
                      <>
                        {" / "}
                        <span className="text-muted-foreground">Available:</span>{" "}
                        <span className="font-mono font-semibold">{formatCurrency(selectedDepositData.remainingAmount)}</span>
                      </>
                    )}
                  </div>
                  {selectedDepositData && totalToApply > selectedDepositData.remainingAmount + 0.01 && (
                    <span className="text-sm text-destructive font-semibold">
                      Exceeds remaining deposit amount
                    </span>
                  )}
                </div>
              </div>
            )}

            {selectedVendor && invoices.length === 0 && (
              <div className="card p-6 text-center text-muted-foreground">
                No outstanding invoices found for this vendor
              </div>
            )}
          </div>

          <DialogFooter>
            <button type="button" onClick={() => setShowApply(false)} className="btn-outline">Cancel</button>
            <button
              onClick={handleApply}
              disabled={saving || !selectedDeposit || selectedInvoices.size === 0}
              className="btn-primary"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <ArrowRight className="h-4 w-4" />
              Apply Deposit
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelId} onOpenChange={() => { setCancelId(null); setCancelReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Deposit Application</DialogTitle>
            <DialogDescription>Please provide a reason for cancelling this application. This will reverse the applied amount.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="label-text">Reason *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="input-field min-h-[80px]"
                placeholder="Enter reason for cancellation"
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => { setCancelId(null); setCancelReason(""); }} className="btn-outline">Back</button>
            <button
              onClick={handleCancel}
              disabled={cancelLoading || !cancelReason.trim()}
              className="btn-destructive"
            >
              {cancelLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Cancel Application
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
