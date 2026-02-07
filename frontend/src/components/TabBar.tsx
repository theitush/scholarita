import React from 'react';
import { useAppStore } from '../stores/appStore';

export const TabBar: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, closeTab } = useAppStore();

  const handleCloseTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    closeTab(tabId);
  };

  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span>{tab.title}</span>
          <span className="tab-close" onClick={(e) => handleCloseTab(tab.id, e)}>×</span>
        </div>
      ))}
    </div>
  );
};
