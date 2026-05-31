import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ComplianceNotice } from "../components/ComplianceNotice";
import { MetadataForm } from "../components/MetadataForm";
import { MomReportTables } from "../components/MomReportTables";
import { RecordingInputCard } from "../components/RecordingInputCard";
import { TranscriptInputCard } from "../components/TranscriptInputCard";
import type { MeetingMetadata, MeetingReport, SourceType } from "../domain/meeting";
import { aiReportService } from "../services/aiReportService";
import { meetingService } from "../services/meetingService";
import { transcriptionService } from "../services/transcriptionService";
import { defaultMeetingReport } from "../utils/meetingSchema";
import { parseTranscriptByFileName } from "../utils/transcriptParsers";

const baseMetadata: Omit<MeetingMetadata, "sourceType"> = {
  title: "",
  clientProject: "",
  meetingDate: new Date().toISOString().slice(0, 10),
  meetingType: "Status Review",
  platform: "Webex",
  sharedBy: ""
};

export function NewMeeting() {
  const navigate = useNavigate();
  const [metadata, setMetadata] = useState(baseMetadata);
  const [transcript, setTranscript] = useState("");
  const [transcriptSource, setTranscriptSource] = useState<"paste" | "file">("paste");
  const [inputMode, setInputMode] = useState<"transcript" | "recording">("transcript");
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [preparedTranscript, setPreparedTranscript] = useState("");
  const [generatedSourceType, setGeneratedSourceType] = useState<SourceType>("transcript_paste");
  const [report, setReport] = useState<MeetingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const sourceType = useMemo<SourceType>(() => {
    if (inputMode === "recording") {
      return "recording_file";
    }
    return transcriptSource === "file" ? "transcript_file" : "transcript_paste";
  }, [inputMode, transcriptSource]);

  const onGenerate = async () => {
    setLoading(true);
    setError("");
    setStatusMessage("");

    try {
      let workingTranscript = transcript.trim();

      if (inputMode === "recording") {
        if (!recordingFile) {
          throw new Error("Upload a recording file before generating.");
        }
        setStatusMessage("Transcribing recording...");
        workingTranscript = await transcriptionService.transcribeRecording(recordingFile);
        setTranscript(workingTranscript);
      }

      if (!workingTranscript) {
        throw new Error("Transcript is empty after processing.");
      }

      setStatusMessage("Generating meeting summary...");
      const generated = await aiReportService.generateMeetingReport(workingTranscript, { ...metadata, sourceType });
      setReport(generated);
      setPreparedTranscript(workingTranscript);
      setGeneratedSourceType(sourceType);
      setStatusMessage("MoM generated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report.");
      setStatusMessage("");
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    if (!report) {
      return;
    }

    const id = await meetingService.create({
      ...metadata,
      sourceType: generatedSourceType,
      importStatus: "completed",
      rawTranscript: preparedTranscript || transcript,
      reportJson: report
    });

    navigate(`/meetings/${id}`);
  };

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-2xl font-semibold">New Meeting</h2>
        <p className="text-sm text-slate-600">Transcript-first intake is the default and fastest path to reliable output.</p>
      </header>

      <ComplianceNotice />

      <MetadataForm value={metadata} onChange={setMetadata} />

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-sm font-medium">Input mode</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setInputMode("transcript")}
            className={`rounded-lg px-3 py-2 text-sm ${inputMode === "transcript" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}
          >
            Transcript (recommended)
          </button>
          <button
            type="button"
            onClick={() => setInputMode("recording")}
            className={`rounded-lg px-3 py-2 text-sm ${inputMode === "recording" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}
          >
            Recording upload (advanced)
          </button>
        </div>
      </div>

      {inputMode === "transcript" ? (
        <TranscriptInputCard
          transcript={transcript}
          onTranscriptChange={(value) => {
            setTranscriptSource("paste");
            setTranscript(value);
          }}
          onFileLoaded={(contents, fileName) => {
            setTranscriptSource("file");
            setTranscript(parseTranscriptByFileName(contents, fileName));
          }}
        />
      ) : (
        <RecordingInputCard
          file={recordingFile}
          onFileChange={(file) => {
            setRecordingFile(file);
            setReport(null);
            setPreparedTranscript("");
          }}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={(inputMode === "transcript" ? !transcript.trim() : !recordingFile) || !metadata.title || loading}
          onClick={onGenerate}
        >
          {loading ? "Processing..." : inputMode === "recording" ? "Transcribe & Generate MoM" : "Generate MoM"}
        </button>
        {report && (
          <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm" onClick={onSave}>
            Save meeting
          </button>
        )}
      </div>

      {statusMessage && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{statusMessage}</div>}
      {error && <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">{error}</div>}

      {report ? <MomReportTables report={report} /> : <MomReportTables report={defaultMeetingReport()} />}
    </section>
  );
}
