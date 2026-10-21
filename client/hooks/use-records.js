"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export function useRecords(resource, params = {}, enabled = true) {
  const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value));
  return useQuery({ queryKey: [resource, params], queryFn: () => apiRequest(`/${resource}${search.size ? `?${search}` : ""}`), enabled });
}

export function useRecord(resource, id) {
  return useQuery({ queryKey: [resource, id], queryFn: () => apiRequest(`/${resource}/${encodeURIComponent(id)}`), enabled: Boolean(id) });
}
