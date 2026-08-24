const STORAGE_KEY = "board_license_types_v1";
const TYPES = [
  { id: "LT-8", nameEn: "Environmental License", nameAr: "رخصة البيئة", code: "ENV", active: true },
  { id: "LT-9", nameEn: "Civil Defense License", nameAr: "رخصة الدفاع المدني", code: "CIV", active: true },
];

try {
  const raw = localStorage.getItem(STORAGE_KEY);
  const existing = raw ? JSON.parse(raw) : [];
  if (Array.isArray(existing)) {
    const merged = [...existing];
    for (const item of TYPES) {
      if (!merged.some((x: any) => x?.code === item.code)) merged.push(item);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }
} catch {}
