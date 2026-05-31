import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ComplianceNotice } from "../components/ComplianceNotice";
import { MetadataForm } from "../components/MetadataForm";
import { MomReportTables } from "../components/MomReportTables";
import { RecordingInputCard } from "../components/RecordingInputCard";
import { TranscriptInputCard } from "../components/TranscriptInputCard";
import type { MeetingMetadata, MeetingReport, SourceType, UsageMetrics } from "../domain/meeting";
import { aiReportService } from "../services/aiReportService";
import { meetingService } from "../services/meetingService";
import { linkImportService } from "../services/linkImportService";
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
  const [recordingIntakeMode, setRecordingIntakeMode] = useState<"file" | "link">("file");
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [recordingPasscode, setRecordingPasscode] = useState("");
  const [preparedTranscript, setPreparedTranscript] = useState("");
  const [generatedSourceType, setGeneratedSourceType] = useState<SourceType>("transcript_paste");
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null);
  const [report, setReport] = useState<MeetingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const sourceType = useMemo<SourceType>(() => {
    if (inputMode === "recording") {
      return recordingIntakeMode === "link" ? "recording_link" : "recording_file";
    }
    return transcriptSource === "file" ? "transcript_file" : "transcript_paste";
  }, [inputMode, recordingIntakeMode, transcriptSource]);

  const onGenerate = async () => {
    setLoading(true);
    setError("");
    setStatusMessage("");
    setUsageMetrics(null);

    try {
      let workingTranscript = transcript.trim();
      let transcriptionTokens = 0;

      if (inputMode === "recording") {
        if (recordingIntakeMode === "file") {
          if (!recordingFile) {
            throw new Error("Upload a recording file before generating.");
          }
          setStatusMessage("Transcribing recording...");
          const transcriptionResult = await transcriptionService.transcribeRecording(recordingFile);
          workingTranscript = transcriptionResult.transcript;
          transcriptionTokens = transcriptionResult.usage.totalTokens;
          setTranscript(workingTranscript);
        } else {
          if (!recordingUrl.trim()) {
            throw new Error("Enter a recording link before generating.");
          }

          setStatusMessage("Attempting authorized Webex link import...");
          const linkResult = await linkImportService.importAuthorizedLink({
            platform: metadata.platform,
            recordingUrl: recordingUrl.trim(),
            passcode: recordingPasscode.trim()
          });

          if (linkResult.status === "manual_upload_required") {
            throw new Error(`manual_upload_required: ${linkResult.reason}. ${linkResult.details}`);
          }

          workingTranscript = linkResult.transcript;
          setTranscript(workingTranscript);
        }
      }

      if (!workingTranscript) {
        throw new Error("Transcript is empty after processing.");
      }

      setStatusMessage("Generating meeting summary...");
      const generated = await aiReportService.generateMeetingReport(workingTranscript, { ...metadata, sourceType });
      setReport(generated.report);
      setUsageMetrics({
        promptTokens: generated.usage.promptTokens,
        outputTokens: generated.usage.outputTokens,
        totalTokens: generated.usage.totalTokens + transcriptionTokens,
        transcriptWordCount: workingTranscript.split(/\s+/).filter(Boolean).length
      });
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
      recordingUrl: generatedSourceType === "recording_link" ? recordingUrl.trim() : undefined,
      importStatus: "completed",
      rawTranscript: preparedTranscript || transcript,
      usageMetrics: usageMetrics ?? undefined,
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
            setUsageMetrics(null);
          }}
          onFileLoaded={(contents, fileName) => {
            setTranscriptSource("file");
            setTranscript(parseTranscriptByFileName(contents, fileName));
            setUsageMetrics(null);
          }}
        />
      ) : (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold">Recording Intake (advanced)</h3>
          <p className="text-sm text-slate-600">
            Use file upload for the fastest path. Use authorized Webex link import only when you have access and passcode details.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRecordingIntakeMode("file")}
              className={`rounded-lg px-3 py-2 text-sm ${recordingIntakeMode === "file" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}
            >
              Upload file
            </button>
            <button
              type="button"
              onClick={() => setRecordingIntakeMode("link")}
              className={`rounded-lg px-3 py-2 text-sm ${recordingIntakeMode === "link" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}
            >
              Authorized link import (Webex)
            </button>
          </div>

          {recordingIntakeMode === "file" ? (
            <RecordingInputCard
              file={recordingFile}
              onFileChange={(file) => {
                setRecordingFile(file);
                setGeneratedSourceType("recording_file");
                setReport(null);
                setPreparedTranscript("");
                setUsageMetrics(null);
              }}
            />
          ) : (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
              <label className="text-sm">
                <span className="mb-1 block font-medium">Webex recording link</span>
                <input
                  className="w-full rounded border p-2"
                  placeholder="https://...webex.com/..."
                  value={recordingUrl}
                  onChange={(e) => {
                    setRecordingUrl(e.target.value);
                    setGeneratedSourceType("recording_link");
                    setReport(null);
                    setPreparedTranscript("");
                    setUsageMetrics(null);
                  }}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Passcode (if provided)</span>
                <input
                  className="w-full rounded border p-2"
                  placeholder="Enter passcode from share email"
                  value={recordingPasscode}
                  onChange={(e) => {
                    setRecordingPasscode(e.target.value);
                  }}
                />
              </label>
              <p className="text-xs text-slate-500">
                If the provider page requires interactive sign-in/passcode/CAPTCHA, NuancePad will return
                <code className="mx-1">manual_upload_required</code>
                and ask for manual transcript/recording upload.
              </p>
            </div>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={
            (inputMode === "transcript"
              ? !transcript.trim()
              : recordingIntakeMode === "file"
                ? !recordingFile
                : !recordingUrl.trim()) ||
            !metadata.title ||
            loading
          }
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
