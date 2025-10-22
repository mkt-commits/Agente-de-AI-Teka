import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import Spinner from './common/Spinner';
import { fileToBase64 } from '../utils/helpers';

const ImageEditor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setOriginalImage(file);
      setOriginalImageUrl(URL.createObjectURL(file));
      setEditedImageUrl(null);
      setError('');
    }
  };

  const editImage = useCallback(async () => {
    if (!originalImage || !prompt.trim()) {
      setError('Please upload an image and provide an editing instruction.');
      return;
    }
    setLoading(true);
    setError('');
    setEditedImageUrl(null);

    try {
      const base64Image = await fileToBase64(originalImage);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Image, mimeType: originalImage.type } },
            { text: prompt },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      const firstPart = response.candidates?.[0]?.content?.parts[0];
      if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
        const editedBase64 = firstPart.inlineData.data;
        setEditedImageUrl(`data:${firstPart.inlineData.mimeType};base64,${editedBase64}`);
      } else {
        throw new Error('No image data returned from API.');
      }
    } catch (err) {
      console.error('Error editing image:', err);
      setError('Failed to edit image. Please try a different prompt or image.');
    } finally {
      setLoading(false);
    }
  }, [originalImage, prompt]);

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Image Editor</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="image-edit-upload" className="block text-sm font-medium text-gray-300 mb-2">Upload Image to Edit</label>
          <input
            id="image-edit-upload"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-600"
          />
        </div>
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., 'Add a retro filter' or 'Remove the person in the background'"
          className="w-full h-20 bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          disabled={loading || !originalImage}
        />
        
        <button
          onClick={editImage}
          className="w-full bg-cyan-500 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-600 disabled:bg-cyan-800 disabled:cursor-not-allowed flex items-center justify-center"
          disabled={loading || !originalImage || !prompt}
        >
          {loading ? <Spinner /> : 'Edit Image'}
        </button>

        {error && <p className="text-red-400 text-center">{error}</p>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Original</h3>
            {originalImageUrl && <img src={originalImageUrl} alt="Original" className="rounded-lg shadow-lg mx-auto max-h-80" />}
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Edited</h3>
            {loading && <div className="h-80 flex items-center justify-center"><Spinner /></div>}
            {editedImageUrl && !loading && <img src={editedImageUrl} alt="Edited" className="rounded-lg shadow-lg mx-auto max-h-80" />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
