interface RecordingInputCardProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export function RecordingInputCard({ file, onFileChange }: RecordingInputCardProps) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-semibold">Recording Upload (advanced)</h3>
      <p className="text-sm text-slate-600">Upload a recording file and NuancePad will transcribe it before generating MoM output.</p>
      <input
        data-testid="recording-file-input"
        type="file"
        accept=".mp3,.wav,.m4a,.mp4,.webm,audio/*,video/*"
        className="w-full rounded border p-2 text-sm"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
      <p className="text-xs text-slate-500">Supported: .mp3, .wav, .m4a, .mp4, .webm</p>
      {file && (
        <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700">
          Selected: {file.name} ({Math.ceil(file.size / 1024)} KB)
        </div>
      )}
    </section>
  );
}
