import { useRef } from "react";

interface TranscriptInputCardProps {
  transcript: string;
  onTranscriptChange: (value: string) => void;
  onFileLoaded: (contents: string, fileName: string) => void;
}

export function TranscriptInputCard({ transcript, onTranscriptChange, onFileLoaded }: TranscriptInputCardProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const raw = await file.text();
    onFileLoaded(raw, file.name);
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-semibold">Transcript Input (default path)</h3>
      <textarea
        value={transcript}
        onChange={(e) => onTranscriptChange(e.target.value)}
        rows={10}
        placeholder="Paste transcript here"
        className="w-full rounded-lg border p-3 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          Upload transcript file
        </button>
        <span className="text-xs text-slate-500">Supported: .txt, .vtt, .srt, .md, .csv</span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.vtt,.srt,.md,.csv"
        className="hidden"
        onChange={handleFile}
      />
    </section>
  );
}
