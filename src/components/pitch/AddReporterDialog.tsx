import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { ImportRow } from "@/hooks/usePitchPipeline";

const EMPTY = {
  name: "",
  outlet: "",
  email: "",
  beat: "",
  title: "",
  location: "",
  notes: "",
};

interface Props {
  isImporting: boolean;
  onAdd: (row: ImportRow) => void;
}

export function AddReporterDialog({ isImporting, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = () => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name) return toast.error("Reporter name is required");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return toast.error("That email doesn't look right");
    }
    onAdd({
      name,
      outlet: form.outlet.trim(),
      email,
      beat: form.beat.trim(),
      title: form.title.trim(),
      location: form.location.trim(),
      notes: form.notes.trim(),
      source_row: { ...form, name, email, entry: "manual" },
    });
    setForm({ ...EMPTY });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-1.5 h-4 w-4" />
          Add reporter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a reporter</DialogTitle>
          <DialogDescription>
            Runs the same CRM match-or-create and conflict checks as a Muck Rack import.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide text-muted-foreground font-mono">
                Name *
              </label>
              <Input value={form.name} onChange={set("name")} placeholder="Jane Doe" maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide text-muted-foreground font-mono">
                Outlet
              </label>
              <Input value={form.outlet} onChange={set("outlet")} placeholder="TechCrunch" maxLength={160} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-muted-foreground font-mono">
              Email
            </label>
            <Input
              value={form.email}
              onChange={set("email")}
              placeholder="jane@outlet.com"
              maxLength={255}
            />
            <p className="text-xs text-muted-foreground font-mono">
              Without an email we check for duplicates on name + outlet instead.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide text-muted-foreground font-mono">
                Title
              </label>
              <Input value={form.title} onChange={set("title")} maxLength={160} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide text-muted-foreground font-mono">
                Location
              </label>
              <Input value={form.location} onChange={set("location")} maxLength={160} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-muted-foreground font-mono">
              Beat / topics
            </label>
            <Input value={form.beat} onChange={set("beat")} maxLength={300} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-muted-foreground font-mono">
              Notes / pitch preferences
            </label>
            <Textarea value={form.notes} onChange={set("notes")} maxLength={1000} className="min-h-[80px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isImporting || !form.name.trim()}>
            {isImporting ? "Adding…" : "Add to campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
