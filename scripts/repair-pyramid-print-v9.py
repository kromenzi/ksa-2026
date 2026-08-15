from pathlib import Path


def replace_once(path: str, start_marker: str, end_marker: str, replacement: str) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    start = text.find(start_marker)
    end = text.find(end_marker, start)
    if start < 0 or end < 0:
        raise SystemExit(f'Could not locate markers in {path}')
    p.write_text(text[:start] + replacement + text[end:], encoding='utf-8')

# Dashboard pyramid: keep its existing HTML generator, but replace the popup with
# a same-origin hidden iframe. This avoids popup/Blob timing producing a blank print.
component = Path('src/components/incident-pyramid.tsx')
text = component.read_text(encoding='utf-8')
start = text.find('  const popup = window.open("", "_blank", "noopener,noreferrer");', text.find('function openStandalonePyramidPrint('))
end = text.find('\n}', start)
if start < 0 or end < 0:
    raise SystemExit('Dashboard pyramid popup block not found')
iframe_code = '''  const iframe = document.createElement("iframe");
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
text = text[:start] + iframe_code + text[end:]
component.write_text(text, encoding='utf-8')

# Dedicated /admin/safety-pyramid page: keep its existing generated HTML and
# replace the Blob/popup print path with the same-origin iframe print path.
page = Path('src/pages/admin/safety-pyramid.tsx')
text = page.read_text(encoding='utf-8')
start = text.find('    const blobUrl = URL.createObjectURL', text.find('  const openPrintWindow ='))
end = text.find('\n    logActivity(', start)
if start < 0 or end < 0:
    raise SystemExit('Safety pyramid blob print block not found')
iframe_code = '''    const iframe = document.createElement("iframe");
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
text = text[:start] + iframe_code + text[end:]
page.write_text(text, encoding='utf-8')

print('Pyramid print V9 patched: dashboard component + safety pyramid page')
