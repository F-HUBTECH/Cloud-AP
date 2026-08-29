import { notFound } from "next/navigation";
import { getVendorById } from "@/modules/vendor/vendor.actions";
import { EditVendorForm } from "./edit-vendor-form";

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getVendorById(id);

  if (!result.success || !result.data) notFound();

  return <EditVendorForm vendor={result.data} />;
}
