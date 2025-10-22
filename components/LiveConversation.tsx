import React, { useState, useRef, useCallback, useEffect } from 'react';
// FIX: LiveSession is not an exported member of @google/genai.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/helpers';
import Spinner from './common/Spinner';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

const LiveConversation: React.FC = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{ user: string, model: string }[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState({ user: '', model: '' });
  const [error, setError] = useState<string | null>(null);

  // FIX: Use 'any' for the session promise ref type as LiveSession is not exported.
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const stopAudioPlayback = useCallback(() => {
    audioSourcesRef.current.forEach(source => {
      source.stop();
    });
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const stopSession = useCallback(() => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close());
      sessionPromiseRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
    }
    stopAudioPlayback();
    setIsSessionActive(false);
  }, [stopAudioPlayback]);

  const startSession = useCallback(async () => {
    if (isSessionActive) {
      stopSession();
      return;
    }

    try {
      setError(null);
      setIsSessionActive(true);
      setTranscriptions([]);
      setCurrentTranscription({ user: '', model: '' });

      inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;

      microphoneStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: 'You are TEKA, a friendly and helpful AI assistant.',
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            const source = inputAudioContextRef.current!.createMediaStreamSource(microphoneStreamRef.current!);
            scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              
              // FIX: Replaced inefficient and potentially incorrect audio data conversion with the recommended approach.
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };
            source.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            setCurrentTranscription(prev => {
              let userText = prev.user;
              let modelText = prev.model;
              if (message.serverContent?.inputTranscription) {
                userText += message.serverContent.inputTranscription.text;
              }
              if (message.serverContent?.outputTranscription) {
                modelText += message.serverContent.outputTranscription.text;
              }
              
              if(message.serverContent?.turnComplete) {
                  setTranscriptions(hist => [...hist, { user: userText, model: modelText }]);
                  return { user: '', model: ''};
              }

              return { user: userText, model: modelText };
            });

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const outputCtx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => { audioSourcesRef.current.delete(source); });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              stopAudioPlayback();
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setError('An error occurred during the session. Please try again.');
            stopSession();
          },
          onclose: (e: CloseEvent) => {
            stopSession();
          },
        },
      });
    } catch (err) {
      console.error('Failed to start session:', err);
      setError('Could not access microphone or start AI session.');
      setIsSessionActive(false);
    }
  }, [isSessionActive, stopSession, stopAudioPlayback]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg flex flex-col h-full">
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Live Conversation</h2>
      <button
        onClick={startSession}
        className={`w-full py-3 px-4 font-bold rounded-md text-white transition-colors flex items-center justify-center ${
          isSessionActive ? 'bg-red-500 hover:bg-red-600' : 'bg-cyan-500 hover:bg-cyan-600'
        }`}
      >
        {isSessionActive ? 'Stop Session' : 'Start Conversation'}
      </button>
      {error && <p className="text-red-400 mt-2 text-center">{error}</p>}
      
      <div className="flex-grow mt-4 p-2 bg-gray-900 rounded-md overflow-y-auto space-y-4">
        {transcriptions.map((t, i) => (
          <div key={i}>
            <p><strong className="text-cyan-400">You:</strong> <span className="text-gray-200">{t.user}</span></p>
            <p><strong className="text-purple-400">TEKA:</strong> <span className="text-gray-200">{t.model}</span></p>
          </div>
        ))}
         {(currentTranscription.user || currentTranscription.model) && (
            <div>
              {currentTranscription.user && <p><strong className="text-cyan-400">You:</strong> <span className="text-gray-400 italic">{currentTranscription.user}</span></p>}
              {currentTranscription.model && <p><strong className="text-purple-400">TEKA:</strong> <span className="text-gray-400 italic">{currentTranscription.model}</span></p>}
            </div>
          )}
        {!isSessionActive && transcriptions.length === 0 && (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Press "Start Conversation" to talk with TEKA.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default LiveConversation;