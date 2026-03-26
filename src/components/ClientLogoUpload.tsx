import { useRef } from "react";
import { useClientLogo } from "@/hooks/useClientLogo";
import { Upload, Loader2 } from "lucide-react";

interface ClientLogoUploadProps {
  clientName: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
};

export function ClientLogoUpload({ clientName, size = "md" }: ClientLogoUploadProps) {
  const { logoUrl, uploadLogo, isUploading } = useClientLogo(clientName);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadLogo(file);
  };

  return (
    <div className="relative group">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className={`${sizeMap[size]} rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden transition-all hover:border-primary/40 hover:bg-primary/5 cursor-pointer`}
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
        ) : logoUrl ? (
          <img src={logoUrl} alt={`${clientName} logo`} className="h-full w-full object-contain p-1" />
        ) : (
          <Upload className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary/60 transition-colors" />
        )}
      </button>
      {!isUploading && (
        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-muted-foreground/50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          {logoUrl ? "Replace" : "Upload logo"}
        </span>
      )}
    </div>
  );
}
