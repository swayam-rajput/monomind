import AdmZip from "adm-zip";

/**
 * Extracts conversations.json from a ChatGPT export .zip. ChatGPT exports
 * put it at the root of the archive alongside chat.html, message_feedback.json,
 * user.json, etc. We just look for a top-level (or nested, to be safe)
 * file literally named "conversations.json".
 */
export function extractConversationsJson(zipBuffer: Buffer): string {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  const match = entries.find((e) => e.entryName.toLowerCase().endsWith("conversations.json"));
  if (!match) {
    throw new Error(
      "Could not find conversations.json inside the uploaded .zip. Make sure this is an unmodified ChatGPT export."
    );
  }

  return match.getData().toString("utf-8");
}
