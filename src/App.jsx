import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Upload, Mic, MicOff, Settings, 
  MessageSquare, Sparkles, FileText, CheckCircle, 
  ChevronRight, Play, Square, Loader2, Send, Mail, X, Cloud, CloudOff
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- ENVIRONMENT VARIABLES ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'nuancepad-production'; 

const INITIAL_TEMPLATES = {
  default: "Standard Summary: Provide an Executive Summary, Decisions Made, and specific Action Items with assigned owners.",
  sales: "Sales Discovery: Extract BANT (Budget, Authority, Need, Timeline). Summarize client pain points, objections, and clear next steps.",
  engineering: "Engineering Standup: Summarize what was done, what is planned, and clearly list any Blockers or technical decisions."
};

// --- THE WORKER CODE (Embedded) ---
const workerCode = `
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';
let transcriber = null;
self.onmessage = async (e) => {
    const { audio } = e.data;
    if (!transcriber) {
        transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base.en');
    }
    const output = await transcriber(audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        task: 'transcribe',
        return_timestamps: true,
    });
    self.postMessage({ status: 'complete', output });
};
`;

export default function App() {
  const [user, setUser] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [enhancedNotes, setEnhancedNotes] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [template, setTemplate] = useState('default');
  const [templates] = useState(INITIAL_TEMPLATES);

  const workerRef = useRef(null);
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Initialize the AI Worker
  useEffect(() => {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    workerRef.current = new Worker(URL.createObjectURL(blob), { type: 'module' });

    workerRef.current.onmessage = (e) => {
      const { status, output } = e.data;
      if (status === 'complete') {
        setTranscript(prev => [...prev, { text: output.text, timestamp: new Date().toLocaleTimeString() }]);
        handleEnhance(output.text);
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const float32Array = audioBuffer.getChannelData(0);
        workerRef.current.postMessage({ audio: float32Array });
      };
      recorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
    recorderRef.current?.stream.getTracks().forEach(t => t.stop());
  };

  const handleEnhance = async (rawText) => {
    const textToProcess = rawText || transcript.map(t => t.text).join(' ');
    if (!textToProcess) return;
    setIsEnhancing(true);
    try {
      const prompt = `${templates[template]}\nTranscript: ${textToProcess}\nNote: Correct "Patience Portal" to "Patient Portal".`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      setEnhancedNotes(data.candidates[0].content.parts[0].text);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-600">NuancePad</h1>
          <div className="flex items-center gap-4">
            {user ? (
              <button onClick={() => signOut(auth)} className="text-sm">Logout ({user.displayName})</button>
            ) : (
              <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded-md">Login</button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-center">
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-8 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-600'}`}
              >
                {isRecording ? <MicOff color="white" size={48} /> : <Mic color="white" size={48} />}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border">
                <h2 className="font-bold mb-4">Transcript</h2>
                <div className="h-64 overflow-auto text-sm space-y-2">
                  {transcript.map((t, i) => <p key={i}><span className="text-gray-400">[{t.timestamp}]</span> {t.text}</p>)}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border">
                <h2 className="font-bold mb-4">AI Summary</h2>
                {isEnhancing ? <Loader2 className="animate-spin" /> : <div className="text-sm">{enhancedNotes}</div>}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}