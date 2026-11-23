import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatDate, formatDateTime } from './dates';
import { sessionLabel } from './constants';
import { num } from './format';

applyPlugin(jsPDF); // adds doc.autoTable() to every jsPDF document

const GREEN = [6, 78, 50];
const MID = [22, 131, 74];

function drawBars(doc, data, x, y, w, h) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const niceMax = Math.ceil(max / 4) * 4 || 4;
  doc.setDrawColor(224, 231, 226); doc.setLineWidth(0.2); doc.setFontSize(7); doc.setTextColor(113, 128, 120);
  for (let i = 0; i <= 4; i++) {
    const gy = y + h - (h * i) / 4;
    doc.line(x, gy, x + w, gy);
    doc.text(String(Math.round((niceMax * i) / 4 * 10) / 10), x - 2, gy + 1, { align: 'right' });
  }
  const slot = w / data.length;
  const bw = Math.min(slot * 0.7, 14);
  const every = Math.ceil(data.length / 12);
  data.forEach((d, i) => {
    const bh = (d.total / niceMax) * h;
    const bx = x + i * slot + (slot - bw) / 2;
    // jsPDF shares one colour between text and fills, so set the fill again for every bar
    doc.setFillColor(...MID);
    if (bh > 0) doc.roundedRect(bx, y + h - bh, bw, bh, 0.6, 0.6, 'F');
    doc.setTextColor(113, 128, 120);
    if (i % every === 0) doc.text(d.label, bx + bw / 2, y + h + 4, { align: 'center' });
  });
}

export function exportPdf(r) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  doc.setFillColor(...GREEN); doc.rect(0, 0, W, 30, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(r.farmName, 14, 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(`${r.title}  |  ${r.periodLabel}`, 14, 21);
  doc.setFontSize(8); doc.text(`Generated ${formatDateTime(new Date().toISOString())}`, 14, 26.5);
  doc.setTextColor(23, 34, 27);

  const filterLines = [];
  if (r.cowName) filterLines.push(['Cow', r.cowName]);
  if (r.session) filterLines.push(['Session', sessionLabel(r.session)]);

  let y = 38;
  const tableStyle = { theme: 'striped', headStyles: { fillColor: GREEN }, styles: { fontSize: 9 }, margin: { left: 14, right: 14 } };
  doc.autoTable({
    ...tableStyle, startY: y, head: [['Summary', '']],
    body: [
      ...filterLines,
      ['Total milk production', `${num(r.total)} L`],
      ['Daily production average', `${num(r.dailyAverage)} L per day (${r.days} day${r.days > 1 ? 's' : ''})`],
      ['Average per active cow', `${num(r.averagePerCow)} L (${r.activeCows} active cows)`],
      ['Highest-producing cow', r.top ? `${r.top.name} (${r.top.ear_tag}) - ${num(r.top.total)} L` : 'No records'],
      ['Number of records', String(r.records.length)],
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
  });
  y = doc.lastAutoTable.finalY + 8;

  doc.autoTable({
    ...tableStyle, startY: y, head: [['Milking session', { content: 'Litres', styles: { halign: 'right' } }]],
    body: ['MORNING', 'LUNCH', 'EVENING'].map((k) => [sessionLabel(k), num(r.sessions[k])]),
    columnStyles: { 1: { halign: 'right' } },
  });
  y = doc.lastAutoTable.finalY + 8;

  doc.autoTable({
    ...tableStyle, startY: y, head: [['Cow', 'Ear tag', { content: 'Litres', styles: { halign: 'right' } }]],
    body: r.cows.length ? r.cows.map((c) => [c.name, c.ear_tag, num(c.total)]) : [['No records', '', '']],
    columnStyles: { 2: { halign: 'right' } },
  });
  y = doc.lastAutoTable.finalY + 10;

  if (y + 75 > H) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(r.chartTitle, 14, y);
  drawBars(doc, r.chart, 24, y + 6, W - 24 - 14, 50);
  doc.setTextColor(23, 34, 27);
  y += 70;

  if (y + 30 > H) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Detailed records', 14, y);
  doc.autoTable({
    ...tableStyle, startY: y + 3, head: [['Date', 'Cow', 'Ear tag', 'Session', { content: 'Litres', styles: { halign: 'right' } }, 'Notes']],
    body: r.records.map((x) => [formatDate(x.record_date), x.cows?.name ?? '', x.cows?.ear_tag ?? '', sessionLabel(x.session), num(x.quantity), x.notes ?? '']),
    columnStyles: { 4: { halign: 'right' } },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(113, 128, 120);
    doc.text(`${r.farmName} - Page ${i} of ${pages}`, W / 2, H - 8, { align: 'center' });
  }
  doc.save(`DairyFarm-Report-${r.from}_to_${r.to}.pdf`);
}

export function exportExcel(r) {
  const wb = XLSX.utils.book_new();
  const summary = [
    ['Farm', r.farmName], ['Report', r.title], ['Period', r.periodLabel],
    ...(r.cowName ? [['Cow', r.cowName]] : []),
    ...(r.session ? [['Session', sessionLabel(r.session)]] : []),
    [],
    ['Total milk production (L)', r.total],
    ['Daily production average (L)', r.dailyAverage],
    ['Days in period', r.days],
    ['Average per active cow (L)', r.averagePerCow],
    ['Active cows', r.activeCows],
    ['Highest-producing cow', r.top ? `${r.top.name} (${r.top.ear_tag})` : 'No records'],
    ['Highest cow production (L)', r.top ? r.top.total : 0],
    ['Number of records', r.records.length],
    [],
    ['Morning (L)', r.sessions.MORNING], ['Lunch (L)', r.sessions.LUNCH], ['Evening (L)', r.sessions.EVENING],
  ];
  const s1 = XLSX.utils.aoa_to_sheet(summary); s1['!cols'] = [{ wch: 32 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, s1, 'Summary');

  const s2 = XLSX.utils.json_to_sheet(r.cows.map((c) => ({ Cow: c.name, 'Ear tag': c.ear_tag, 'Litres': c.total })));
  s2['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, s2, 'By cow');

  const s3 = XLSX.utils.json_to_sheet(r.chart.map((d) => ({ Period: d.label, Litres: d.total })));
  XLSX.utils.book_append_sheet(wb, s3, r.chartTitle.startsWith('Weekly') ? 'Weekly' : 'Daily');

  const s4 = XLSX.utils.json_to_sheet(r.records.map((x) => ({
    Date: x.record_date, Cow: x.cows?.name ?? '', 'Ear tag': x.cows?.ear_tag ?? '', Session: sessionLabel(x.session),
    Litres: x.quantity, Notes: x.notes ?? '', 'Recorded at': formatDateTime(x.created_at),
  })));
  s4['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 9 }, { wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, s4, 'Records');

  XLSX.writeFile(wb, `DairyFarm-Report-${r.from}_to_${r.to}.xlsx`);
}
