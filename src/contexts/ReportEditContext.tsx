import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { CurationState } from "@/hooks/useClientReports";

interface ReportEditState {
  isEditing: boolean;
  toggleEdit: () => void;
  hiddenSections: Set<string>;
  hideSection: (id: string) => void;
  showSection: (id: string) => void;
  resetHidden: () => void;
  textOverrides: Map<string, string>;
  setTextOverride: (id: string, value: string) => void;
  getTextOverride: (id: string) => string | undefined;
  dismissedCards: Set<string>;
  dismissCard: (id: string) => void;
  restoreCard: (id: string) => void;
  manualHighlights: CurationState["manualHighlights"];
  setManualHighlights: (highlights: CurationState["manualHighlights"]) => void;
  getCurationState: (aiSummary?: string) => CurationState;
  loadCurationState: (state: CurationState) => void;
}

const ReportEditContext = createContext<ReportEditState | null>(null);

export function ReportEditProvider({ children }: { children: ReactNode }) {
  const [isEditing, setIsEditing] = useState(false);
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());
  const [textOverrides, setTextOverrides] = useState<Map<string, string>>(new Map());
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());
  const [manualHighlights, setManualHighlights] = useState<CurationState["manualHighlights"]>([]);

  const toggleEdit = useCallback(() => setIsEditing((v) => !v), []);

  const hideSection = useCallback((id: string) => {
    setHiddenSections((prev) => new Set(prev).add(id));
  }, []);

  const showSection = useCallback((id: string) => {
    setHiddenSections((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const resetHidden = useCallback(() => setHiddenSections(new Set()), []);

  const setTextOverride = useCallback((id: string, value: string) => {
    setTextOverrides((prev) => new Map(prev).set(id, value));
  }, []);

  const getTextOverride = useCallback((id: string) => textOverrides.get(id), [textOverrides]);

  const dismissCard = useCallback((id: string) => {
    setDismissedCards((prev) => new Set(prev).add(id));
  }, []);

  const restoreCard = useCallback((id: string) => {
    setDismissedCards((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const getCurationState = useCallback((aiSummary?: string): CurationState => {
    return {
      hiddenSections: Array.from(hiddenSections),
      dismissedCards: Array.from(dismissedCards),
      textOverrides: Object.fromEntries(textOverrides),
      manualHighlights,
      aiSummary,
    };
  }, [hiddenSections, dismissedCards, textOverrides, manualHighlights]);

  const loadCurationState = useCallback((state: CurationState) => {
    setHiddenSections(new Set(state.hiddenSections || []));
    setDismissedCards(new Set(state.dismissedCards || []));
    setTextOverrides(new Map(Object.entries(state.textOverrides || {})));
    setManualHighlights(state.manualHighlights || []);
  }, []);

  return (
    <ReportEditContext.Provider
      value={{ isEditing, toggleEdit, hiddenSections, hideSection, showSection, resetHidden, textOverrides, setTextOverride, getTextOverride, dismissedCards, dismissCard, restoreCard, manualHighlights, setManualHighlights, getCurationState, loadCurationState }}
    >
      {children}
    </ReportEditContext.Provider>
  );
}

export function useReportEdit() {
  const ctx = useContext(ReportEditContext);
  if (!ctx) throw new Error("useReportEdit must be used within ReportEditProvider");
  return ctx;
}
