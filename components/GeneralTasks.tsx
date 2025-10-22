import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import Spinner from './common/Spinner';

type TaskMode = 'complex' | 'fast';

const GeneralTasks: React.FC = () => {
  const [mode, setMode] = useState<TaskMode>('fast');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    setLoading(true);
    setError('');
    setResult('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      // FIX: The model name for gemini lite / flash lite should be 'gemini-flash-lite-latest'.
      const model = mode === 'complex' ? 'gemini-2.5-pro' : 'gemini-flash-lite-latest';
      const config = mode === 'complex' ? { thinkingConfig: { thinkingBudget: 32768 } } : {};
      
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config
      });

      setResult(response.text);
    } catch (err) {
      console.error(`Error during ${mode} task:`, err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = () => {
    if (mode === 'complex') {
      return 'e.g., "Write a business plan for a tech startup that uses AI to personalize education."';
    }
    return 'e.g., "Summarize the concept of quantum computing in one paragraph."';
  }

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      <h2 className="text-xl font-bold text-cyan-400 mb-4">General Tasks</h2>
      <div className="flex space-x-2 mb-4 border-b border-gray-700">
        <button 
          onClick={() => setMode('fast')} 
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${mode === 'fast' ? 'bg-cyan-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
            Fast Task (Flash-Lite)
        </button>
        <button 
          onClick={() => setMode('complex')} 
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${mode === 'complex' ? 'bg-cyan-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
            Complex Task (Pro + Thinking)
        </button>
      </div>

      <div className="space-y-4">
        <p className="text-gray-300 text-sm">
          {mode === 'fast'
            ? 'Use Gemini 2.5 Flash-Lite for tasks that need a quick, low-latency response.'
            : 'Use Gemini 2.5 Pro with maximum thinking budget for your most complex problems.'}
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={getPlaceholder()}
          className="w-full h-40 bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          disabled={loading}
        />
        <button
          onClick={handleGenerate}
          className="w-full bg-cyan-500 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-600 disabled:bg-cyan-800 disabled:cursor-not-allowed flex items-center justify-center"
          disabled={loading}
        >
          {loading ? <Spinner /> : 'Generate'}
        </button>
        {error && <p className="text-red-400">{error}</p>}
        {result && (
          <div className="mt-4 p-4 bg-gray-900 rounded-md">
            <h3 className="font-semibold text-cyan-400 mb-2">Result:</h3>
            <p className="text-gray-200 whitespace-pre-wrap">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneralTasks;