import { redirect } from "next/navigation";

/** Legacy public Document Audit product URL — redirect away from the sellable landing. */
export default function DocumentAuditPage() {
  redirect("/services");
}
