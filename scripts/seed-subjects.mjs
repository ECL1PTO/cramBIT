// Push src/data/courses.json into the Supabase `subjects` table.
//   node scripts/seed-subjects.mjs
import { createClient } from "@supabase/supabase-js";
import { readJson, readEnvLocal } from "./lib.mjs";

const env = { ...readEnvLocal(), ...process.env };
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const courses = readJson("src/data/courses.json", {}) ?? {};
const rows = Object.values(courses).map((c) => ({
  code: c.code,
  name: c.name,
  programs: c.programs ?? [],
  semester: c.semester ?? null,
  credits: c.credits ?? null,
  syllabus: c.syllabus ?? null,
  campus: "Noida",
  grounding: c.grounding ?? "none",
  pyq_count: c.pyqCount ?? 0,
  updated_at: new Date().toISOString(),
}));

for (let i = 0; i < rows.length; i += 200) {
  const chunk = rows.slice(i, i + 200);
  const { error } = await db.from("subjects").upsert(chunk, { onConflict: "code" });
  if (error) throw error;
  console.log(`upserted ${i + chunk.length}/${rows.length}`);
}
console.log("done");
