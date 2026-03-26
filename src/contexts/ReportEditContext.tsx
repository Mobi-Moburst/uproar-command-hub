import { createContext, useContext, useState, useCallback, ReactNode } from "react";

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
}

const ReportEditContext = createContext<ReportEditState | null>(null);

export function ReportEditProvider({ children }: { children: ReactNode }) {
  const [isEditing, setIsEditing] = useState(false);
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());
  const [textOverrides, setTextOverrides] = useState<Map<string, string>>(new Map());

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

  return (
    <ReportEditContext.Provider
      value={{ isEditing, toggleEdit, hiddenSections, hideSection, showSection, resetHidden, textOverrides, setTextOverride, getTextOverride }}
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
