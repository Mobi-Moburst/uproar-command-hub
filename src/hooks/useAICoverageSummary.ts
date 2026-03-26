import { useState, useCallback } from "react";
import { toast } from "sonner";

const SUMMARY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coverage-summary`;

export interface SummaryMetrics {
  totalPlacements: number;
  totalReach: number;
  totalAdValue: number;
  awardWins: number;
  ytdPlacements: number;
  typeBreakdown: { type: string; count: number; pct: number }[];
  topOutlets: { outlet: string; count: number; reach: number }[];
  samplesSent: number;
  samplesConverted: number;
  sampleConversionRate: number;
  briefingsHeld: number;
  briefingsConverted: number;
  briefingConversionRate: number;
  topReporters: { name: string; conversions: number }[];
  monthlyReach: { label: string; reach: number; count: number }[];
}

export function useAICoverageSummary() {
  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(
    async (clientName: string, periodLabel: string, metrics: SummaryMetrics) => {
      setSummary("");
      setIsGenerating(true);

      try {
        const resp = await fetch(SUMMARY_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ clientName, periodLabel, metrics }),
        });

        if (!resp.ok || !resp.body) {
          const err = await resp.json().catch(() => ({ error: "Failed to generate summary" }));
          toast.error(err.error || "Failed to generate summary");
          setIsGenerating(false);
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIdx: number;
          while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIdx);
            buffer = buffer.slice(newlineIdx + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                fullText += content;
                setSummary(fullText);
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        // Flush remaining
        if (buffer.trim()) {
          for (let raw of buffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                fullText += content;
                setSummary(fullText);
              }
            } catch { /* ignore */ }
          }
        }
      } catch (e) {
        console.error("AI summary error:", e);
        toast.error("Failed to generate AI summary");
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return { summary, isGenerating, generate, setSummary };
}
