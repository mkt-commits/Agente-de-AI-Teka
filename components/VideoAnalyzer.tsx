import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import Spinner from './common/Spinner';

const VideoAnalyzer: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyzeVideo = async () => {
    if (!prompt.trim()) {
      setError('Please describe the video content to analyze.');
      return;
    }
    setLoading(true);
    setError('');
    setResult('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const fullPrompt = `Analyze the following video description to identify key information, objects, and potential themes. Description: "${prompt}"`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: fullPrompt,
      });

      setResult(response.text);
    } catch (err) {
      console.error('Error analyzing video description:', err);
      setError('An error occurred during analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Video Analyzer</h2>
      <div className="space-y-4">
        <div className="p-3 bg-cyan-900/50 border border-cyan-700 rounded-md">
            <p className="text-sm text-cyan-200">
                <strong>Note:</strong> Direct video upload and analysis is a complex process. This feature uses Gemini 2.5 Pro to analyze a detailed text description you provide about a video's content.
            </p>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the video you want to analyze in detail. For example: 'A person is walking through a snowy forest at dusk. They are wearing a red jacket and carrying a backpack...'"
          className="w-full h-40 bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          disabled={loading}
        />
        <button
          onClick={analyzeVideo}
          className="w-full bg-cyan-500 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-600 disabled:bg-cyan-800 disabled:cursor-not-allowed flex items-center justify-center"
          disabled={loading || !prompt}
        >
          {loading ? <Spinner /> : 'Analyze Video Content'}
        </button>
        {error && <p className="text-red-400">{error}</p>}
        {result && (
          <div className="mt-4 p-4 bg-gray-900 rounded-md">
            <h3 className="font-semibold text-cyan-400 mb-2">Analysis Result:</h3>
            <p className="text-gray-200 whitespace-pre-wrap">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoAnalyzer;
