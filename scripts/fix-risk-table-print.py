from pathlib import Path
import re

path = Path('src/pages/admin/risk-assessment.tsx')
s = path.read_text(encoding='utf-8')
start = s.index('  const handlePrintRiskTableAsImage = async () => {')
end = s.index('  const handlePrintAllRisks = () => {', start)

replacement = r'''  const handlePrintRiskTableAsImage = () => {
    const rows = filteredRisks.length > 0 ? filteredRisks : risks;
    const title = isAr ? "سجل تقييم المخاطر" : "Risk Assessment Register";
    const popup = window.open("", "_blank", "width=1200,height=900");

    if (!popup) {
      toast({
        title: isAr ? "تم حظر نافذة الطباعة" : "Print window blocked",
        description: isAr ? "اسمح بالنوافذ المنبثقة للموقع ثم أعد المحاولة." : "Allow pop-ups for this site and try again.",
        variant: "destructive",
      });
      return;
    }

    popup.document.write('<!doctype html><html><head><title>' + title + '</title></head><body style="font-family:Arial,sans-serif;background:#fff;margin:0;padding:30px;text-align:center"><h2>' + title + '</h2><p>Preparing table image...</p></body></html>');
    popup.document.close();

    const esc = (value: unknown) => String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

    const lines = (text: string, max: number) => {
      const words = String(text || "—").trim().split(/\s+/);
      const out: string[] = [];
      let line = "";
      for (const word of words) {
        const next = line ? line + " " + word : word;
        if (next.length > max && line) {
          out.push(line);
          line = word;
        } else {
          line = next;
        }
      }
      if (line) out.push(line);
      return out.slice(0, 4);
    };

    const riskText = (score: number) => score >= 15
      ? (isAr ? "حرج / مرتفع" : "High / Critical")
      : score >= 8
        ? (isAr ? "متوسط" : "Medium")
        : (isAr ? "منخفض" : "Low");

    const statusText = (status: RiskItem["status"]) => !isAr
      ? status
      : status === "Approved" ? "معتمد" : status === "Active" ? "نشط" : "قيد المراجعة";

    const width = 2600;
    const margin = 60;
    const y0 = 210;
    const headerH = 110;
    const rowH = 230;
    const widths = [250, 570, 450, 430, 430, 360];
    const tableW = widths.reduce((a, b) => a + b, 0);
    const height = Math.max(1200, y0 + headerH + Math.max(rows.length, 1) * rowH + 100);
    const headerNames = isAr
      ? ["الرقم المرجعي", "النشاط والخطر", "الموقع والقسم", "المخاطرة الأولية", "المخاطرة المتبقية", "الحالة"]
      : ["Ref No", "Activity & Hazard", "Location & Dept", "Initial Risk", "Residual Risk", "Status"];

    const text = (x: number, y: number, value: string, size = 20, weight = 500, anchor = "start") =>
      `<text x="${x}" y="${y}" fill="#111827" font-family="Arial, Tahoma, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${esc(value)}</text>`;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fff"/>`;
    svg += text(width / 2, 55, "ABDULKAREM SAFETY BOARD", 30, 800, "middle");
    svg += text(width / 2, 105, title, 38, 800, "middle");
    svg += text(width / 2, 145, new Date().toLocaleDateString(), 18, 500, "middle");

    let x = margin;
    headerNames.forEach((header, i) => {
      svg += `<rect x="${x}" y="${y0}" width="${widths[i]}" height="${headerH}" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>`;
      svg += text(x + widths[i] / 2, y0 + 65, header, 20, 800, "middle");
      x += widths[i];
    });

    rows.forEach((item, index) => {
      const y = y0 + headerH + index * rowH;
      const fill = index % 2 === 0 ? "#ffffff" : "#f8fafc";
      x = margin;
      const cells = [
        lines(item.refNo, 18),
        [...lines(item.activity, 30), ...lines(item.hazard, 34).slice(0, 2)],
        [...lines(item.location, 24), ...lines(item.department, 24).slice(0, 2)],
        [`${item.initialRiskScore} - ${riskText(item.initialRiskScore)}`, `L${item.initialLikelihood} × S${item.initialSeverity}`],
        [`${item.residualRiskScore} - ${riskText(item.residualRiskScore)}`, `L${item.residualLikelihood} × S${item.residualSeverity}`],
        [statusText(item.status), item.reviewDate],
      ];
      cells.forEach((cellLines, i) => {
        svg += `<rect x="${x}" y="${y}" width="${widths[i]}" height="${rowH}" fill="${fill}" stroke="#cbd5e1" stroke-width="2"/>`;
        const size = i === 1 || i === 2 ? 18 : 20;
        cellLines.slice(0, 4).forEach((line, j) => {
          svg += text(x + 18, y + 45 + j * (size + 13), line, size, j === 0 && i === 0 ? 800 : 500);
        });
        x += widths[i];
      });
    });

    svg += text(width / 2, height - 35, isAr ? `إجمالي السجلات: ${rows.length}` : `Total records: ${rows.length}`, 18, 600, "middle");
    svg += '</svg>';

    const objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);
        const png = canvas.toDataURL("image/png");
        popup.document.open();
        popup.document.write('<!doctype html><html><head><title>' + esc(title) + '</title><style>@page{size:A4 landscape;margin:8mm}html,body{margin:0;background:#fff}img{display:block;width:100%;height:auto;margin:0 auto}</style></head><body><img src="' + png + '" alt="' + esc(title) + '"></body></html>');
        popup.document.close();
        setTimeout(() => { popup.focus(); popup.print(); }, 350);
      } catch (error) {
        console.error(error);
        URL.revokeObjectURL(objectUrl);
        popup.close();
        toast({ title: isAr ? "تعذر تجهيز صورة الجدول" : "Unable to prepare table image", variant: "destructive" });
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      popup.close();
      toast({ title: isAr ? "تعذر إنشاء صورة الجدول" : "Unable to create table image", variant: "destructive" });
    };
    image.src = objectUrl;
  };

'''

new_s = s[:start] + replacement + s[end:]
path.write_text(new_s, encoding='utf-8')
print('patched risk table print handler')
