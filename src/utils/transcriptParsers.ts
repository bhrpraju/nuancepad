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

  return raw.trim();
};
