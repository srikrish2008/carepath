import React from 'react';
import { CarePathAIChat } from '../components/ai/CarePathAIChat';

interface AIAssistantPageProps {
  onNavigatePage: (page: string) => void;
}

export const AIAssistantPage: React.FC<AIAssistantPageProps> = ({ onNavigatePage }) => {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <CarePathAIChat onNavigatePage={onNavigatePage} />
    </div>
  );
};
