import React, { useState } from 'react';
import { Tab } from './types';

// Import feature components
import Chatbot from './components/Chatbot';
import GeneralTasks from './components/GeneralTasks';
import ImageAnalyzer from './components/ImageAnalyzer';
import ImageEditor from './components/ImageEditor';
import ImageGenerator from './components/ImageGenerator';
import LiveConversation from './components/LiveConversation';
import GroundedSearch from './components/GroundedSearch';
import TextToSpeech from './components/TextToSpeech';
import VideoAnalyzer from './components/VideoAnalyzer';
import VideoGenerator from './components/VideoGenerator';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CHATBOT);

  const renderContent = () => {
    switch (activeTab) {
      case Tab.CHATBOT:
        return <Chatbot />;
      case Tab.GENERAL_TASKS:
        return <GeneralTasks />;
      case Tab.IMAGE_ANALYZER:
        return <ImageAnalyzer />;
      case Tab.IMAGE_EDITOR:
        return <ImageEditor />;
      case Tab.IMAGE_GENERATOR:
        return <ImageGenerator />;
      case Tab.LIVE_CONVERSATION:
        return <LiveConversation />;
      case Tab.GROUNDED_SEARCH:
        return <GroundedSearch />;
      case Tab.TEXT_TO_SPEECH:
        return <TextToSpeech />;
      case Tab.VIDEO_ANALYZER:
        return <VideoAnalyzer />;
      case Tab.VIDEO_GENERATOR:
        return <VideoGenerator />;
      default:
        return <Chatbot />;
    }
  };
  
  const tabs = Object.values(Tab);

  return (
    <div className="min-h-screen bg-gray-900 text-cyan-400 font-sans">
      <div className="container mx-auto p-4">
        <header className="text-center my-6">
          <h1 className="text-5xl font-extrabold tracking-tight">
            bem vindo(a) a <span className="text-white">TEKA</span>
          </h1>
          <p className="text-cyan-300/80 mt-2 text-lg">sua assistente</p>
        </header>

        <main className="bg-black/30 backdrop-blur-sm rounded-xl shadow-2xl shadow-cyan-500/10 border border-cyan-500/20">
          <div className="p-2">
            <div className="flex flex-wrap justify-center gap-1 md:gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 text-xs md:text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-400 ${
                    activeTab === tab
                      ? 'bg-cyan-500 text-white shadow-md'
                      : 'text-cyan-200 hover:bg-gray-700/50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 md:p-6 min-h-[60vh]">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
