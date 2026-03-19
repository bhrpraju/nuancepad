# 🎙️ NuancePad: Privacy-First AI Meetings

NuancePad is a 100% browser-based meeting assistant. Unlike other AI note-takers, NuancePad runs the transcription engine (**Whisper**) locally in your browser using WebAssembly. Your audio never leaves your computer.

### ✨ Key Features
* **Local Transcription:** Uses `whisper-tiny.en`—no cloud audio processing.
* **AI Executive Summary:** Uses Gemini 2.0 Flash to turn messy transcripts into structured notes.
* **Magic Templates:** Generate custom extraction prompts (e.g., "Find the budget" or "List action items") on the fly.
* **Zero Cost:** Built using free-tier APIs and local models.

### 🎧 Recording System Audio (Teams/Zoom/Webex)
To transcribe meetings from desktop apps on a Mac, you need to route the audio into the browser using a virtual bridge. 



1. **Install BlackHole:** Download [BlackHole 2ch](https://github.com/ExistentialAudio/BlackHole).
2. **Multi-Output Device:** In Audio MIDI Setup, create a Multi-Output device including your Speakers + BlackHole.
3. **Aggregate Device:** Create an Aggregate Device including your Mic + BlackHole.
4. **Settings:** Set your meeting app to output to the **Multi-Output Device** and NuancePad's microphone to the **Aggregate Device**.

---

## 🚀 Quick Start
For a detailed technical setup, see [INSTALL.md](./INSTALL.md).

1. Clone the repo: `git clone https://github.com/bhrpraju/nuancepad.git`
2. Install: `npm install`
3. Add your keys to `.env.local` (Gemini & Firebase).
4. Run: `npm run dev`
