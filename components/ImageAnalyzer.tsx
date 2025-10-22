import React, { useState, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import Spinner from './common/Spinner';
import { fileToBase64 } from '../utils/helpers';

const ImageAnalyzer: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImageUrl(URL.createObjectURL(file));
      setResult('');
      setError('');
    }
  };

  const analyzeImage = useCallback(async () => {
    if (!image || !prompt.trim()) {
      setError('Please upload an image and enter a prompt.');
      return;
    }
    setLoading(true);
    setError('');
    setResult('');

    try {
      const base64Image = await fileToBase64(image);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: image.type, data: base64Image } },
            { text: prompt },
          ],
        },
      });

      setResult(response.text);
    } catch (err) {
      console.error('Error analyzing image:', err);
      setError('Failed to analyze the image. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [image, prompt]);

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Image Analyzer</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="image-upload" className="block text-sm font-medium text-gray-300 mb-2">Upload Image</label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-600"
          />
        </div>

        {imageUrl && (
          <div className="flex justify-center">
            <img src={imageUrl} alt="Uploaded preview" className="mt-2 rounded-lg max-h-64 shadow-lg" />
          </div>
        )}
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What do you want to know about this image?"
          className="w-full h-24 bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          disabled={loading || !image}
        />
        
        <button
          onClick={analyzeImage}
          className="w-full bg-cyan-500 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-600 disabled:bg-cyan-800 disabled:cursor-not-allowed flex items-center justify-center"
          disabled={loading || !image || !prompt}
        >
          {loading ? <Spinner /> : 'Analyze Image'}
        </button>

        {error && <p className="text-red-400">{error}</p>}

        {result && (
          <div className="mt-4 p-4 bg-gray-900 rounded-md">
            <h3 className="font-semibold text-cyan-400 mb-2">Analysis:</h3>
            <p className="text-gray-200 whitespace-pre-wrap">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageAnalyzer;
