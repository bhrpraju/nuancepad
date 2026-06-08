import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ComplianceNotice } from "../components/ComplianceNotice";
import { ExportActions } from "../components/ExportActions";
import { MetadataForm } from "../components/MetadataForm";
import { MomReportTables } from "../components/MomReportTables";
import { RecordingInputCard } from "../components/RecordingInputCard";
import { TranscriptInputCard } from "../components/TranscriptInputCard";
import type { MeetingMetadata, MeetingReport, SourceType, UsageMetrics } from "../domain/meeting";
import { aiReportService } from "../services/aiReportService";
import type { LinkAttemptSnapshot } from "../services/linkImportService";
import { meetingService } from "../services/meetingService";
import { linkImportService } from "../services/linkImportService";
import { transcriptionService } from "../services/transcriptionService";
import { detectPlatformFromLink, toFriendlyFallbackMessage } from "../utils/linkIntake";
import { defaultMeetingReport } from "../utils/meetingSchema";
import { cleanTranscriptForMom, parseTranscriptByFileName } from "../utils/transcriptParsers";

const baseMetadata: Omit<MeetingMetadata, "sourceType"> = {
  title: "",
  clientProject: "",
  meetingDate: new Date().toISOString().slice(0, 10),
  meetingType: "Status Review",
  platform: "Webex",
  sharedBy: "",
  momTemplate: "standard_mom"
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savedMeetingId, setSavedMeetingId] = useState("");
  const [linkAttempt, setLinkAttempt] = useState<LinkAttemptSnapshot | null>(null);
  const [linkFallbackPending, setLinkFallbackPending] = useState(false);

  const toFriendlyImportError = (message: string): string => {
    return message;
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
    setSaveMessage("");
    setSaveError("");
    setSavedMeetingId("");
    setUsageMetrics(null);
    if (selectedImportMode === "recording_link") {
      setLinkAttempt(null);
      setLinkFallbackPending(false);
    }

    try {
      let workingTranscript = cleanTranscriptForMom(transcript.trim());
      let transcriptionTokens = 0;

      if (inputMode === "recording") {
        if (recordingIntakeMode === "file") {
          if (!recordingFile) {
            throw new Error("Upload a recording file before generating.");
          }
          setStatusMessage("Transcribing recording...");
          const transcriptionResult = await transcriptionService.transcribeRecording(recordingFile);
          workingTranscript = cleanTranscriptForMom(transcriptionResult.transcript);
          transcriptionTokens = transcriptionResult.usage.totalTokens;
          setTranscript(workingTranscript);
        } else {
          if (!recordingUrl.trim()) {
            throw new Error("Enter a recording link before generating.");
          }

          setStatusMessage("Attempting authorized link import...");
          const linkResult = await linkImportService.importAuthorizedLink({
            platform: metadata.platform,
            recordingUrl: recordingUrl.trim(),
            passcode: recordingPasscode.trim()
          });

          const attemptSnapshot: LinkAttemptSnapshot = {
            status: linkResult.status,
            detectedPlatform: linkResult.detectedPlatform,
            reasonCode: linkResult.status === "completed" ? undefined : linkResult.reasonCode,
            attemptedAt: linkResult.diagnostics.attemptedAt,
            completedAt: linkResult.diagnostics.completedAt,
            diagnostics: linkResult.diagnostics
          };
          setLinkAttempt(attemptSnapshot);

          if (linkResult.status === "manual_upload_required") {
            setLinkFallbackPending(true);
            setStatusMessage("");
            setError(toFriendlyFallbackMessage(linkResult.reasonCode));
            return;
          }

          if (linkResult.status === "failed") {
            setLinkFallbackPending(true);
            setStatusMessage("");
            setError(linkResult.message);
            return;
          }

          workingTranscript = cleanTranscriptForMom(linkResult.transcript);
          setTranscript(workingTranscript);
          setLinkFallbackPending(false);
        }
      }

      if (!workingTranscript) {
        throw new Error("Transcript is empty after processing.");
      }

      setStatusMessage("Generating meeting summary...");
      const generated = await aiReportService.generateMeetingReport(workingTranscript, { ...metadata, sourceType });
      setReport(generated.report);
      setUsageMetrics({
        provider: generated.usage.provider,
        model: generated.usage.model,
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
    setSaving(true);
    setSaveError("");
    setSaveMessage("Saving...");

    try {
      const saveSourceType: SourceType =
        linkFallbackPending && generatedSourceType !== "recording_link"
          ? "manual_fallback_after_link"
          : generatedSourceType;

      const result = await meetingService.createWithStatus({
        ...metadata,
        sourceType: saveSourceType,
        finalIntakeMethod: saveSourceType,
        recordingUrl: generatedSourceType === "recording_link" || linkAttempt ? recordingUrl.trim() : undefined,
        importStatus: "completed",
        manualFallbackReason: linkAttempt?.status === "manual_upload_required" ? linkAttempt.reasonCode : undefined,
        detectedPlatform:
          linkAttempt?.detectedPlatform ||
          (generatedSourceType === "recording_link" && recordingUrl.trim()
            ? detectPlatformFromLink(recordingUrl.trim())
            : undefined),
        linkImportStatus: linkAttempt?.status || (linkFallbackPending ? "manual_upload_required" : "not_attempted"),
        linkImportReasonCode: linkAttempt?.reasonCode,
        linkImportAttemptedAt: linkAttempt?.attemptedAt,
        linkImportCompletedAt: linkAttempt?.completedAt,
        linkImportDiagnostics: linkAttempt?.diagnostics,
        rawTranscript: preparedTranscript || transcript,
        usageMetrics: usageMetrics ?? undefined,
        reportJson: report
      });

      setSavedMeetingId(result.id);
      if (result.storage === "firebase" && !result.fallbackUsed) {
        setSaveMessage("Meeting saved successfully.");
      } else if (result.fallbackUsed) {
        setSaveMessage("Meeting saved successfully using local browser storage.");
      } else {
        setSaveMessage("Meeting saved successfully.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown save error.";
      setSaveMessage("");
      setSaveError(`Save failed: ${message}`);
    } finally {
      setSaving(false);
    }
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
            Meeting link import
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
          <h3 className="font-semibold">Meeting Link Intake</h3>
          <p className="text-sm text-slate-600">Paste a recording or meeting link and passcode (if available). NuancePad will only use authorized, non-bypass access paths.</p>
          <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-500">
            <li>Paste the link and passcode from your meeting share email.</li>
            <li>If import needs interactive access, open the link in your browser and complete access with your authorized account.</li>
            <li>Download/export transcript or recording and upload it here to continue.</li>
          </ol>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Meeting or recording link</span>
            <input
              className="w-full rounded border p-2"
              placeholder="https://..."
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
          {linkAttempt && (
            <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600">
              Last link attempt: {linkAttempt.status} · Provider: {linkAttempt.detectedPlatform.replace(/_/g, " ")}
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
          {loading ? "Processing..." : "Generate MoM"}
        </button>
        {report && (
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm disabled:opacity-50"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save meeting"}
          </button>
        )}
        {savedMeetingId && !saving && (
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
            onClick={() => navigate(`/meetings/${savedMeetingId}`)}
          >
            View saved meeting
          </button>
        )}
      </div>

      {statusMessage && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{statusMessage}</div>}
      {error && <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">{error}</div>}
      {saveMessage && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{saveMessage}</div>}
      {saveError && <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">{saveError}</div>}

      {report && (
        <ExportActions
          meeting={{
            title: metadata.title,
            meetingDate: metadata.meetingDate,
            meetingType: metadata.meetingType,
            clientProject: metadata.clientProject,
            platform: metadata.platform,
            reportJson: report
          }}
        />
      )}

      {report ? <MomReportTables report={report} /> : <MomReportTables report={defaultMeetingReport()} />}
    </section>
  );
}
