import { NextRequest, NextResponse } from "next/server";
import { getBuiltInScript } from "@/lib/starchamber/batch/script-parser";
import { getBatchPersistence } from "@/lib/starchamber/batch/persistence";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scriptId: string }> }
) {
  try {
    const { scriptId } = await params;
    
    // First check built-in scripts
    const builtInScript = getBuiltInScript(scriptId);
    if (builtInScript) {
      return NextResponse.json(builtInScript);
    }
    
    // Then check custom scripts
    const persistence = getBatchPersistence();
    const customScript = await persistence.loadScript(scriptId);
    if (customScript) {
      return NextResponse.json(customScript);
    }
    
    return NextResponse.json(
      { error: "Script not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error fetching script:", error);
    return NextResponse.json(
      { error: "Failed to fetch script" },
      { status: 500 }
    );
  }
}
