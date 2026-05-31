const parseSrt = (value: string): string =>
  value
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => !/^\d+$/.test(line.trim()))
    .filter((line) => !line.includes("-->") && !/^\d{2}:\d{2}:\d{2},\d{3}/.test(line.trim()))
    .join("\n")
    .trim();

const parseVtt = (value: string): string =>
  value
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => !line.startsWith("WEBVTT"))
    .filter((line) => !line.includes("-->") && !/^\d{2}:\d{2}:\d{2}\.\d{3}/.test(line.trim()))
    .join("\n")
    .trim();

const parseCsv = (value: string): string =>
  value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.split(",").map((item) => item.trim()).filter(Boolean).join(" "))
    .join("\n")
    .trim();

const TIMESTAMP_ONLY = /^\s*\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?\s*$/;
const RANGE_TIMESTAMP = /^\s*\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?\s*-->\s*\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?\s*$/;

export const cleanTranscriptForMom = (raw: string): string => {
  const lines = raw.replace(/\r/g, "").split("\n");
  const cleaned: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      cleaned.push("");
      continue;
    }

    if (/^\d+$/.test(trimmed) || TIMESTAMP_ONLY.test(trimmed) || RANGE_TIMESTAMP.test(trimmed)) {
      continue;
    }

    // Remove speaker labels with trailing timestamps like "Gauri Sinha 35:51".
    const withoutTrailingTimestamp = trimmed.replace(/\s+\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?$/, "").trim();
    if (withoutTrailingTimestamp) {
      cleaned.push(withoutTrailingTimestamp);
    }
  }

  const deduped = cleaned.filter((line, index, arr) => {
    if (!line) {
      return true;
    }
    const previous = arr[index - 1];
    return !previous || previous.toLowerCase() !== line.toLowerCase();
  });

  return deduped.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

export const parseTranscriptByFileName = (raw: string, fileName: string): string => {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".srt")) {
    return parseSrt(raw);
  }

  if (lower.endsWith(".vtt")) {
    return parseVtt(raw);
  }

  if (lower.endsWith(".csv")) {
    return parseCsv(raw);
  }

  return cleanTranscriptForMom(raw);
};
