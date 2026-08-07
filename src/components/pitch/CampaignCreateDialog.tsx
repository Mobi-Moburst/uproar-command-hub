import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClients } from "@/hooks/useClients";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: {
    client_name: string;
    angle: string;
    description?: string;
    press_release_body?: string;
  }) => void;
  isCreating?: boolean;
}

export function CampaignCreateDialog({ open, onOpenChange, onCreate, isCreating }: Props) {
  const { data: clients } = useClients();
  const [clientName, setClientName] = useState("");
  const [angle, setAngle] = useState("");
  const [description, setDescription] = useState("");
  const [pressRelease, setPressRelease] = useState("");

  const canSubmit = clientName.trim() && angle.trim() && !isCreating;

  function submit() {
    if (!canSubmit) return;
    onCreate({
      client_name: clientName.trim(),
      angle: angle.trim(),
      description: description.trim() || undefined,
      press_release_body: pressRelease.trim() || undefined,
    });
    setClientName("");
    setAngle("");
    setDescription("");
    setPressRelease("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New campaign</DialogTitle>
          <DialogDescription>
            A campaign is one client plus one angle. Media lists and pitches hang off it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={clientName} onValueChange={setClientName}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {(clients ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="angle">Angle</Label>
            <Input
              id="angle"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder="e.g. Q3 funding round — fintech trade press"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What the story is, who it matters to, any timing"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pr">Press release (optional)</Label>
            <Textarea
              id="pr"
              value={pressRelease}
              onChange={(e) => setPressRelease(e.target.value)}
              rows={4}
              placeholder="Paste the release if this is a bulk announcement"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {isCreating ? "Creating…" : "Create campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
