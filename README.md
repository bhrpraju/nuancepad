# 🎙️ NuancePad: Privacy-First AI Meetings

NuancePad is a 100% browser-based meeting assistant. Unlike other AI note-takers, NuancePad runs the transcription engine (**Whisper**) locally in your browser. Your audio never leaves your computer.

### ✨ Key Features
* **Local Transcription:** Uses `whisper-tiny.en` via WebAssembly—no cloud audio processing.
* **AI Executive Summary:** Uses Gemini 2.5 Flash to turn messy transcripts into structured notes.
* **Magic Templates:** Generate custom extraction prompts (e.g., "Find the budget" or "List action items") on the fly.
* **Zero Cost:** Built using free-tier APIs and local models.

### 🎧 Recording System Audio (Teams/Zoom/Webex)
To transcribe meetings from desktop apps on a Mac, you need to route the audio into the browser using a virtual bridge. 



1. Install [BlackHole 2ch](https://github.com/ExistentialAudio/BlackHole).
2. Create a **Multi-Output Device** in Audio MIDI Setup (Include your Speakers + BlackHole).
3. Create an **Aggregate Device** (Include your Mic + BlackHole).
4. Set your meeting app (Teams/Zoom) to output to the **Multi-Output Device**.
5. Set NuancePad's microphone to the **Aggregate Device**.

### 🚀 Developer Setup
1. Clone the repo: `git clone https://github.com/bhrpraju/nuancepad.git`
2. Install dependencies: `npm install`
3. Create a `.env.local` with your `VITE_GEMINI_API_KEY` and Firebase credentials.
4. Run: `npm run dev`
