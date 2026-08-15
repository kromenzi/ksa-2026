from pathlib import Path
import re

# 1) Make language switching work before authentication.
data = Path("src/lib/data-context.tsx")
text = data.read_text(encoding="utf-8")
old = ' const updateSettings=async(d:Partial<SiteSettings>)=>{try{await apiRequest("PATCH","/api/site-settings",d);}catch{} invalidate("/api/site-settings")};'
new = ''' const updateSettings=async(d:Partial<SiteSettings>)=>{
   if (d.language === "ar" || d.language === "en") {
     setLocalLanguage(d.language);
     try { localStorage.setItem("safety-board-language", d.language); } catch {}
   }
   try { await apiRequest("PATCH","/api/site-settings",d); } catch {}
   invalidate("/api/site-settings");
 };'''
if old in text:
    text = text.replace(old, new, 1)
    data.write_text(text, encoding="utf-8")
    print("Patched pre-auth language persistence")
else:
    if 'setLocalLanguage(d.language)' in text:
        print("Language persistence already patched")
    else:
        raise SystemExit("Could not locate updateSettings")

# 2) Install the direct SVG/A4 pyramid printer.
pyramid = Path("src/pages/admin/safety-pyramid.tsx")
text = pyramid.read_text(encoding="utf-8")
snippet = Path("scripts/pyramid-print-handler.txt").read_text(encoding="utf-8")
start_marker = "  const handlePrint = () => {"
end_marker = "  const exportCSV = () => {"
start = text.find(start_marker)
end = text.find(end_marker, start)
if start < 0 or end < 0 or end <= start:
    raise SystemExit("Could not locate pyramid handlePrint block")
text = text[:start] + snippet + "\n" + text[end:]
pyramid.write_text(text, encoding="utf-8")
print("Installed direct visual pyramid print V4")
