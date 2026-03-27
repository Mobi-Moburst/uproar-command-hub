import { createContext, useContext, useState, useCallback, ReactNode, Dispatch, SetStateAction } from "react";
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
  setManualHighlights: Dispatch<SetStateAction<CurationState["manualHighlights"]>>;
  customInsights: NonNullable<CurationState["customInsights"]>;
  setCustomInsights: Dispatch<SetStateAction<NonNullable<CurationState["customInsights"]>>>;
  prOverview: string;
  setPrOverview: Dispatch<SetStateAction<string>>;
  takeaways: string[];
  setTakeaways: Dispatch<SetStateAction<string[]>>;
  upcomingInitiatives: string[];
  setUpcomingInitiatives: Dispatch<SetStateAction<string[]>>;
  kpiGoals: Record<string, string>;
  setKpiGoal: (id: string, value: string) => void;
  categoryNarratives: Record<string, string>;
  setCategoryNarrative: (type: string, value: string) => void;
  getCurationState: (aiSummary?: string) => CurationState;
  loadCurationState: (state: CurationState) => void;
}

const ReportEditContext = createContext<ReportEditState | null>(null);

const DEFAULT_CUSTOM_INSIGHTS: NonNullable<CurationState["customInsights"]> = {
  strengths: [],
  opportunities: [],
};

function normalizeCustomInsightList(
  list: unknown,
  prefix: string
): Array<{ id: string; text: string }> {
  if (!Array.isArray(list)) return [];
  return list
    .map((item, index) => {
      if (typeof item === "string") {
        return { id: `${prefix}-legacy-${index}`, text: item };
      }
      if (item && typeof item === "object") {
        const maybe = item as { id?: string; text?: string };
        return {
          id: maybe.id || `${prefix}-${index}`,
          text: maybe.text || "",
        };
      }
      return null;
    })
    .filter((item): item is { id: string; text: string } => !!item);
}

export function ReportEditProvider({ children }: { children: ReactNode }) {
  const [isEditing, setIsEditing] = useState(false);
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());
  const [textOverrides, setTextOverrides] = useState<Map<string, string>>(new Map());
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());
  const [manualHighlights, setManualHighlights] = useState<CurationState["manualHighlights"]>([]);
  const [customInsights, setCustomInsights] = useState<NonNullable<CurationState["customInsights"]>>(DEFAULT_CUSTOM_INSIGHTS);
  const [prOverview, setPrOverview] = useState("");
  const [takeaways, setTakeaways] = useState<string[]>([]);
  const [upcomingInitiatives, setUpcomingInitiatives] = useState<string[]>([]);
  const [kpiGoals, setKpiGoals] = useState<Record<string, string>>({});
  const [categoryNarratives, setCategoryNarrativesState] = useState<Record<string, string>>({});

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

  const setKpiGoal = useCallback((id: string, value: string) => {
    setKpiGoals((prev) => ({ ...prev, [id]: value }));
  }, []);

  const setCategoryNarrative = useCallback((type: string, value: string) => {
    setCategoryNarrativesState((prev) => ({ ...prev, [type]: value }));
  }, []);

  const getCurationState = useCallback((aiSummary?: string): CurationState => {
    return {
      hiddenSections: Array.from(hiddenSections),
      dismissedCards: Array.from(dismissedCards),
      textOverrides: Object.fromEntries(textOverrides),
      manualHighlights,
      customInsights,
      aiSummary,
      prOverview: prOverview || undefined,
      takeaways: takeaways.length > 0 ? takeaways : undefined,
      upcomingInitiatives: upcomingInitiatives.length > 0 ? upcomingInitiatives : undefined,
      kpiGoals: Object.keys(kpiGoals).length > 0 ? kpiGoals : undefined,
      categoryNarratives: Object.keys(categoryNarratives).length > 0 ? categoryNarratives : undefined,
    };
  }, [hiddenSections, dismissedCards, textOverrides, manualHighlights, customInsights, prOverview, takeaways, upcomingInitiatives, kpiGoals, categoryNarratives]);

  const loadCurationState = useCallback((state: CurationState) => {
    setHiddenSections(new Set(state.hiddenSections || []));
    setDismissedCards(new Set(state.dismissedCards || []));
    setTextOverrides(new Map(Object.entries(state.textOverrides || {})));
    setManualHighlights(state.manualHighlights || []);
    setPrOverview(state.prOverview || "");
    setTakeaways(state.takeaways || []);
    setUpcomingInitiatives(state.upcomingInitiatives || []);
    setKpiGoals(state.kpiGoals || {});
    setCategoryNarrativesState(state.categoryNarratives || {});

    const rawCustom = state.customInsights || DEFAULT_CUSTOM_INSIGHTS;
    setCustomInsights({
      strengths: normalizeCustomInsightList(rawCustom.strengths, "strength"),
      opportunities: normalizeCustomInsightList(rawCustom.opportunities, "opportunity"),
    });
  }, []);

  return (
    <ReportEditContext.Provider
      value={{
        isEditing,
        toggleEdit,
        hiddenSections,
        hideSection,
        showSection,
        resetHidden,
        textOverrides,
        setTextOverride,
        getTextOverride,
        dismissedCards,
        dismissCard,
        restoreCard,
        manualHighlights,
        setManualHighlights,
        customInsights,
        setCustomInsights,
        prOverview,
        setPrOverview,
        takeaways,
        setTakeaways,
        upcomingInitiatives,
        setUpcomingInitiatives,
        kpiGoals,
        setKpiGoal,
        categoryNarratives,
        setCategoryNarrative,
        getCurationState,
        loadCurationState,
      }}
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
