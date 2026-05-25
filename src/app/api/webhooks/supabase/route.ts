import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

interface WebhookEvent {
  type: string;
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}

const SUPPORTED_TABLES = [
  "invoices",
  "invoice_items",
  "payments",
  "payment_items",
  "vendors",
  "deposit_payments",
  "transfers",
  "withholding_taxes",
  "bank_reconciliations",
  "periods",
];

export async function POST(request: Request) {
  try {
    const payload: WebhookEvent = await request.json();

    const authHeader = request.headers.get("authorization");
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!SUPPORTED_TABLES.includes(payload.table)) {
      return NextResponse.json(
        { error: `Unsupported table: ${payload.table}` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { type, table, record, old_record } = payload;

    switch (table) {
      case "invoices": {
        if (type === "UPDATE" || type === "INSERT") {
          const supplierId = record.supplier_id as string;
          if (supplierId) {
            await supabase.rpc("recalculate_vendor_balance", {
              p_vendor_id: supplierId,
            });
          }
        }
        break;
      }

      case "payments": {
        if (type === "UPDATE" || type === "INSERT") {
          const supplierId = record.supplier_id as string;
          if (supplierId) {
            await supabase.rpc("recalculate_vendor_balance", {
              p_vendor_id: supplierId,
            });
          }
        }
        break;
      }

      case "deposit_payments": {
        if (type === "UPDATE" || type === "INSERT") {
          const supplierId = record.supplier_id as string;
          if (supplierId) {
            await supabase.rpc("recalculate_vendor_balance", {
              p_vendor_id: supplierId,
            });
          }
        }
        break;
      }

      case "transfers": {
        if (type === "UPDATE" || type === "INSERT") {
          const fromVendorId = record.from_vendor_id as string;
          const toVendorId = record.to_vendor_id as string;
          if (fromVendorId) {
            await supabase.rpc("recalculate_vendor_balance", {
              p_vendor_id: fromVendorId,
            });
          }
          if (toVendorId) {
            await supabase.rpc("recalculate_vendor_balance", {
              p_vendor_id: toVendorId,
            });
          }
        }
        break;
      }

      case "bank_reconciliations": {
        if (type === "UPDATE") {
          const oldStatus = old_record?.status as string;
          const newStatus = record.status as string;
          if (oldStatus !== newStatus && newStatus === "cleared") {
            await supabase.rpc("mark_cheque_cleared", {
              p_cheque_id: record.id as string,
            });
          }
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ success: true, table, type });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}