import { create } from 'zustand';
import { Paper, PaperMetadata, Tab, Config } from '../types';

interface AppState {
  // Papers
  papers: PaperMetadata[];
  currentPaper: Paper | null;

  // Tabs
  tabs: Tab[];
  activeTabId: string | null;

  // UI State
  sidebarCollapsed: boolean;
  annotationPanelHeight: number;
  annotationPanelCollapsed: boolean;
  filterText: string;
  selectedPaperIds: string[];
  tagFilter: string[];

  // Config
  config: Config | null;
  lastUsedHighlightColor: string;

  // Actions
  setPapers: (papers: PaperMetadata[]) => void;
  setCurrentPaper: (paper: Paper | null) => void;
  updatePaperInList: (paper: PaperMetadata) => void;
  removePaperFromList: (paperId: string) => void;

  addTab: (tab: Tab) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;

  toggleSidebar: () => void;
  setAnnotationPanelHeight: (height: number) => void;
  toggleAnnotationPanel: () => void;
  setFilterText: (text: string) => void;
  setSelectedPaperIds: (ids: string[]) => void;
  togglePaperSelection: (id: string) => void;
  setTagFilter: (tags: string[]) => void;

  setConfig: (config: Config) => void;
  setLastUsedHighlightColor: (color: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  papers: [],
  currentPaper: null,
  tabs: [],
  activeTabId: null,
  sidebarCollapsed: false,
  annotationPanelHeight: 250,
  annotationPanelCollapsed: true,
  filterText: '',
  selectedPaperIds: [],
  tagFilter: [],
  config: null,
  lastUsedHighlightColor: 'yellow',

  // Actions
  setPapers: (papers) => set({ papers }),

  setCurrentPaper: (paper) => set({ currentPaper: paper }),

  updatePaperInList: (paper) => set((state) => ({
    papers: state.papers.map(p => p.id === paper.id ? paper : p)
  })),

  removePaperFromList: (paperId) => set((state) => ({
    papers: state.papers.filter(p => p.id !== paperId)
  })),

  addTab: (tab) => set((state) => {
    // Check if tab already exists
    const existing = state.tabs.find(t => t.id === tab.id);
    if (existing) {
      return { activeTabId: tab.id };
    }
    return { tabs: [...state.tabs, tab], activeTabId: tab.id };
  }),

  closeTab: (tabId) => set((state) => {
    const newTabs = state.tabs.filter(t => t.id !== tabId);
    let newActiveTabId = state.activeTabId;

    if (state.activeTabId === tabId && newTabs.length > 0) {
      // Set active to the previous tab
      const closedIndex = state.tabs.findIndex(t => t.id === tabId);
      newActiveTabId = newTabs[Math.max(0, closedIndex - 1)]?.id || newTabs[0]?.id;
    }

    return { tabs: newTabs, activeTabId: newActiveTabId };
  }),

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setAnnotationPanelHeight: (height) => set({ annotationPanelHeight: height }),

  toggleAnnotationPanel: () => set((state) => ({
    annotationPanelCollapsed: !state.annotationPanelCollapsed
  })),

  setFilterText: (text) => set({ filterText: text }),

  setSelectedPaperIds: (ids) => set({ selectedPaperIds: ids }),

  togglePaperSelection: (id) => set((state) => {
    const isSelected = state.selectedPaperIds.includes(id);
    return {
      selectedPaperIds: isSelected
        ? state.selectedPaperIds.filter(pid => pid !== id)
        : [...state.selectedPaperIds, id]
    };
  }),

  setTagFilter: (tags) => set({ tagFilter: tags }),

  setConfig: (config) => set({ config }),

  setLastUsedHighlightColor: (color) => set({ lastUsedHighlightColor: color }),
}));
