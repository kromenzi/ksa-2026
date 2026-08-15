from pathlib import Path

iframe_component = '''  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "1px", height: "1px", border: "0", opacity: "0", pointerEvents: "none" });
  document.body.appendChild(iframe);
  const frameDoc = iframe.contentDocument;
  const frameWin = iframe.contentWindow;
  if (!frameDoc || !frameWin) { iframe.remove(); window.print(); return; }
  frameDoc.open();
  frameDoc.write(printHtml);
  frameDoc.close();
  window.setTimeout(() => {
    try { frameWin.focus(); frameWin.print(); }
    finally { window.setTimeout(() => iframe.remove(), 1000); }
  }, 300);
'''

component = Path('src/components/incident-pyramid.tsx')
text = component.read_text(encoding='utf-8')
start = text.find('  const popup = window.open("", "_blank", "noopener,noreferrer");', text.find('function openStandalonePyramidPrint('))
if start >= 0:
    end = text.find('\n}', start)
    if end < 0: raise SystemExit('Dashboard popup end not found')
    text = text[:start] + iframe_component + text[end:]
text = text.replace("<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),120));</script>", "")
if 'frameWin.print()' not in text:
    raise SystemExit('Dashboard iframe printer missing after repair')
component.write_text(text, encoding='utf-8')

iframe_page = '''    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "1px", height: "1px", border: "0", opacity: "0", pointerEvents: "none" });
    document.body.appendChild(iframe);
    const frameDoc = iframe.contentDocument;
    const frameWin = iframe.contentWindow;
    if (!frameDoc || !frameWin) {
      iframe.remove();
      toast.error(isAr ? "تعذر تجهيز صفحة الطباعة" : "Could not prepare print page");
      return;
    }
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();
    window.setTimeout(() => {
      try { frameWin.focus(); frameWin.print(); }
      finally { window.setTimeout(() => iframe.remove(), 1000); }
    }, 300);
'''
page = Path('src/pages/admin/safety-pyramid.tsx')
text = page.read_text(encoding='utf-8')
start = text.find('    const blobUrl = URL.createObjectURL', text.find('  const openPrintWindow ='))
if start >= 0:
    end = text.find('\n    logActivity(', start)
    if end < 0: raise SystemExit('Safety printer end not found')
    text = text[:start] + iframe_page + text[end:]
if 'frameWin.print()' not in text:
    raise SystemExit('Safety iframe printer missing after repair')
page.write_text(text, encoding='utf-8')

print('Pyramid print repair verified: iframe printers active and dashboard auto-print removed')
