export const QUALITY_OPTIONS = [
  { value: "720p", label: "720p", transform: "h_720,q_auto:good" },
  { value: "480p", label: "480p", transform: "h_480,q_auto:good" },
  { value: "360p", label: "360p", transform: "h_360,q_auto:good" },
  { value: "data-saver", label: "Data saver", transform: "h_240,q_auto:low" },
];

// Cloudinary transformations are inserted as a path segment right after "/upload/".
export function buildQualityUrl(originalUrl, qualityValue) {
  if (!originalUrl) return originalUrl;
  const option = QUALITY_OPTIONS.find((o) => o.value === qualityValue);
  if (!option) return originalUrl;
  return originalUrl.replace("/upload/", `/upload/${option.transform}/`);
}
