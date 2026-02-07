import React, { useEffect, useState } from 'react';
import { useAppStore } from './stores/appStore';
import { Sidebar } from './components/Sidebar';
import { TabBar } from './components/TabBar';
import { PDFViewer } from './components/PDFViewer';
import { PDFViewerTest } from './components/PDFViewerTest';
import { AnnotationPanel } from './components/AnnotationPanel';
import { api } from './services/api';
import './App.css';

function App() {
  const {
    papers,
    setPapers,
    tabs,
    activeTabId,
    setConfig,
  } = useAppStore();

  const [importInput, setImportInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [loadedPapers, setLoadedPapers] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Load current paper when active tab changes
    if (activeTabId) {
      const tab = tabs.find(t => t.id === activeTabId);
      if (tab && tab.type === 'paper' && tab.paperId) {
        loadPaper(tab.paperId);
      }
    }
  }, [activeTabId]);

  const loadInitialData = async () => {
    try {
      const [papersList, config] = await Promise.all([
        api.getPapers(),
        api.getConfig(),
      ]);
      setPapers(papersList);
      setConfig(config);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadPaper = async (paperId: string) => {
    // Check if paper is already loaded
    if (loadedPapers.has(paperId)) {
      return;
    }

    try {
      const paper = await api.getPaper(paperId);
      setLoadedPapers(new Map(loadedPapers.set(paperId, paper)));
    } catch (error) {
      console.error('Error loading paper:', error);
    }
  };

  const handleImport = async () => {
    if (!importInput.trim()) return;

    setImporting(true);
    setImportMessage('');

    try {
      const result = await api.importPaper(importInput);

      if (result.status === 'success') {
        setImportMessage('✓ Paper imported successfully');
        setImportInput('');
        // Reload papers list
        const papersList = await api.getPapers();
        setPapers(papersList);
      } else if (result.status === 'partial') {
        setImportMessage('⚠ Metadata imported, but PDF unavailable');
        setImportInput('');
        const papersList = await api.getPapers();
        setPapers(papersList);
      } else {
        setImportMessage(`✗ ${result.message}`);
      }
    } catch (error: any) {
      setImportMessage(`✗ Error: ${error.message}`);
    } finally {
      setImporting(false);
      setTimeout(() => setImportMessage(''), 5000);
    }
  };


  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className="app">
      <div className="top-bar">
        <input
          type="text"
          className="import-input"
          placeholder="Paste DOI or URL to import paper..."
          value={importInput}
          onChange={(e) => setImportInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleImport()}
          disabled={importing}
        />
        <button className="btn" onClick={handleImport} disabled={importing}>
          {importing ? 'Importing...' : 'Import'}
        </button>
        {importMessage && (
          <span style={{ fontSize: '13px', color: importMessage.startsWith('✓') ? '#4caf50' : '#d32f2f' }}>
            {importMessage}
          </span>
        )}
      </div>

      <div className="main-container">
        <Sidebar />

        <div className="content-area">
          <TabBar />

          {!activeTab && (
            <div className="empty-state">
              <h2>Welcome to Scholarita</h2>
              <p>Import a paper or select one from the sidebar to get started</p>
            </div>
          )}

          {/* Render all tabs but only show the active one */}
          {tabs.map(tab => {
            if (tab.type !== 'paper' || !tab.paperId) return null;
            const paper = loadedPapers.get(tab.paperId);
            if (!paper) return null;

            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                style={{ display: isActive ? 'contents' : 'none' }}
              >
                <PDFViewer paper={paper} />
                <AnnotationPanel paper={paper} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="status-bar">
        <span>{papers.length} papers</span>
        {activeTabId && (() => {
          const activeTab = tabs.find(t => t.id === activeTabId);
          const currentPaper = activeTab?.paperId ? loadedPapers.get(activeTab.paperId) : null;
          return currentPaper && (
            <span>{currentPaper.highlights?.length || 0} highlights</span>
          );
        })()}
      </div>
    </div>
  );
}

export default App;
