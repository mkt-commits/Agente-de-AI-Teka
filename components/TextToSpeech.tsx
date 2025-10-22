import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { decode, decodeAudioData } from '../utils/helpers';
import Spinner from './common/Spinner';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

const TextToSpeech: React.FC = () => {
  const [text, setText] = useState('bem vindo(a) a TEKA sua assistente');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Initialize AudioContext on user interaction (handled in generateAndPlaySpeech)
    return () => {
      // Cleanup on unmount
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const generateAndPlaySpeech = useCallback(async () => {
    if (!text.trim()) {
      setError('Please enter some text to synthesize.');
      return;
    }
    setLoading(true);
    setError('');
    
    // Stop any currently playing audio
    if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        setIsPlaying(false);
    }

    try {
      // Lazy initialization of AudioContext on first play
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      }
      // Resume context if it was suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say with a friendly tone: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error("No audio data received.");
      }
      
      const audioBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
      
      audioSourceRef.current = source;
      setIsPlaying(true);

    } catch (err) {
      console.error("TTS Error:", err);
      setError("Failed to generate speech. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [text]);
  
  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Text-to-Speech</h2>
      <div className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to convert to speech..."
          className="w-full h-32 bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          disabled={loading || isPlaying}
        />
        <button
          onClick={generateAndPlaySpeech}
          className="w-full bg-cyan-500 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-600 disabled:bg-cyan-800 disabled:cursor-not-allowed flex items-center justify-center"
          disabled={loading || isPlaying}
        >
          {loading ? <Spinner /> : isPlaying ? 'Playing...' : 'Generate and Play'}
        </button>
        {error && <p className="text-red-400 text-center">{error}</p>}
      </div>
    </div>
  );
};

export default TextToSpeech;
