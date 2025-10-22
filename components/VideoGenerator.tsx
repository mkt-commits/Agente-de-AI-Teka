import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { fileToBase64 } from '../utils/helpers';
import Spinner from './common/Spinner';

type AspectRatio = "16:9" | "9:16";
type VideoStatus = "idle" | "generating" | "success" | "error";

// Mock the aistudio object for development if it doesn't exist
if (typeof window !== 'undefined' && !(window as any).aistudio) {
  console.log("Mocking window.aistudio for development.");
  (window as any).aistudio = {
    hasSelectedApiKey: async () => true,
    openSelectKey: async () => console.log("openSelectKey called"),
  };
}

const VideoGenerator: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<VideoStatus>('idle');
  const [error, setError] = useState('');
  const [apiKeySelected, setApiKeySelected] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState<string[]>([]);
  
  const loadingMessageOptions = [
    "Warming up the digital cameras...",
    "Choreographing pixel movements...",
    "Rendering the first few frames...",
    "Applying cinematic lighting...",
    "Syncing digital audio...",
    "This can take a few minutes, hang tight!",
    "Finalizing the special effects...",
    "Almost ready for the premiere...",
  ];

  useEffect(() => {
    const checkApiKey = async () => {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setApiKeySelected(hasKey);
    };
    checkApiKey();
  }, []);

  useEffect(() => {
    let interval: number;
    if (status === 'generating') {
      setLoadingMessages([loadingMessageOptions[0]]);
      let index = 1;
      interval = window.setInterval(() => {
        setLoadingMessages(prev => [...prev, loadingMessageOptions[index % loadingMessageOptions.length]]);
        index++;
      }, 7000);
    }
    return () => clearInterval(interval);
  }, [status]);


  const handleSelectKey = async () => {
    await (window as any).aistudio.openSelectKey();
    // Assume success after dialog opens to avoid race conditions
    setApiKeySelected(true);
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImageUrl(URL.createObjectURL(file));
      setVideoUrl(null);
      setError('');
    }
  };

  const generateVideo = useCallback(async () => {
    if (!image || !prompt.trim()) {
      setError('Please upload an image and enter a prompt.');
      return;
    }
    setStatus('generating');
    setError('');
    setVideoUrl(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const base64Image = await fileToBase64(image);

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        image: { imageBytes: base64Image, mimeType: image.type },
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio },
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const videoBlob = await videoResponse.blob();
        setVideoUrl(URL.createObjectURL(videoBlob));
        setStatus('success');
      } else {
        throw new Error("Video generation completed but no download link was found.");
      }
    } catch (err: any) {
      console.error('Error generating video:', err);
      if (err.message?.includes('Requested entity was not found')) {
        setError('API Key error. Please select your API key again.');
        setApiKeySelected(false);
      } else {
        setError('Failed to generate video. Please try again.');
      }
      setStatus('error');
    }
  }, [image, prompt, aspectRatio]);

  if (!apiKeySelected) {
    return (
      <div className="p-4 bg-gray-800/50 rounded-lg text-center">
        <h2 className="text-xl font-bold text-cyan-400 mb-4">Video Generation with Veo</h2>
        <p className="text-gray-300 mb-4">This feature requires you to select your own API key for billing purposes.</p>
        <p className="text-sm text-gray-400 mb-6">Learn more about billing at <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">ai.google.dev/gemini-api/docs/billing</a>.</p>
        <button onClick={handleSelectKey} className="bg-cyan-500 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-600">
          Select API Key
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Video Generator (Veo)</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">1. Upload a Starting Image</label>
          <input type="file" accept="image/*" onChange={handleImageChange} disabled={status === 'generating'}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-600"
          />
        </div>
        
        {imageUrl && <img src={imageUrl} alt="preview" className="mt-2 rounded-lg max-h-40 mx-auto" />}

        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">2. Describe the Video</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., 'The image comes to life, with gentle wind blowing through the scene.'"
            className="w-full h-24 bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            disabled={status === 'generating'}/>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">3. Select Aspect Ratio</label>
          <div className="flex gap-2">
            <button onClick={() => setAspectRatio('16:9')} disabled={status === 'generating'}
              className={`px-4 py-2 text-sm font-medium rounded-md ${aspectRatio === '16:9' ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              16:9 (Landscape)
            </button>
            <button onClick={() => setAspectRatio('9:16')} disabled={status === 'generating'}
              className={`px-4 py-2 text-sm font-medium rounded-md ${aspectRatio === '9:16' ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              9:16 (Portrait)
            </button>
          </div>
        </div>
        
        <button onClick={generateVideo} disabled={status === 'generating' || !image || !prompt}
          className="w-full bg-cyan-500 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-600 disabled:bg-cyan-800 disabled:cursor-not-allowed flex items-center justify-center">
          {status === 'generating' ? <Spinner /> : 'Generate Video'}
        </button>

        {error && <p className="text-red-400 text-center">{error}</p>}

        <div className="mt-4 flex flex-col justify-center items-center bg-gray-900 rounded-lg p-4 min-h-[20rem]">
          {status === 'generating' && (
            <div className="text-center">
              <Spinner />
              <p className="text-cyan-400 mt-4">Generating your video...</p>
              <div className="mt-2 text-gray-300 text-sm">
                {loadingMessages.map((msg, i) => <p key={i}>{msg}</p>)}
              </div>
            </div>
          )}
          {status === 'success' && videoUrl && (
            <video src={videoUrl} controls autoPlay loop className="rounded-lg max-w-full max-h-[80vh]"/>
          )}
          {status === 'idle' && <p className="text-gray-500">Your generated video will appear here.</p>}
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;
