import React, { useState, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import Spinner from './common/Spinner';

type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const generateImage = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate an image.');
      return;
    }
    setLoading(true);
    setError('');
    setImageUrl(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio,
        },
      });

      const base64ImageBytes = response.generatedImages[0]?.image?.imageBytes;
      if (base64ImageBytes) {
        setImageUrl(`data:image/jpeg;base64,${base64ImageBytes}`);
      } else {
        throw new Error('No image data received from API.');
      }
    } catch (err) {
      console.error('Error generating image:', err);
      setError('Failed to generate image. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [prompt, aspectRatio]);
  
  const aspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Image Generator</h2>
      <div className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A photo of a futuristic city skyline at sunset, with flying cars."
          className="w-full h-24 bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          disabled={loading}
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
          <div className="flex flex-wrap gap-2">
            {aspectRatios.map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${aspectRatio === ratio ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generateImage}
          className="w-full bg-cyan-500 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-600 disabled:bg-cyan-800 disabled:cursor-not-allowed flex items-center justify-center"
          disabled={loading || !prompt}
        >
          {loading ? <Spinner /> : 'Generate Image'}
        </button>

        {error && <p className="text-red-400 text-center">{error}</p>}
        
        <div className="mt-4 flex justify-center items-center bg-gray-900 rounded-lg p-4 min-h-[20rem]">
          {loading && <Spinner />}
          {imageUrl && !loading && (
            <img src={imageUrl} alt="Generated" className="rounded-lg shadow-lg max-w-full max-h-[80vh]" />
          )}
          {!imageUrl && !loading && <p className="text-gray-500">Your generated image will appear here.</p>}
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;
