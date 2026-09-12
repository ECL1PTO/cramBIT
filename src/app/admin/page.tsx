import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/utils/supabase/service";
import { Card, Container } from "@/components/ui";

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

  const { data: contributions } = await db
    .from("contributions")
    .select("id, amount, provider, provider_ref, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = contributions ?? [];
  const total = rows.reduce((sum, c) => sum + c.amount, 0);

  return (
    <main className="min-h-screen">
      <Container className="py-section">
        <h1 className="text-h2 font-normal tracking-tight text-text">
          Support contributions
        </h1>
        <p className="mt-2 text-body-sm text-muted">
          cramBIT is free for everyone — nothing here gates access. This is just a log of
          voluntary "support us" contributions. Total: ₹{total}.
        </p>
        <div className="mt-8 space-y-3">
          {rows.length === 0 && (
            <p className="text-body-sm text-faint">No contributions yet.</p>
          )}
          {rows.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-body-sm text-text">₹{c.amount}</p>
                <p className="text-caption text-faint">
                  {c.provider} {c.provider_ref ?? ""} · {new Date(c.created_at).toLocaleString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}
