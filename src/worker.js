import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

// We explicitly use the "Base" model for significantly better accuracy
const model_id = 'Xenova/whisper-base.en';

let transcriber = null;

self.onmessage = async (e) => {
    const { audio } = e.data;

    try {
        if (!transcriber) {
            // This only happens once; it downloads and caches the model
            transcriber = await pipeline('automatic-speech-recognition', model_id, {
                progress_callback: (p) => self.postMessage(p)
            });
        }

        const output = await transcriber(audio, {
            chunk_length_s: 30, // Processes in 30s chunks for better context
            stride_length_s: 5,  // Overlaps chunks so "Patient Portal" isn't cut in half
            task: 'transcribe',
            return_timestamps: true,
        });

        self.postMessage({ status: 'complete', output });
    } catch (error) {
        self.postMessage({ status: 'error', error: error.message });
    }
};