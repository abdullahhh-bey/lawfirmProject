/**
 * Generates an official Law Firm Payment Receipt image (PNG Blob) using HTML5 Canvas.
 */
import logoUrl from '../components/ui/lawfirmLOGO.jpg?url';

export function generateReceiptPng({ client, caseId, entry, totalAgreed, officeBalance }) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 2000;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 800, 1000);

    // Decorative Header Banner
    const gradient = ctx.createLinearGradient(0, 0, 800, 0);
    gradient.addColorStop(0, '#000080');
    gradient.addColorStop(1, '#17178D');
    ctx.fillStyle = gradient;
    ctx.fillRect(190, 0, 610, 140);

    ctx.fillStyle = '#FFFAFA';
    ctx.font = '14px "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Solicitors & Legal Services', 200, 75);

    // Badge
    ctx.fillStyle = '#28288F';
    ctx.fillRect(600, 35, 160, 30);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFFICIAL RECEIPT', 680, 55);
    ctx.textAlign = 'left';

    // Subheader Bar
    ctx.fillStyle = '#E9E9F8';
    ctx.fillRect(0, 140, 800, 50);
    ctx.fillStyle = '#000080';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('PAYMENT ACKNOWLEDGEMENT RECEIPT', 40, 172);

    const receiptNo = `REC-${String(Date.now()).slice(-6)}`;
    const dateStr = new Date(entry.date || Date.now()).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    ctx.fillStyle = '#64748B';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Receipt No: ${receiptNo}`, 760, 162);
    ctx.fillText(`Date: ${dateStr}`, 760, 180);
    ctx.textAlign = 'left';

    // Details Box
    let y = 220;

    function drawRow(label, value, isBold = false) {
      ctx.fillStyle = '#475569';
      ctx.font = '14px sans-serif';
      ctx.fillText(label, 50, y);

      ctx.fillStyle = isBold ? '#0F172A' : '#1E293B';
      ctx.font = isBold ? 'bold 15px sans-serif' : '14px sans-serif';
      ctx.fillText(value || '—', 220, y);

      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, y + 10);
      ctx.lineTo(750, y + 10);
      ctx.stroke();

      y += 45;
    }

    drawRow('Client Name', client?.name, true);
    drawRow('Client Phone', client?.phone || '—');
    drawRow('Case / File Ref', caseId ? `Case ID: ${caseId}` : 'General Client Ledger', true);
    drawRow('Account Type', entry.account === 'client' ? 'Client Account (Trust Fund)' : 'Office Account (Professional Fee)');
    drawRow('Transaction Type', entry.type === 'OUT' ? 'Refund / Disbursement' : 'Payment Received');
    drawRow('Reference No.', entry.reference || 'N/A');
    drawRow('Particulars', entry.particulars || 'Legal Professional Services');
    drawRow('Description', entry.description || 'Payment recorded in firm ledger');

    y += 10;

    // Amount Box
    ctx.fillStyle = entry.type === 'OUT' ? '#FEF2F2' : '#F0FDF4';
    ctx.strokeStyle = entry.type === 'OUT' ? '#FCA5A5' : '#86EFAC';
    ctx.lineWidth = 2;
    ctx.roundRect ? ctx.roundRect(40, y, 720, 100, 12) : ctx.fillRect(40, y, 720, 100);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = entry.type === 'OUT' ? '#991B1B' : '#166534';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(entry.type === 'OUT' ? 'AMOUNT REFUNDED:' : 'AMOUNT RECEIVED:', 70, y + 40);

    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(`£ ${Number(entry.amount || 0).toLocaleString('en-GB')}`, 70, y + 80);

    // Status Summary on Right of Box
    ctx.fillStyle = '#475569';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'right';
    if (totalAgreed > 0) {
      ctx.fillText(`Total Agreed Fee: £ ${Number(totalAgreed).toLocaleString('en-GB')}`, 730, y + 40);
    }
    ctx.fillText(`Current Office Balance: £ ${Number(officeBalance || 0).toLocaleString('en-GB')}`, 730, y + 70);
    ctx.textAlign = 'left';

    y += 130;

    // Footer & Signature
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px sans-serif';
    ctx.fillText('This is a computer-generated official receipt issued by PLUG SOLICITORS.', 50, y + 50);

    const logo = new Image();
    logo.onload = () => {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const logoHeight = (155 * logo.naturalHeight) / logo.naturalWidth;
      ctx.drawImage(logo, 20, 18, 155, logoHeight);
      canvas.toBlob((blob) => {
        resolve({ blob, dataUrl: canvas.toDataURL('image/png'), receiptNo });
      }, 'image/png');
    };
    logo.onerror = () => {
      ctx.fillStyle = '#000080';
      ctx.font = 'bold 22px "Segoe UI", Roboto, sans-serif';
      ctx.fillText('PLUG SOLICITORS', 40, 55);
      canvas.toBlob((blob) => {
        resolve({ blob, dataUrl: canvas.toDataURL('image/png'), receiptNo });
      }, 'image/png');
    };
    logo.src = logoUrl;
  });
}
