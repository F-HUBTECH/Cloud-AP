import { createServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";

interface JournalEntryLine {
  glAccount: string;
  description?: string;
  debit: number;
  credit: number;
}

interface CreateJournalEntryParams {
  sourceType: "invoice" | "payment" | "deposit" | "transfer";
  sourceId: string;
  docNumber: string;
  docDate: string;
  periodYear: string;
  periodMonth: string;
  description: string;
  lines: JournalEntryLine[];
  createdBy?: string | null;
}

class GLPostingService {
  private async getClient() {
    return createServerClient();
  }

  async createJournalEntry(params: CreateJournalEntryParams): Promise<string> {
    const supabase = await this.getClient();

    const totalDebit = params.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = params.lines.reduce((sum, l) => sum + l.credit, 0);

    const diff = Math.abs(totalDebit - totalCredit);
    if (diff > 0.01) {
      throw new AppError(
        `Journal entry is not balanced: debit=${totalDebit}, credit=${totalCredit}`,
        "JV_NOT_BALANCED",
        422
      );
    }

    const { data: entry, error: entryError } = await supabase
      .from("journal_entries")
      .insert({
        doc_number: params.docNumber,
        source_type: params.sourceType,
        source_id: params.sourceId,
        doc_date: params.docDate,
        period_year: params.periodYear,
        period_month: params.periodMonth,
        description: params.description,
        total_debit: totalDebit,
        total_credit: totalCredit,
        is_posted: true,
        posted_at: new Date().toISOString(),
        posted_by: params.createdBy ?? null,
        created_by: params.createdBy ?? null,
      })
      .select("id")
      .single();

    if (entryError) throw new AppError(entryError.message);

    const lineRows = params.lines.map((line, index) => ({
      journal_entry_id: entry.id,
      line_no: index + 1,
      gl_account: line.glAccount,
      description: line.description ?? null,
      debit: line.debit,
      credit: line.credit,
    }));

    const { error: linesError } = await supabase
      .from("journal_entry_lines")
      .insert(lineRows);

    if (linesError) throw new AppError(linesError.message);

    return entry.id;
  }

  async cancelJournalEntries(sourceType: string, sourceId: string): Promise<void> {
    const supabase = await this.getClient();

    const { data: entries } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("source_type", sourceType)
      .eq("source_id", sourceId)
      .eq("cancelled", false);

    if (entries && entries.length > 0) {
      await supabase
        .from("journal_entries")
        .update({
          cancelled: true,
          cancelled_at: new Date().toISOString(),
        })
        .in("id", entries.map((e: { id: string }) => e.id));
    }
  }

  async getJournalEntriesBySource(sourceType: string, sourceId: string) {
    const supabase = await this.getClient();

    const { data, error } = await supabase
      .from("journal_entries")
      .select("*, lines:journal_entry_lines(*)")
      .eq("source_type", sourceType)
      .eq("source_id", sourceId)
      .eq("cancelled", false);

    if (error) throw new AppError(error.message);
    return data;
  }
}

export const glPostingService = new GLPostingService();
