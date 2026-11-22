interface SetupNoticeProps {
  setup?: unknown;
}

// Safely reads backend setup info that may be missing or shaped differently.
function readMissingTables(setup: unknown): string[] {
  if (!setup || typeof setup !== "object" || Array.isArray(setup)) return [];

  // Cast only after checking that the value is a plain object.
  const record = setup as Record<string, unknown>;
  // No warning is needed when the backend says setup is complete.
  if (record.complete === true) return [];

  // Laravel reports missing tables as an array of names.
  const missing = record.missing_tables;
  if (!Array.isArray(missing)) return [];

  // Normalize names and drop empty values before showing them.
  return missing
    .map((table) => (typeof table === "string" ? table : String(table)))
    .filter(Boolean);
}

// Warns admins when some database tables are not created yet.
export function SetupNotice({ setup }: SetupNoticeProps) {
  // The helper keeps the rendering code simple and safe.
  const missingTables = readMissingTables(setup);
  // Hide the notice when nothing is missing.
  if (missingTables.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#E5B7B9] bg-[#FFF0F2] p-4 text-sm text-[#58111A]">
      <p className="font-semibold">Database setup pending</p>
      <p className="mt-1 text-xs leading-5 text-[#7A585B]">
        Some admin data is unavailable until these tables are created: {missingTables.join(", ")}.
        {/* Explain that other data still works to avoid confusion. */}
        Available records are still shown below.
      </p>
    </div>
  );
}
