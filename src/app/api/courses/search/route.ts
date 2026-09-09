import { NextResponse } from "next/server";
import { searchCourses } from "@/lib/engine/data";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const results = searchCourses(q, 8).map((c) => ({
    code: c.code,
    name: c.name,
    semester: c.semester,
    grounding: c.grounding,
  }));
  return NextResponse.json({ results });
}
