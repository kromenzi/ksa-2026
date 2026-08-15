from pathlib import Path

path = Path('src/pages/admin/risk-assessment.tsx')
source = path.read_text(encoding='utf-8')
if 'handlePrintRiskTableAsImage' in source:
    raise SystemExit('already patched')
marker = '  const handlePrintAllRisks = () => {'
if marker not in source:
    raise SystemExit('marker not found')
helper = '''  const handlePrintRiskTableAsImage = async () => {
    const rows = filteredRisks.length > 0 ? filteredRisks : risks;
    const title = isAr ? "سجل تقييم المخاطر" : "Risk Assessment Register";
    const subtitle = isAr ? "Risk Assessment Matrix 5x5" : "Risk Assessment & Hazard Control Register";
    const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' } as Record<string,string>)[c] || c);
    const riskLabel = (score: number) => score >= 15 ? (isAr ? "حرج / مرتفع" : "High / Critical") : score >= 8 ? (isAr ? "متوسط" : "Medium") : (isAr ? "منخفض" : "Low");
    const statusLabel = (status: RiskItem["status"]) => !isAr ? status : status === "Approved" ? "معتمد" : status === "Active" ? "نشط" : "قيد المراجعة";
    const rowsHtml = rows.map((item) => `<tr><td>${esc(item.refNo)}</td><td><strong>${esc(item.activity)}</strong><div>${esc(item.hazard)}</div></td><td><strong>${esc(item.location)}</strong><div>${esc(item.department)}</div></td><td>${item.initialRiskScore} - ${riskLabel(item.initialRiskScore)}<div>L${item.initialLikelihood} × S${item.initialSeverity}</div></td><td>${item.residualRiskScore} - ${riskLabel(item.residualRiskScore)}<div>L${item.residualLikelihood} × S${item.residualSeverity}</div></td><td>${esc(statusLabel(item.status))}<div>${esc(item.reviewDate)}</div></td></tr>`).join('');
    const headers = isAr ? ['الرقم المرجعي','النشاط والخطر','الموقع والقسم','المخاطرة الأولية','المخاطرة المتبقية','الحالة'] : ['Ref No','Activity & Hazard','Location & Dept','Initial Risk','Residual Risk','Status'];
    const html = `<div xmlns="http://www.w3.org/1999/xhtml" dir="${isAr ? 'rtl' : 'ltr'}" style="font-family:Arial,sans-serif;color:#111827;background:#fff;padding:50px;box-sizing:border-box;width:100%;height:100%"><div style="font-size:28px;font-weight:800;text-align:center">ABDULKAREM SAFETY BOARD</div><h1 style="font-size:34px;text-align:center;margin:16px 0 6px">${esc(title)}</h1><div style="font-size:18px;color:#475569;text-align:center;margin-bottom:24px">${esc(subtitle)} • ${new Date().toLocaleDateString()}</div><table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:18px"><thead><tr>${headers.map(h=>`<th style="background:#e2e8f0;border:1px solid #94a3b8;padding:14px">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rowsHtml || `<tr><td colspan="6" style="padding:24px;text-align:center;border:1px solid #cbd5e1">${isAr ? 'لا توجد سجلات' : 'No records'}</td></tr>`}</tbody></table><div style="margin-top:16px;color:#475569">${isAr ? `إجمالي السجلات: ${rows.length}` : `Total records: ${rows.length}`}</div></div>`;
    const width=2400, height=Math.max(1000, 360 + Math.max(rows.length,1)*190);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
    const img=new Image();
    img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx){URL.revokeObjectURL(url);return;}ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(img,0,0,width,height);URL.revokeObjectURL(url);const png=canvas.toDataURL('image/png',1);const win=window.open('','_blank','noopener,noreferrer');if(!win){toast({title:isAr?'تعذر فتح نافذة الطباعة':'Unable to open print window',variant:'destructive'});return;}win.document.write(`<!doctype html><html><head><title>${esc(title)}</title><style>@page{size:A4 landscape;margin:8mm}html,body{margin:0;background:#fff}body{display:flex;justify-content:center}img{width:100%;height:auto;display:block}</style></head><body><img src="${png}" alt="${esc(title)}"></body></html>`);win.document.close();setTimeout(()=>{win.focus();win.print();},300);};
    img.onerror=()=>{URL.revokeObjectURL(url);toast({title:isAr?'تعذر إنشاء صورة الجدول':'Unable to create table image',variant:'destructive'});};
    img.src=url;
  };

'''
source = source.replace(marker, helper + marker, 1)
button_marker = '          <Button onClick={handlePrintAllRisks} variant="outline" className="gap-2 bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700" data-testid="button-print-risk-header">'
if button_marker not in source:
    raise SystemExit('button marker not found')
image_button = '''          <Button onClick={handlePrintRiskTableAsImage} variant="outline" className="gap-2 bg-white border-slate-300 text-slate-800 hover:bg-slate-100" data-testid="button-print-risk-table-image">
            <Printer className="h-4 w-4" />
            {isAr ? "طباعة الجدول كصورة" : "Print Table as Image"}
          </Button>

'''
source = source.replace(button_marker, image_button + button_marker, 1)
path.write_text(source, encoding='utf-8')
print('patched')
