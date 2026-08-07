import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import type { ImportRow } from "@/hooks/usePitchPipeline";

const FIELD_ALIASES: Record<keyof Omit<ImportRow, "source_row">, string[]> = {
  name: ["name", "contact", "full name", "journalist", "reporter", "contact name"],
  outlet: ["outlet", "publication", "media outlet", "company", "organization", "outlet name"],
  email: ["email", "email address", "primary email", "work email"],
  beat: ["beat", "beats", "topics", "topics covered", "categories"],
  title: ["title", "job title", "position", "role"],
  location: ["location", "city", "country", "region", "market"],
};

function normalizeKey(key: string) {
  return key.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function pick(row: Record<string, unknown>, aliases: string[]) {
  for (const alias of aliases) {
    for (const [key, value] of Object.entries(row)) {
      if (normalizeKey(key) === alias && value != null && String(value).trim()) {
        return String(value).trim();
      }
    }
  }
  // Fall back to a contains match so Muck Rack column variants still land.
  for (const alias of aliases) {
    for (const [key, value] of Object.entries(row)) {
      if (normalizeKey(key).includes(alias) && value != null && String(value).trim()) {
        return String(value).trim();
      }
    }
  }
  return "";
}

function toImportRows(raw: Record<string, unknown>[]): ImportRow[] {
  return raw
    .map((row) => ({
      name: pick(row, FIELD_ALIASES.name),
      outlet: pick(row, FIELD_ALIASES.outlet),
      email: pick(row, FIELD_ALIASES.email).toLowerCase(),
      beat: pick(row, FIELD_ALIASES.beat),
      title: pick(row, FIELD_ALIASES.title),
      location: pick(row, FIELD_ALIASES.location),
      source_row: row,
    }))
    .filter((r) => r.name || r.email);
}

interface Props {
  onImport: (rows: ImportRow[]) => void;
  isImporting?: boolean;
}

export function MediaListImport({ onImport, isImporting }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);

  async function handleFile(file: File) {
    setParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const rows = toImportRows(raw);
      if (!rows.length) {
        toast.error("No usable rows found — the file needs a name or email column");
        return;
      }
      onImport(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file");
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const busy = parsing || isImporting;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={busy}>
        <Upload className="mr-2 h-4 w-4" />
        {busy ? "Importing…" : "Import media list"}
      </Button>
    </>
  );
}
