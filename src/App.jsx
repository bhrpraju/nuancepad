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

  const transcriptEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
      alert("Failed to sign in. Make sure Google Auth is enabled in Firebase.");
    }
  };

  useEffect(() => {
    if (!user) {
      setSavedNotes([]);
      return;
    }
    const notesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'saved_notes');
    const unsubscribeNotes = onSnapshot(notesRef, (snapshot) => {
      const notes = [];
      snapshot.forEach(d => notes.push(d.data()));
      notes.sort((a, b) => b.updatedAt - a.updatedAt);
      setSavedNotes(notes);
    }, (err) => console.error("Notes fetch error:", err));

    const templatesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'custom_templates');
    const unsubscribeTemplates = onSnapshot(templatesRef, (snapshot) => {
      const fetchedTemplates = {};
      snapshot.forEach(d => {
        fetchedTemplates[d.id] = d.data().instruction;
      });
      setTemplates(prev => ({ ...INITIAL_TEMPLATES, ...fetchedTemplates }));
    }, (err) => console.error("Templates fetch error:", err));

    return () => {
      unsubscribeNotes();
      unsubscribeTemplates();
    };
  }, [user]);

  const loadSavedNote = (note) => {
    setActiveMeeting(null);
    setViewingSavedNote(note);
    setTranscript(note.transcript || []);
    setScratchpad(note.scratchpad || "");
    setEnhancedNotes(note.enhancedNotes || "");
    setChatMessages([]);
  };

  const startNewAdHoc = () => {
    setViewingSavedNote(null);
    setActiveMeeting(null);
    setTranscript([]);
    setScratchpad("");
    setEnhancedNotes("");
    setChatMessages([]);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const icsData = event.target.result;
      parseICS(icsData);
    };
    reader.readAsText(file);
  };

  const parseICS = (data) => {
    const lines = data.split(/\r?\n/);
    const parsedMeetings = [];
    const seenTitles = new Set();
    
    let currentMeeting = null;
    for (const line of lines) {
      if (line.startsWith('BEGIN:VEVENT')) {
        currentMeeting = { id: Math.random().toString(36).substr(2, 9), title: 'Untitled Meeting' };
      } else if (line.startsWith('END:VEVENT')) {
        if (currentMeeting && !seenTitles.has(currentMeeting.title)) {
          parsedMeetings.push(currentMeeting);
          seenTitles.add(currentMeeting.title);
        }
        currentMeeting = null;
      } else if (currentMeeting && line.startsWith('SUMMARY:')) {
        currentMeeting.title = line.substring(8);
      }
    }
    setMeetings(parsedMeetings);
    if (parsedMeetings.length > 0) {
      setActiveMeeting(parsedMeetings[0]);
      setViewingSavedNote(null);
    }
  };

  const [modelLoading, setModelLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);

  const transcriberRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chunkIntervalRef = useRef(null);

  const initWhisper = async () => {
    if (modelReady) return true;
    setModelLoading(true);
    try {
      const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');
      env.allowLocalModels = false;
      transcriberRef.current = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base.en', {
        progress_callback: (data) => {
          if (data.status === 'progress') {
            setModelProgress(Math.round(data.progress));
          }
        }
      });
      setModelReady(true);
      setModelLoading(false);
      return true;
    } catch (e) {
      console.error("Failed to load Whisper model:", e);
      setModelLoading(false);
      setTranscript([{
        id: Date.now(),
        speaker: "System Error",
        text: "Failed to download the Whisper AI model. Please check console.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      return false;
    }
  };

  const processAudioChunk = async () => {
    if (!transcriberRef.current || audioChunksRef.current.length === 0) return;
    const chunks = audioChunksRef.current;
    audioChunksRef.current = [];
    
    const length = chunks.reduce((acc, val) => acc + val.length, 0);
    const audioData = new Float32Array(length);
    let offset = 0;
    let sumSquares = 0;

    for (let chunk of chunks) {
      audioData.set(chunk, offset);
      for (let i = 0; i < chunk.length; i++) {
          sumSquares += chunk[i] * chunk[i];
      }
      offset += chunk.length;
    }

    if (audioData.length < 16000) return;

    // 1. The Volume Filter
    const rmsVolume = Math.sqrt(sumSquares / audioData.length);
    if (rmsVolume < 0.005) {
        return; 
    }

    try {
      const result = await transcriberRef.current(audioData);
      if (result && result.text && result.text.trim()) {
        let newText = result.text.trim();
        const lowerText = newText.toLowerCase();

        // 2. Exact Phrase Bouncer
        const isHallucination = 
          lowerText.includes('bye. bye.') || 
          lowerText.includes('thank you.') ||
          lowerText.includes('[music]') ||
          lowerText.includes('[blank_audio]');

        if (isHallucination) return;

        // 3. THE AGGRESSIVE REPETITION NUKE
        // Strip absolutely all punctuation so commas don't fool it
        const rawWords = lowerText.replace(/[^a-z0-9\s]/gi, '').split(/\s+/);
        
        if (rawWords.length > 6) {
            const uniqueWords = new Set(rawWords);
            // If less than 35% of the words are unique, the AI is looping. Nuke the whole block.
            if ((uniqueWords.size / rawWords.length) < 0.35) {
                return; // Drop the text silently
            }
        }

        // Only save it if it survived all the filters
        if (newText.length > 2) {
          setTranscript(prev => [...prev, {
            id: Date.now(),
            speaker: "Speaker",
            text: newText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
      }
    } catch (err) {
      console.error("Whisper transcription error:", err);
    }
  };

  const startRecording = async () => {
    const isReady = await initWhisper();
    if (!isReady) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } 
      });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 0;
      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioChunksRef.current.push(new Float32Array(inputData));
      };
      setTranscript([]);
      setEnhancedNotes("");
      setChatMessages([]);
      setIsRecording(true);
      setViewingSavedNote(null);
      
      // Process every 8 seconds
      chunkIntervalRef.current = setInterval(processAudioChunk, 8000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      setTranscript([{
        id: Date.now(),
        speaker: "System Error",
        text: "Microphone access is required for transcription.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
    if (processorRef.current) processorRef.current.disconnect();
    if (sourceRef.current) sourceRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
    processAudioChunk();
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const handleEnhance = async () => {
    let textToAnalyze = scratchpad;
    
    // Fallback: If scratchpad is empty, grab the whole transcript
    if (!textToAnalyze.trim()) {
        textToAnalyze = transcript.map(t => t.text).join(' ');
    }

    if (!textToAnalyze.trim() && transcript.length === 0) {
        alert("No transcript or notes found to enhance!");
        return;
    }

    setIsEnhancing(true);
    const formattedTranscript = transcript.map(t => `[${t.timestamp}] ${t.speaker}: ${t.text}`).join('\n');
    const systemPrompt = `You are NuancePad, an expert executive assistant. 
    Your job is to take a raw meeting transcript and the user's manual scratchpad notes, and combine them into a beautifully structured, highly accurate meeting summary.
    CRITICAL INSTRUCTIONS:
    1. If Scratchpad Notes are provided, treat them as the highest priority truth. 
    2. If Scratchpad Notes are empty, rely entirely on the Transcript to build the summary.
    3. Format the output in clean, readable Markdown.
    4. Apply the following specific template rules: ${templates[template]}`;
    const userPrompt = `
    --- RAW TRANSCRIPT ---
    ${formattedTranscript || "(No transcript recorded)"}
    --- MY SCRATCHPAD NOTES ---
    ${scratchpad || "(No manual notes taken)"}
    `;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      });
      const data = await response.json();

      if (!response.ok) {
          console.error("Gemini API Error:", data);
          setEnhancedNotes(`⚠️ API Error: ${data.error?.message || "Check the console for details. Make sure your API key is correct in Vercel."}`);
          setIsEnhancing(false);
          return;
      }

      const enhancedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (enhancedText) {
        setEnhancedNotes(enhancedText);
        if (user) {
          const noteId = activeMeeting?.id || Date.now().toString();
          const title = activeMeeting?.title || "Ad-hoc Meeting";
          const noteRef = doc(db, 'artifacts', appId, 'users', user.uid, 'saved_notes', noteId);
          setDoc(noteRef, {
            id: noteId,
            title,
            transcript: transcript,
            scratchpad: scratchpad,
            enhancedNotes: enhancedText,
            updatedAt: Date.now()
          }).catch(err => console.error("Failed to save note:", err));
        }
      } else {
         setEnhancedNotes("⚠️ The AI returned an empty response.");
      }
    } catch (error) {
      console.error("Enhancement failed:", error);
      setEnhancedNotes("⚠️ Failed to reach the AI server. Check your internet connection.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !enhancedNotes) return;
    const newMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput("");
    setIsChatting(true);
    const prompt = `
    Context (The Enhanced Meeting Notes):
    ${enhancedNotes}
    Context (The Raw Transcript):
    ${transcript.map(t => `${t.speaker}: ${t.text}`).join('\n')}
    User Question: ${chatInput}
    Answer the user's question concisely based ONLY on the provided meeting context.
    `;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      const data = await response.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (answer) {
        setChatMessages(prev => [...prev, { role: 'ai', content: answer }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'ai', content: "Sorry, I couldn't process that question." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleDraftEmail = async () => {
    if (!enhancedNotes) return;
    setIsDraftingEmail(true);
    const prompt = `Based on the following meeting notes, draft a professional follow-up email to the participants. Include a brief greeting, a summary of key points, and a clear list of action items. Do not include subject line placeholders, just write the email body directly.\n\nMeeting Notes:\n${enhancedNotes}`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      const emailText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (emailText) setEmailDraft(emailText);
    } catch (error) {
      console.error("Email draft failed:", error);
      setEmailDraft("⚠️ Failed to draft email.");
    } finally {
      setIsDraftingEmail(false);
    }
  };

  const handleGenerateTemplate = async () => {
    if (!customTemplateGoal.trim()) return;
    setIsGeneratingTemplate(true);
    const prompt = `You are an expert executive assistant. Create a strict system prompt instruction for summarizing a meeting transcript based on the user's goal.
    User Goal: "${customTemplateGoal}".
    Output ONLY the instruction text (max 2-3 sentences), specifying exactly what sections to extract and how to format it. Do not include introductory text.`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      let templateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (templateText) {
        templateText = templateText.replace(/^["']|["']$/g, '').trim();
        const newKey = `custom_${Date.now()}`;
        const instruction = `Custom (${customTemplateGoal}): ${templateText}`;
        if (user) {
          const templateRef = doc(db, 'artifacts', appId, 'users', user.uid, 'custom_templates', newKey);
          setDoc(templateRef, { instruction }).catch(err => console.error("Failed to save template:", err));
        } else {
          setTemplates(prev => ({ ...prev, [newKey]: instruction }));
        }
        setTemplate(newKey);
        setShowTemplateModal(false);
        setCustomTemplateGoal("");
      }
    } catch (error) {
      console.error("Template generation failed:", error);
    } finally {
      setIsGeneratingTemplate(false);
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) return <h3 key={idx} className="text-lg font-bold mt-4 mb-2 text-gray-800">{line.replace('### ', '')}</h3>;
      if (line.startsWith('## ')) return <h2 key={idx} className="text-xl font-bold mt-5 mb-3 text-gray-900">{line.replace('## ', '')}</h2>;
      if (line.startsWith('# ')) return <h1 key={idx} className="text-2xl font-bold mt-6 mb-4 text-gray-900">{line.replace('# ', '')}</h1>;
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const formattedLine = line.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <li key={idx} className="ml-5 list-disc mb-1 text-gray-700" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
      }
      if (line.trim() === '') return <br key={idx} />;
      const formattedText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <p key={idx} className="mb-2 text-gray-700" dangerouslySetInnerHTML={{ __html: formattedText }} />;
    });
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h1 className="font-bold text-lg tracking-tight text-gray-900">NuancePad</h1>
        </div>
        <div className="p-4 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Your Day</div>
          <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 border-dashed rounded-lg p-3 transition-colors">
            <Upload className="w-4 h-4" /> Upload .ics Calendar
          </button>
          <input type="file" accept=".ics" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        </div>
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          <button onClick={startNewAdHoc} className={`w-full text-left p-3 rounded-md text-sm mb-4 truncate flex items-center gap-2 transition-colors ${!activeMeeting && !viewingSavedNote ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">New Ad-hoc Meeting</span>
          </button>
          {meetings.length > 0 && (
            <div className="mb-6">
              <div className="text-xs font-semibold text-gray-400 mb-2 px-2 uppercase tracking-wider">Today's Schedule</div>
              {meetings.map((m, idx) => (
                <button key={m.id || idx} onClick={() => { setActiveMeeting(m); setViewingSavedNote(null); }} className={`w-full text-left p-3 rounded-md text-sm mb-1 truncate flex items-center gap-2 transition-colors ${activeMeeting?.id === m.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{m.title}</span>
                </button>
              ))}
            </div>
          )}
          <div>
            <div className="text-xs font-semibold text-gray-400 mb-2 px-2 uppercase tracking-wider flex items-center gap-1.5"><Cloud className="w-3 h-3" /> Saved to Cloud</div>
            {!user ? (
               <div className="text-xs text-gray-400 px-2 pb-4">Sign in below to see synced notes.</div>
            ) : savedNotes.length === 0 ? (
              <div className="text-xs text-gray-400 px-2 pb-4">No saved notes yet. Enhance a note to save it.</div>
            ) : (
              savedNotes.map((note) => (
                <button key={note.id} onClick={() => loadSavedNote(note)} className={`w-full text-left p-3 rounded-md text-sm mb-1 truncate flex items-center gap-2 transition-colors ${viewingSavedNote?.id === note.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <FileText className="w-4 h-4 flex-shrink-0 text-blue-500" />
                  <div className="flex flex-col truncate">
                    <span className="truncate font-medium text-gray-800">{note.title}</span>
                    <span className="text-[10px] text-gray-400">{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex flex-col gap-2">
          {user ? (
            <>
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium"><Cloud className="w-4 h-4" /><span className="truncate">{user.displayName || user.email}</span></div>
              <button onClick={() => signOut(auth)} className="text-xs text-gray-500 hover:text-gray-800 text-left pl-6">Sign Out</button>
            </>
          ) : (
            <button onClick={handleLogin} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"><Cloud className="w-4 h-4" /> Sign in to Sync Notes</button>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-gray-800 text-lg">{viewingSavedNote ? viewingSavedNote.title : (activeMeeting ? activeMeeting.title : "Ad-hoc Meeting")}</h2>
            <div className="h-4 w-px bg-gray-300"></div>
            <select value={template} onChange={(e) => { if (e.target.value === "create_new") { setShowTemplateModal(true); } else { setTemplate(e.target.value); } }} className="text-sm border-none bg-transparent text-gray-500 font-medium focus:ring-0 cursor-pointer hover:text-gray-700 transition-colors">
              {Object.entries(templates).map(([key, text]) => (<option key={key} value={key}>{key.startsWith('custom_') ? text.split(':')[0] : (key.charAt(0).toUpperCase() + key.slice(1) + " Template")}</option>))}
              <option value="create_new">✨ Magic Template...</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            {isRecording && (<div className="flex items-center gap-1.5 mr-2"><span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span><span className="text-xs font-medium text-red-500 uppercase tracking-wider animate-pulse">Recording</span></div>)}
            <button onClick={toggleRecording} disabled={modelLoading} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm ${isRecording ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed'}`}>
              {modelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
              {modelLoading ? `Loading Whisper (${modelProgress}%)` : isRecording ? 'Stop Recording' : 'Start Meeting'}
            </button>
          </div>
        </header>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 bg-gray-50/50 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-white/50 backdrop-blur-sm"><MessageSquare className="w-4 h-4 text-gray-400" /><h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Live Transcript</h3></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
              {transcript.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400"><MicOff className="w-12 h-12 mb-3 text-gray-300" /><p>Ready for Local Transcription.</p><p className="text-xs mt-1 text-center max-w-xs">Click 'Start Meeting' to download and run the Whisper AI model directly in your browser.</p></div>
              ) : (
                transcript.map((item) => (
                  <div key={item.id} className="flex gap-4 group"><div className="text-xs text-gray-400 font-medium pt-1 shrink-0 w-12 text-right">{item.timestamp}</div><div className="flex-1"><div className="text-xs font-semibold text-gray-500 mb-1">{item.speaker}</div><div className="text-gray-800 leading-relaxed text-[15px]">{item.text}</div></div></div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
          <div className="w-1/2 bg-white flex flex-col relative">
            {!enhancedNotes ? (
              <>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /><h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Your Scratchpad</h3></div><button onClick={handleEnhance} disabled={isEnhancing || isRecording || (transcript.length === 0 && !scratchpad)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm">{isEnhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{isEnhancing ? 'Enhancing...' : 'Enhance Notes'}</button></div>
                <textarea value={scratchpad} onChange={(e) => setScratchpad(e.target.value)} placeholder="Type your messy notes here...&#10;&#10;Examples:&#10;- Client budget is $50k&#10;- @Sarah needs to send the deck on Tuesday&#10;- Emphasize the security features in follow up" className="flex-1 w-full p-8 resize-none focus:outline-none focus:ring-0 text-gray-800 text-lg leading-relaxed placeholder:text-gray-300" />
              </>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white z-10"><div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-5 h-5" /><h3 className="text-sm font-bold uppercase tracking-wider">Enhanced Notes</h3></div><div className="flex items-center gap-3"><button onClick={handleDraftEmail} disabled={isDraftingEmail} className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50">{isDraftingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Draft Follow-up ✨</button><button onClick={() => { setEnhancedNotes(""); setEmailDraft(""); }} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Back to Scratchpad</button></div></div>
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar pb-32"><div className="max-w-prose mx-auto text-[15px]">
                    {enhancedNotes.includes("⚠️ API Error:") && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                            {enhancedNotes}
                        </div>
                    )}
                    {emailDraft && (<div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-xl"><div className="flex items-center justify-between mb-4"><h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2"><Mail className="w-4 h-4" /> Suggested Follow-up Email</h4><button className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-white px-2 py-1 rounded border border-blue-200" onClick={(e) => { const target = e.target; navigator.clipboard.writeText(emailDraft).catch(() => { const textArea = document.createElement("textarea"); textArea.value = emailDraft; document.body.appendChild(textArea); textArea.select(); document.execCommand('copy'); textArea.remove(); }); target.innerText = "Copied!"; setTimeout(() => target.innerText = "Copy", 2000); }}>Copy</button></div><div className="whitespace-pre-wrap text-blue-900 text-sm leading-relaxed">{emailDraft}</div></div>)}
                    {!enhancedNotes.includes("⚠️ API Error:") && renderMarkdown(enhancedNotes)}
                  </div></div>
                <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                  {chatMessages.length > 0 && (<div className="max-h-40 overflow-y-auto mb-4 space-y-3 px-2 custom-scrollbar">{chatMessages.map((msg, idx) => (<div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`text-sm px-4 py-2 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>{msg.content}</div></div>))}{isChatting && (<div className="flex justify-start"><div className="text-sm px-4 py-2 rounded-2xl bg-gray-100 text-gray-800 rounded-bl-none flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Thinking...</div></div>)}</div>)}
                  <div className="relative max-w-2xl mx-auto"><input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChat()} placeholder="Ask a question about this meeting..." className="w-full bg-gray-50 border border-gray-200 rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" /><button onClick={handleChat} disabled={!chatInput.trim() || isChatting} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><Send className="w-4 h-4" /></button></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"><div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-blue-600" /> Magic Template</h3><button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button></div><p className="text-sm text-gray-600 mb-4">Describe your meeting context. Gemini will dynamically generate a custom note-taking extraction template for you.</p><input type="text" autoFocus value={customTemplateGoal} onChange={(e) => setCustomTemplateGoal(e.target.value)} placeholder="e.g. Weekly Marketing Sync, Vendor Negotiation..." className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4" onKeyDown={(e) => e.key === 'Enter' && handleGenerateTemplate()} /><div className="flex justify-end gap-2"><button onClick={() => setShowTemplateModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors">Cancel</button><button onClick={handleGenerateTemplate} disabled={!customTemplateGoal.trim() || isGeneratingTemplate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50">{isGeneratingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate Template</button></div></div></div>
      )}
    </div>
  );
}