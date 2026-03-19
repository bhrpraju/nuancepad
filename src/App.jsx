import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Upload, Mic, MicOff, Settings, 
  MessageSquare, Sparkles, FileText, CheckCircle, 
  ChevronRight, Play, Square, Loader2, Send, Mail, X, Cloud, CloudOff, Save, History
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

// --- CONFIG ---
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

// --- THE SMARTER BRAIN (Base Model) ---
const workerCode = `
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';
let transcriber = null;
self.onmessage = async (e) => {
    const { audio } = e.data;
    if (!transcriber) {
        // Switching to 'base' for much higher accuracy
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
  const [activeTab, setActiveTab] = useState('new');
  const [savedNotes, setSavedNotes] = useState([]);

  const workerRef = useRef(null);
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const q = query(collection(db, 'users', u.uid, 'notes'), orderBy('createdAt', 'desc'));
        onSnapshot(q, (snapshot) => {
          setSavedNotes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      }
    });
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
    } catch (err) { alert("Mic error"); }
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
      // We tell Gemini to act as a cleanup crew for any remaining typos
      const prompt = `Clean up this medical/office transcript. Correct obvious misspellings. 
      Transcript: ${textToProcess}`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      setEnhancedNotes(data.candidates[0].content.parts[0].text);
    } catch (err) { console.error(err); } finally { setIsEnhancing(false); }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b"><h1 className="text-xl font-bold text-blue-600 italic">NuancePad</h1></div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('new')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg ${activeTab === 'new' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}><Mic className="w-5 h-5" /> New Meeting</button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg ${activeTab === 'history' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}><History className="w-5 h-5" /> History</button>
        </nav>
        <div className="p-4 border-t">
          {user ? (
            <div className="flex items-center gap-2">
              <img src={user.photoURL} className="w-8 h-8 rounded-full" />
              <button onClick={() => signOut(auth)} className="text-xs text-gray-500 hover:underline">Sign Out</button>
            </div>
          ) : (
            <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="w-full bg-blue-600 text-white py-2 rounded-md">Sign In</button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-8">
          {activeTab === 'new' ? (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-200 text-center">
                <button onClick={isRecording ? stopRecording : startRecording} className={`p-12 rounded-full transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-600 shadow-lg shadow-blue-200 hover:scale-105'}`}>
                  {isRecording ? <MicOff color="white" size={64} /> : <Mic color="white" size={64} />}
                </button>
                <p className="mt-6 font-medium text-gray-600">{isRecording ? "Recording... (Speak clearly)" : "Click to start recording"}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /> Transcript</h3>
                  <div className="h-64 overflow-auto text-sm space-y-3">
                    {transcript.map((t, i) => <div key={i} className="p-3 bg-gray-50 rounded-lg">{t.text}</div>)}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-600" /> Smart Summary</h3>
                  <div className="h-64 overflow-auto text-sm text-gray-700 leading-relaxed">
                    {isEnhancing ? <Loader2 className="animate-spin" /> : enhancedNotes}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Past Notes</h2>
              <div className="grid gap-4">
                {savedNotes.map(n => (
                  <div key={n.id} className="p-4 bg-white rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-400 mb-2">{new Date(n.createdAt).toLocaleString()}</p>
                    <p className="text-sm line-clamp-2">{n.enhancedNotes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
