// Converts browser File objects into lightweight attachment metadata.
// New uploads are sent as real files via FormData and stored as metadata only.
const MAX_FILE_BYTES = 4 * 1024 * 1024;

export async function filesToAttachments(fileList) {
  const files = Array.from(fileList || []);
  const attachments = [];

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`"${file.name}" is larger than 4MB — pick a smaller file.`);
    }

    attachments.push({
      id: `att_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      rawFile: file,
    });
  }

  return attachments;
}

export function isImageAttachment(att) {
  return ((att?.type || att?.mimeType || '') + '').startsWith('image/');
}

export function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}
