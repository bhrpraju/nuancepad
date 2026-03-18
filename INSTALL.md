Markdown
# 🛠️ Step-by-Step Installation Guide

Follow these steps to get your own local version of NuancePad running for development or private use.

### 📋 Prerequisites
* **Node.js** (v18+)
* **Git**
* **Google Gemini API Key** ([Get one here](https://aistudio.google.com))
* **Firebase Project** (For hosting/storage)

### 🏃‍♂️ Installation Steps

**1. Clone and Enter Directory**
```bash
git clone [https://github.com/bhrpraju/nuancepad.git](https://github.com/bhrpraju/nuancepad.git)
cd nuancepad
2. Install Libraries

Bash
npm install
3. Configure Secrets (.env)
You must create a file named .env.local in the root folder. Paste this template and fill in your keys:

Plaintext
VITE_GEMINI_API_KEY=your_key_here
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_app_id
4. Start Development Server

Bash
npm run dev
🎙️ Audio Troubleshooting
If you cannot hear meeting participants, ensure your Multi-Output Device is active in your Mac's Sound Settings. NuancePad must "hear" the system audio via the BlackHole virtual driver.


---

### 🏆 One Final Tip
Since you are doing this through the GitHub website, every time you click **"Commit changes,"** it’s like saving a version of your work. You are officially managing a software project!

**Would you like me to help you draft a LinkedIn post to share your new project with your professional network?** It's a great way to show off your technical "builder" mindset.
