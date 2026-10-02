import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

// Walks the case's Documents folder tree and returns a flat list of
// { path, node } for every FILE, with folder names joined into a path
// (e.g. "Client Documents/CNIC.pdf") — used both to list documents in the
// PDF and to lay them out inside the ZIP with the same folder structure the
// admin built in the app.
function flattenDocuments(nodes, prefix = '') {
  let out = [];
  for (const n of nodes || []) {
    if (n.kind === 'folder') {
      out = out.concat(flattenDocuments(n.children || [], `${prefix}${n.name}/`));
    } else {
      out.push({ path: `${prefix}${n.name}`, node: n });
    }
  }
  return out;
}

// Renders a one-page(+) PDF summary of the case, laid out the same way as
// the Case Details screen: Client Information, then Case Information
// (including any PI-specific fields), assigned lawyers, notes, and a list
// of every document bundled into the archive ZIP alongside it.
function buildCasePdfBlob({ caseRecord, client, typeLabel, lawyerNames, feeReceived, documentPaths }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const pageBottom = 780;
  let y = 56;

  function ensureRoom(next = 18) {
    if (y + next > pageBottom) { doc.addPage(); y = 56; }
  }
  function h1(text) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(20);
    doc.text(text, marginX, y); y += 24;
  }
  function h2(text) {
    ensureRoom(24);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(20);
    doc.text(text, marginX, y); y += 18;
  }
  function row(label, value) {
    ensureRoom(18);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
    doc.setTextColor(120); doc.text(label, marginX, y);
    doc.setTextColor(25);
    const val = doc.splitTextToSize(String(value ?? '—'), 330);
    doc.text(val, marginX + 170, y);
    y += 16 * val.length;
  }
  function hr() {
    ensureRoom(14);
    doc.setDrawColor(225); doc.line(marginX, y, 548, y); y += 14;
  }

  h1(`Case Archive — ${caseRecord.caseId}`);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(140);
  doc.text(`Archived on ${new Date().toLocaleString()}`, marginX, y);
  y += 22;
  hr();

  h2('Client Information');
  row('Name', client?.name);
  row('Email', client?.email);
  row('Phone', client?.phone);
  row('Address', client?.address);
  y += 6; hr();

  h2('Case Information');
  row('Case ID', caseRecord.caseId);
  row('Case Type', typeLabel);
  row('Status', caseRecord.status);
  row('Matter', caseRecord.matter);
  row('Our Ref', caseRecord.ourRef);
  row('Opening Date', caseRecord.openingDate);
  row('Closing Date', caseRecord.closingDate || '—');
  row('Fee Agreed', caseRecord.feeAgreed ? `Rs ${Number(caseRecord.feeAgreed).toLocaleString()}` : '—');
  row('Fee Received', `Rs ${Number(feeReceived || 0).toLocaleString()}`);
  if (caseRecord.piFields) {
    Object.entries(caseRecord.piFields).forEach(([k, v]) => { if (v) row(k.toUpperCase(), v); });
  }
  row('Assigned Lawyer(s)', lawyerNames.length ? lawyerNames.join(', ') : 'Unassigned');

  if (caseRecord.notes) {
    y += 6; hr();
    h2('Notes');
    ensureRoom(16);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(25);
    const split = doc.splitTextToSize(caseRecord.notes, 500);
    ensureRoom(14 * split.length);
    doc.text(split, marginX, y);
    y += 14 * split.length;
  }

  if (documentPaths.length) {
    y += 6; hr();
    h2('Documents Included in This Archive');
    documentPaths.forEach(p => {
      ensureRoom(15);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(60);
      doc.text(`• ${p}`, marginX, y);
      y += 15;
    });
  }

  return doc.output('blob');
}

// Builds the archive ZIP: the case PDF at the root, plus every uploaded
// document under a "Client Documents" folder, preserving the exact folder
// structure the admin created in the Documents manager.
async function buildArchiveZip({ pdfBlob, pdfName, documents }) {
  const zip = new JSZip();
  zip.file(pdfName, pdfBlob);
  const docsFolder = zip.folder('Client Documents');
  for (const { path, node } of flattenDocuments(documents)) {
    const base64 = (node.dataUrl || '').split(',')[1] || '';
    docsFolder.file(path, base64, { base64: true });
  }
  return zip.generateAsync({ type: 'blob' });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Public entry point: builds the PDF + ZIP for a case and downloads it to
// the browser's Downloads folder. Does NOT delete the case itself — the
// caller does that only after this resolves successfully, so a failed
// download never destroys data with nothing to show for it.
export async function downloadCaseArchive({ caseRecord, client, typeLabel, lawyerNames, feeReceived }) {
  const documents = caseRecord.documents || [];
  const documentPaths = flattenDocuments(documents).map(f => f.path);
  const pdfName = `${caseRecord.caseId}-Case-Details.pdf`;
  const pdfBlob = buildCasePdfBlob({ caseRecord, client, typeLabel, lawyerNames, feeReceived, documentPaths });
  const zipBlob = await buildArchiveZip({ pdfBlob, pdfName, documents });
  downloadBlob(zipBlob, `${caseRecord.caseId}-Archive.zip`);
}
