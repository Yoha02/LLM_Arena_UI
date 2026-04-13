import { NextResponse } from "next/server";
import { listBuiltInScripts } from "@/lib/starchamber/batch/script-parser";

export async function GET() {
  try {
    const scripts = listBuiltInScripts();
    return NextResponse.json(scripts);
  } catch (error) {
    console.error("Error fetching scripts:", error);
    return NextResponse.json(
      { error: "Failed to fetch scripts" },
      { status: 500 }
    );
  }
}
