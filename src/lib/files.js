// Converts browser File objects into plain, JSON-serializable attachment
// records so they can live in the mock localStorage database. A real
// backend should instead upload these to real file storage and store a URL.
const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB — generous for a demo store, keeps localStorage usable

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Could not read file "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

export async function filesToAttachments(fileList) {
  const files = Array.from(fileList || []);
  const attachments = [];
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`"${file.name}" is larger than 4MB — pick a smaller file for this demo.`);
    }
    const dataUrl = await readAsDataURL(file);
    attachments.push({
      id: `att_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      dataUrl,
      rawFile: file,
    });
  }
  return attachments;
}

export function isImageAttachment(att) {
  return (att.type || '').startsWith('image/');
}

export function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}
