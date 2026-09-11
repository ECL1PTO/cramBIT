import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/utils/supabase/service";
import { Card, Container } from "@/components/ui";
import { ClaimActions } from "./claim-actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  const db = createServiceClient();
  const { data: profile } = await db
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/dashboard");

  const { data: claims } = await db
    .from("payment_claims")
    .select("id, plan, subject_code, amount, upi_utr, provider, status, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = claims ?? [];

  return (
    <main className="min-h-screen">
      <Container className="py-section">
        <h1 className="text-h2 font-normal tracking-tight text-text">Payment claims</h1>
        <div className="mt-8 space-y-3">
          {rows.length === 0 && <p className="text-body-sm text-faint">No claims yet.</p>}
          {rows.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-body-sm text-text">
                  {c.plan}
                  {c.subject_code ? ` · ${c.subject_code}` : ""} · ₹{c.amount}
                </p>
                <p className="text-caption text-faint">
                  {c.provider === "razorpay" ? `Razorpay ${c.upi_utr ?? ""}` : `UTR ${c.upi_utr ?? "—"}`}
                  {" · "}
                  {new Date(c.created_at).toLocaleString()}
                </p>
              </div>
              {c.status === "pending" ? (
                <ClaimActions claimId={c.id} />
              ) : (
                <span className="font-mono text-caption text-muted">{c.status}</span>
              )}
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}
