import { createClient } from "@/lib/supabase/client";

const BUCKET_NAME = "invoice-attachments";

export async function uploadInvoiceAttachment(
  file: File,
  invoiceId: string,
): Promise<{ id: string; filePath: string; fileName: string; fileSize: number; fileType: string }> {
  const supabase = createClient();

  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `${invoiceId}/${timestamp}-${sanitizedFileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? "anonymous";

  const attachmentRecord = {
    invoice_id: invoiceId,
    file_path: data.path,
    file_name: file.name,
    file_size: file.size,
    file_type: file.type,
    uploaded_by: userId,
  };

  const { data: record, error: dbError } = await supabase
    .from("invoice_attachments")
    .insert(attachmentRecord)
    .select("id, file_path, file_name, file_size, file_type")
    .single();

  if (dbError) {
    await supabase.storage.from(BUCKET_NAME).remove([data.path]);
    throw new Error(`Failed to save attachment record: ${dbError.message}`);
  }

  return {
    id: record.id,
    filePath: record.file_path,
    fileName: record.file_name,
    fileSize: record.file_size,
    fileType: record.file_type,
  };
}

export async function getInvoiceAttachments(invoiceId: string): Promise<
  {
    id: string;
    invoiceId: string;
    filePath: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    uploadedBy: string | null;
    createdAt: string;
    publicUrl: string;
  }[]
> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("invoice_attachments")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch attachments: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(row.file_path);

    return {
      id: row.id,
      invoiceId: row.invoice_id,
      filePath: row.file_path,
      fileName: row.file_name,
      fileSize: row.file_size,
      fileType: row.file_type,
      uploadedBy: row.uploaded_by,
      createdAt: row.created_at,
      publicUrl: urlData.publicUrl,
    };
  });
}

export async function deleteInvoiceAttachment(
  id: string,
  filePath: string,
): Promise<void> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("You must be logged in to delete attachments");
  }

  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (storageError) {
    throw new Error(`Failed to delete file from storage: ${storageError.message}`);
  }

  const { error: dbError } = await supabase
    .from("invoice_attachments")
    .delete()
    .eq("id", id);

  if (dbError) {
    throw new Error(`Failed to delete attachment record: ${dbError.message}`);
  }
}