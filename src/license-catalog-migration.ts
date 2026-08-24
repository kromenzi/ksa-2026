const REGULATORY_LICENSE_TYPES = [
  {
    id: "LT-8",
    nameEn: "Environmental License",
    nameAr: "رخصة البيئة",
    code: "ENV",
    active: true,
  },
  {
    id: "LT-9",
    nameEn: "Civil Defense License",
    nameAr: "رخصة الدفاع المدني",
    code: "CIV",
    active: true,
  },
];

try {
  const key = "board_license_types_v1";
  const raw = localStorage.getItem(key);
  const existing = raw ? JSON.parse(raw) : [];
  const list = Array.isArray(existing) ? existing : [];
  const merged = [...list];

  for (const item of REGULATORY_LICENSE_TYPES) {
    if (!merged.some((entry: any) => entry?.id === item.id || entry?.code === item.code)) {
      merged.push(item);
    }
  }

  localStorage.setItem(key, JSON.stringify(merged));
} catch {
  // Ignore local-storage failures; the licenses page will fall back to its built-in catalog.
}

export {};
