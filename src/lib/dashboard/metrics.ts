export interface DashboardInvoice {
  id: string;
  status: string;
  balance: number | null;
  due_date: string | null;
}

export interface DashboardPayment {
  id: string;
  status: string;
  total_amount: number | null;
  doc_date: string;
}

export interface DashboardVendor {
  id: string;
  is_active: boolean;
}

export function getDashboardDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function calculateDashboardStats(
  vendors: DashboardVendor[],
  invoices: DashboardInvoice[],
  payments: DashboardPayment[],
  today: string,
) {
  const posted = invoices.filter((invoice) => ["approved", "posted"].includes(invoice.status));
  const balance = (invoice: DashboardInvoice) => Math.max(0, Number(invoice.balance) || 0);
  const overdue = posted.filter((invoice) => invoice.due_date && invoice.due_date < today);
  const paid = payments.filter((payment) => payment.status === "paid" && payment.doc_date?.slice(0, 7) === today.slice(0, 7));
  return {
    totalVendors: vendors.length,
    activeVendors: vendors.filter((vendor) => vendor.is_active).length,
    pendingInvoices: invoices.filter((invoice) => invoice.status === "pending_approval").length,
    draftInvoices: invoices.filter((invoice) => invoice.status === "draft").length,
    approvedInvoices: posted.length,
    totalPayable: posted.reduce((sum, invoice) => sum + balance(invoice), 0),
    overdueAmount: overdue.reduce((sum, invoice) => sum + balance(invoice), 0),
    undatedAmount: posted.filter((invoice) => !invoice.due_date).reduce((sum, invoice) => sum + balance(invoice), 0),
    paymentsThisMonth: paid.length,
    paidThisMonth: paid.reduce((sum, payment) => sum + (Number(payment.total_amount) || 0), 0),
  };
}

export type DashboardStats = ReturnType<typeof calculateDashboardStats>;
