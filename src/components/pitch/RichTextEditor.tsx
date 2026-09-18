import { useEffect, useRef } from "react";
import { Bold, Italic, Link2, List, ListOrdered, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  placeholder?: string;
}

const TOOLS = [
  { cmd: "bold", icon: Bold, label: "Bold" },
  { cmd: "italic", icon: Italic, label: "Italic" },
  { cmd: "insertUnorderedList", icon: List, label: "Bullet list" },
  { cmd: "insertOrderedList", icon: ListOrdered, label: "Numbered list" },
] as const;

/** Gmail-style compose box. Stores HTML, so links and formatting survive the send. */
export function RichTextEditor({ value, onChange, className, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Only write into the node when the incoming value is genuinely different,
  // otherwise the caret jumps on every keystroke.
  useEffect(() => {
    const el = ref.current;
    if (el && value !== el.innerHTML) el.innerHTML = value || "";
  }, [value]);

  const run = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  };

  const addLink = () => {
    const url = window.prompt("Link URL", "https://");
    if (!url) return;
    run("createLink", url);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[rgba(255,255,255,0.06)] px-2 py-1.5">
        {TOOLS.map(({ cmd, icon: Icon, label }) => (
          <button
            key={cmd}
            type="button"
            title={label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(cmd)}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-foreground"
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
        <button
          type="button"
          title="Add link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={addLink}
          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-foreground"
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Clear formatting"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run("removeFormat")}
          className="ml-auto rounded p-1.5 text-muted-foreground transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-foreground"
        >
          <Eraser className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        onPaste={(e) => {
          // Paste as text so outside styling never rides along into the pitch.
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        className="prose-pitch min-h-[280px] w-full px-3 py-3 text-sm leading-relaxed text-foreground outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
}
