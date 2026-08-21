import { NextRequest, NextResponse } from "next/server";
import type { ImportSummary } from "@monome/types";
import { parseChatgptExportFile, ConversationParseError } from "@/lib/import/chatgptExport";
import { parsePastedConversation } from "@/lib/import/pastedConversation";
import { extractConversationsJson } from "@/lib/import/zip";
import { persistParsedConversations } from "@/lib/import/persist";

// This route only ever writes to the local SQLite file via Prisma - no
// outbound network calls, no AI calls. Runs on Node (not the edge runtime)
// because we need Buffer/zip handling.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    // Path 1: multipart form upload with a .zip file.
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
      }
      if (!file.name.toLowerCase().endsWith(".zip")) {
        return NextResponse.json(
          { error: "Please upload the .zip file from a ChatGPT export, not an individual file." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const conversationsJson = extractConversationsJson(buffer);
      const { parsed, skipped } = parseChatgptExportFile(conversationsJson);

      const summary = await persistParsedConversations(parsed, skipped);
      return NextResponse.json(summary satisfies ImportSummary);
    }

    // Path 2: JSON body with a single pasted conversation.
    if (contentType.includes("application/json")) {
      const body = await request.json();
      if (typeof body?.pastedText !== "string" || body.pastedText.trim().length === 0) {
        return NextResponse.json({ error: "'pastedText' is required and must be non-empty." }, { status: 400 });
      }

      const conversation = parsePastedConversation(body.pastedText);
      const summary = await persistParsedConversations([conversation]);
      return NextResponse.json(summary satisfies ImportSummary);
    }

    return NextResponse.json(
      { error: "Unsupported request. Upload a .zip file or send JSON with 'pastedText'." },
      { status: 400 }
    );
  } catch (err) {
    if (err instanceof ConversationParseError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Import failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error during import." },
      { status: 500 }
    );
  }
}
