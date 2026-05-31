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

  const toFriendlyImportError = (message: string): string => {
    if (!message.startsWith("manual_upload_required:")) {
      return message;
    }

    if (message.includes("passcode_entry_required")) {
      return "Webex link opened, but passcode must be entered inside Webex playback page. After opening the recording, download transcript/recording there and upload it here.";
    }

    if (message.includes("interactive_passcode_or_session_required")) {
      return "Webex needs one more browser step after passcode/session validation. Open the link in Webex, then download transcript/recording and upload it here.";
    }

    if (message.includes("sso_or_login_required")) {
      return "Webex link requires interactive login/session in browser. NuancePad backend cannot click sign-in or page prompts. Open in Webex, then download transcript/recording and upload here.";
    }

    return "This Webex link requires interactive browser steps. Download transcript/recording from Webex and upload here.";
  };

  const sourceType = useMemo<SourceType>(() => {
    if (inputMode === "recording") {
      return recordingIntakeMode === "link" ? "recording_link" : "recording_file";
    }
    return transcriptSource === "file" ? "transcript_file" : "transcript_paste";
  }, [inputMode, recordingIntakeMode, transcriptSource]);

  const selectedImportMode = useMemo(() => {
    if (inputMode === "transcript") {
      return "transcript";
    }
    return recordingIntakeMode === "file" ? "recording_file" : "recording_link";
  }, [inputMode, recordingIntakeMode]);

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
      const raw = err instanceof Error ? err.message : "Failed to generate report.";
      setError(toFriendlyImportError(raw));
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
        <p className="text-sm font-medium">Import method</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setInputMode("transcript");
            }}
            className={`rounded-lg px-3 py-2 text-sm ${selectedImportMode === "transcript" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}
          >
            Paste transcript
          </button>
          <button
            type="button"
            onClick={() => {
              setInputMode("recording");
              setRecordingIntakeMode("file");
            }}
            className={`rounded-lg px-3 py-2 text-sm ${selectedImportMode === "recording_file" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}
          >
            Upload file
          </button>
          <button
            type="button"
            onClick={() => {
              setInputMode("recording");
              setRecordingIntakeMode("link");
            }}
            className={`rounded-lg px-3 py-2 text-sm ${selectedImportMode === "recording_link" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}
          >
            Webex link helper
          </button>
        </div>
      </div>

      {selectedImportMode === "transcript" ? (
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
      ) : selectedImportMode === "recording_file" ? (
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
        <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold">Browser-Session Import Helper (Webex)</h3>
          <p className="text-sm text-slate-600">Fastest path: open link, finish access in Webex browser page, then bring transcript/recording back to NuancePad.</p>
          <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-500">
            <li>Paste recording link and passcode from your share email.</li>
            <li>Use <span className="font-medium text-slate-700">Open link in browser</span> and complete passcode/SSO in Webex.</li>
            <li>If direct import is blocked, upload transcript or recording file here and continue.</li>
          </ol>
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
              disabled={!recordingUrl.trim()}
              onClick={() => {
                window.open(recordingUrl.trim(), "_blank", "noopener,noreferrer");
              }}
            >
              Open link in browser
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              onClick={() => {
                setInputMode("transcript");
              }}
            >
              Switch to transcript
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              onClick={() => {
                setInputMode("recording");
                setRecordingIntakeMode("file");
              }}
            >
              Switch to file upload
            </button>
          </div>
          <p className="text-xs text-slate-500">If this link requires interactive sign-in/CAPTCHA, use manual file or transcript upload.</p>
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
          {loading ? "Processing..." : "Generate MoM"}
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
