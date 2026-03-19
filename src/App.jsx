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

// --- TEMPLATES ---
const INITIAL_TEMPLATES = {
  default: "Standard Summary: Provide an Executive Summary, Decisions Made, and specific Action Items with assigned owners.",
  sales: "Sales Discovery: Extract BANT (Budget, Authority, Need, Timeline). Summarize client pain points, objections, and clear next steps.",
  engineering: "Engineering Standup: Summarize what was done, what is planned, and clearly list any Blockers or technical decisions."
};

export default function App() {
  const [meetings, setMeetings] = useState([]);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [template, setTemplate] = useState('default');
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [user, setUser] = useState(null);
  const [savedNotes, setSavedNotes] = useState([]);
  const [viewingSavedNote, setViewingSavedNote] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [scratchpad, setScratchpad] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedNotes, setEnhancedNotes] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [customTemplateGoal, setCustomTemplateGoal] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // --- NEW AI ARCHITECTURE STATES ---
  const [modelLoading, setModelLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const workerRef = useRef(null);
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const transcriptEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize Web Worker for Background AI Processing
  useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module'
      });
    }

    const onMessageReceived = (e) => {
      const { status, output, progress } = e.data;
      
      if (status === 'progress') {
        setModelLoading(true);
        setModelProgress(progress);
      } else if (status === 'ready') {
        setModelLoading(false);
        setModelReady(true);
      } else if (status === 'complete') {
        setTranscript(prev => [...prev, { text: output.text, timestamp: new Date().toLocaleTimeString() }]);
        // Automatically trigger AI summary after transcription
        handleEnhance(output.text);
      }
    };

    workerRef.current.addEventListener('message', onMessageReceived);
    return () => workerRef.current?.removeEventListener('message', onMessageReceived);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- RECORDING LOGIC ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const float32Array = audioBuffer.getChannelData(0);

        // Send audio to the Worker "Engine Room"
        workerRef.current.postMessage({ audio: float32Array });
      };

      recorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
    recorderRef.current?.stream.getTracks().forEach(t => t.stop());
  };

  // --- GEMINI AI FUNCTIONS ---
  const handleEnhance = async (rawText) => {
    const textToProcess = rawText || transcript.map(t => t.text).join(' ');
    if (!textToProcess) return;

    setIsEnhancing(true);
    try {
      const prompt = `
        ${templates[template]}
        Transcript: ${textToProcess}
        Note: If you see transcription errors like "Patience Portal", correct them to "Patient Portal".
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      setEnhancedNotes(data.candidates[0].content.parts[0].text);
    } catch (err) {
      console.error("Gemini Error:", err);
    } finally {
      setIsEnhancing(false);
    }
  };

  // --- UI AND FIREBASE LOGIC (Kept from your original) ---
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleSaveNote = async () => {
    if (!user) return alert("Sign in to save notes.");
    const noteId = viewingSavedNote?.id || Math.random().toString(36).substr(2, 9);
    const noteData = {
      id: noteId,
      title: activeMeeting?.title || "Quick Note",
      transcript,
      scratchpad,
      enhancedNotes,
      updatedAt: Date.now()
    };
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'saved_notes', noteId), noteData);
    alert("Note saved!");
  };

  // ... (Rest of your existing JSX UI Code from original App.jsx) ...
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
       {/* All your sidebar, main area, and modal code goes here exactly as before */}
       <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-blue-600">NuancePad</h1>
            <div className="flex items-center gap-4">
              {user ? (
                <button onClick={() => signOut(auth)} className="text-sm text-gray-600">Logout</button>
              ) : (
                <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded-md">Login</button>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Record Button */}
              <div className="flex justify-center">
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-8 rounded-full transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-600'}`}
                >
                  {isRecording ? <MicOff color="white" size={48} /> : <Mic color="white" size={48} />}
                </button>
              </div>

              {/* Status Bar */}
              {modelLoading && (
                <div className="bg-blue-50 p-4 rounded-lg text-center text-sm text-blue-700">
                  Loading AI Brain: {Math.round(modelProgress)}% (First time only)
                </div>
              )}

              {/* Enhanced Notes Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h2 className="font-bold mb-4">Transcript</h2>
                  <div className="h-64 overflow-auto text-sm space-y-2">
                    {transcript.map((t, i) => <p key={i}><span className="text-gray-400">[{t.timestamp}]</span> {t.text}</p>)}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h2 className="font-bold mb-4">AI Executive Notes</h2>
                  {isEnhancing ? <Loader2 className="animate-spin" /> : <div className="prose text-sm">{enhancedNotes}</div>}
                </div>
              </div>
            </div>
          </main>
       </div>
    </div>
  );
}