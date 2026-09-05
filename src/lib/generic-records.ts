import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

export interface GenericRecord<T = Record<string, any>> {
  id: string;
  refNo: string | null;
  title: string | null;
  status: string | null;
  department: string | null;
  date: string | null;
  data: T;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export function canDeleteManagedRecord(role?: string | null) {
  return role === "admin" || role === "manager";
}

export function useGenericRecords<T = Record<string, any>>(resource: string) {
  const [items, setItems] = useState<GenericRecord<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest("GET", `/api/${resource}`);
      const payload = await response.json();
      setItems(Array.isArray(payload) ? payload : []);
    } catch (err: any) {
      setItems([]);
      setError(err?.message || "Unable to load records");
    } finally {
      setLoading(false);
    }
  }, [resource]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (input: Partial<GenericRecord<T>>) => {
    const response = await apiRequest("POST", `/api/${resource}`, input);
    const row = await response.json();
    setItems(prev => [row, ...prev]);
    return row as GenericRecord<T>;
  }, [resource]);

  const update = useCallback(async (id: string, input: Partial<GenericRecord<T>>) => {
    const response = await apiRequest("PATCH", `/api/${resource}/${id}`, input);
    const row = await response.json();
    setItems(prev => prev.map(item => item.id === id ? row : item));
    return row as GenericRecord<T>;
  }, [resource]);

  const remove = useCallback(async (id: string) => {
    await apiRequest("DELETE", `/api/${resource}/${id}`);
    setItems(prev => prev.filter(item => item.id !== id));
  }, [resource]);

  return { items, loading, error, refresh, create, update, remove };
}
