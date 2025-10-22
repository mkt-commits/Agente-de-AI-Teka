import React, { useState } from 'react';
import { GoogleGenAI, GroundingChunk } from '@google/genai';
import Spinner from './common/Spinner';

type SearchMode = 'web' | 'maps';

interface Source {
  title: string;
  uri: string;
}

const GroundedSearch: React.FC = () => {
  const [mode, setMode] = useState<SearchMode>('web');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!prompt.trim()) {
      setError('Please enter a query.');
      return;
    }
    setLoading(true);
    setError('');
    setResult('');
    setSources([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      const tools = mode === 'web' ? [{ googleSearch: {} }] : [{ googleMaps: {} }];
      let toolConfig = {};

      if (mode === 'maps') {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          toolConfig = {
            retrievalConfig: {
              latLng: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }
            }
          };
        } catch (geoError) {
          console.warn("Geolocation permission denied or failed. Proceeding without location.", geoError);
          setError("Could not get your location. Maps search may be less accurate.");
        }
      }
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { tools, toolConfig },
      });

      setResult(response.text);

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[];
      if (groundingChunks) {
        const extractedSources = groundingChunks.map(chunk => {
            if (chunk.web) return { title: chunk.web.title || chunk.web.uri, uri: chunk.web.uri };
            if (chunk.maps) return { title: chunk.maps.title || chunk.maps.uri, uri: chunk.maps.uri };
            return null;
        }).filter((s): s is Source => s !== null);
        setSources(extractedSources);
      }
    } catch (err) {
      console.error(`Error during ${mode} search:`, err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = () => mode === 'web' 
    ? 'e.g., "Who won the most recent F1 race?"'
    : 'e.g., "Find the best-rated coffee shops near me."';

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Grounded Search</h2>
      <div className="flex space-x-2 mb-4 border-b border-gray-700">
        <button 
          onClick={() => setMode('web')} 
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${mode === 'web' ? 'bg-cyan-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
            Web Search
        </button>
        <button 
          onClick={() => setMode('maps')} 
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${mode === 'maps' ? 'bg-cyan-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
            Maps Search
        </button>
      </div>

      <div className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={getPlaceholder()}
          className="w-full h-24 bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          disabled={loading}
        />
        <button
          onClick={handleSearch}
          className="w-full bg-cyan-500 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-600 disabled:bg-cyan-800 disabled:cursor-not-allowed flex items-center justify-center"
          disabled={loading}
        >
          {loading ? <Spinner /> : 'Search'}
        </button>
        {error && <p className="text-red-400">{error}</p>}
        {result && (
          <div className="mt-4 p-4 bg-gray-900 rounded-md">
            <h3 className="font-semibold text-cyan-400 mb-2">Result:</h3>
            <p className="text-gray-200 whitespace-pre-wrap">{result}</p>
            {sources.length > 0 && (
                <div className="mt-4 border-t border-gray-700 pt-2">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Sources:</h4>
                    <ul className="list-disc list-inside space-y-1">
                        {sources.map((source, index) => (
                            <li key={index} className="text-sm">
                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline break-all">
                                    {source.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroundedSearch;
