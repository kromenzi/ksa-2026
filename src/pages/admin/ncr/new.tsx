import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '@/lib/data-context';

export default function NewNCR() {
  const data = useData();
  const departments = data?.departments ?? [];
  const addDepartment = data?.addDepartment;
  const [department, setDepartment] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newDepartment, setNewDepartment] = useState('');
  const [preview, setPreview] = useState(false);

  const options = useMemo(() => departments.filter((d: any) => d?.id && d?.name), [departments]);

  const createDepartment = async () => {
    const name = newDepartment.trim();
    if (!name || !addDepartment) return;
    const created = await addDepartment({ name });
    if (created?.id) setDepartment(created.id);
    setNewDepartment('');
    setShowAdd(false);
  };

  return (
    <main dir="auto" className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New NCR / إنشاء NCR جديد</h1>
        <button type="button" onClick={() => setPreview(v => !v)} className="rounded-md border px-4 py-2">
          {preview ? 'Edit / تعديل' : 'Preview / معاينة'}
        </button>
      </header>

      {preview ? (
        <section dir="auto" className="rounded-lg border p-6">
          <h2 className="mb-4 text-xl font-semibold">NCR Preview / معاينة NCR</h2>
          <p><strong>Department / القسم:</strong> {options.find((d: any) => d.id === department)?.name || '—'}</p>
        </section>
      ) : (
        <section className="rounded-lg border p-6">
          <label htmlFor="ncr-department" className="mb-2 block font-medium">Department / القسم</label>
          <select id="ncr-department" value={department} onChange={e => setDepartment(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2">
            <option value="">Select Department / اختر القسم</option>
            {options.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button type="button" onClick={() => setShowAdd(v => !v)} className="mt-2 text-sm underline">
            + Add New Department / إضافة قسم جديد
          </button>
          {showAdd && (
            <div className="mt-3 flex gap-2">
              <input value={newDepartment} onChange={e => setNewDepartment(e.target.value)} placeholder="Department name / اسم القسم" className="flex-1 rounded-md border px-3 py-2" />
              <button type="button" onClick={createDepartment} className="rounded-md border px-4 py-2">Add / إضافة</button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
