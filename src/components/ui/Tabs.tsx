"use client";
import React, { useState, ReactNode } from "react";

interface TabItem {
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  initialTab?: number;
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, initialTab = 0, className = "" }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab, idx) => (
          <button
            key={tab.label}
            className={`px-6 py-3 font-medium text-sm focus:outline-none transition border-b-2 -mb-px
              ${activeTab === idx
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"}
              ${tab.disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
            onClick={() => !tab.disabled && setActiveTab(idx)}
            aria-selected={activeTab === idx}
            aria-controls={`tab-panel-${idx}`}
            role="tab"
            tabIndex={tab.disabled ? -1 : 0}
            disabled={tab.disabled}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-6" id={`tab-panel-${activeTab}`} role="tabpanel">
        {tabs[activeTab]?.content}
      </div>
    </div>
  );
};

export default Tabs;
