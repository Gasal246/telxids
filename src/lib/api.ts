import { clearAuthToken, getAuthToken } from "@/lib/auth";

export type Category = {
  id: string;
  category_name: string;
  types: string[];
  created_at: string;
};

export type Chipset = {
  id: string;
  chipset_name: string;
  created_at: string;
};

export type Model = {
  id: string;
  category_name: string;
  type: string;
  chipset_name: string;
  model_number: string;
  prefix: string;
  telx_model_number: string | null;
  description: string | null;
  macs_per_serial: number;
  qty: number;
  last_serial: string | null;
  generated_count: number;
  allocated_count: number;
  created_at: string;
};

export type SerialEntry = {
  serialNumber: string;
  macIds: string[];
  allocated?: boolean;
};

export type GenerateGroup = {
  id: string;
  model_number: string;
  telx_model_number: string | null;
  category_name: string;
  region_id: string;
  suffix: string;
  generated_at: string;
  serials: SerialEntry[];
};

export type SearchResult = {
  models: Model[];
  groups: GenerateGroup[];
};

export type GenerateRequest = {
  model_number: string;
  count: number;
  regionId: string;
  prefix: string;
};

export type GenerateResponse = {
  success: boolean;
  group: GenerateGroup;
  lastSerial: string;
  lastMacHex: string;
};

export type AllocateResponse = {
  success: boolean;
  message: string;
  model_number: string;
  allocated_count: number;
};

export type AuthUser = {
  id: string;
  username: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function apiUrl(path: string): string {
  if (!API_BASE_URL) return path;
  return new URL(path, API_BASE_URL).toString();
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(apiUrl(path), { ...init, headers });
  if (res.status === 401) {
    clearAuthToken();
    if (typeof window !== "undefined" && window.location.pathname !== "/sign-in") {
      window.location.assign("/sign-in");
    }
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string; message?: string };
      message = data?.error || data?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const api = {
  // Auth
  login: (input: { username: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", jsonInit("POST", input)),

  // Categories
  getCategories: () => request<Category[]>("/api/categories"),
  getCategoryByName: (categoryName: string) =>
    request<Category>(`/api/categories/by-name/${encodeURIComponent(categoryName)}`),
  createCategory: (input: Pick<Category, "category_name" | "types">) =>
    request<Category>("/api/categories", jsonInit("POST", input)),
  updateCategory: (
    id: string,
    input: Pick<Category, "category_name" | "types"> & { original_category_name?: string },
  ) =>
    request<Category>(`/api/categories/${encodeURIComponent(id)}`, jsonInit("PUT", input)),
  deleteCategory: (id: string) =>
    request<{ success: boolean }>(`/api/categories/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // Chipsets
  getChipsets: () => request<Chipset[]>("/api/chipsets"),
  createChipset: (input: Pick<Chipset, "chipset_name">) =>
    request<Chipset>("/api/chipsets", jsonInit("POST", input)),
  updateChipset: (id: string, input: Pick<Chipset, "chipset_name">) =>
    request<Chipset>(`/api/chipsets/${encodeURIComponent(id)}`, jsonInit("PUT", input)),
  deleteChipset: (id: string) =>
    request<{ success: boolean }>(`/api/chipsets/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // Models
  getModels: (filters?: { category?: string; chipset?: string }) => {
    const url = new URL("/api/models", "http://local");
    if (filters?.category) url.searchParams.set("category", filters.category);
    if (filters?.chipset) url.searchParams.set("chipset", filters.chipset);
    return request<Model[]>(url.pathname + url.search);
  },
  getModel: (modelNumber: string) => request<Model>(`/api/models/${encodeURIComponent(modelNumber)}`),
  createModel: (input: Pick<Model, "category_name" | "type" | "chipset_name" | "model_number" | "prefix" | "telx_model_number" | "description" | "macs_per_serial"> & Partial<Pick<Model, "qty">>) =>
    request<Model>("/api/models", jsonInit("POST", input)),
  updateModel: (modelNumber: string, input: Pick<Model, "category_name" | "type" | "chipset_name" | "prefix" | "telx_model_number" | "description" | "macs_per_serial"> & Partial<Pick<Model, "qty">>) =>
    request<Model>(`/api/models/${encodeURIComponent(modelNumber)}`, jsonInit("PUT", input)),
  deleteModel: (modelNumber: string) =>
    request<{ success: boolean }>(`/api/models/${encodeURIComponent(modelNumber)}`, { method: "DELETE" }),

  // Generate groups
  getGenerateGroups: (modelNumber: string) =>
    request<GenerateGroup[]>(`/api/generate-groups?model_number=${encodeURIComponent(modelNumber)}`),
  generate: (input: GenerateRequest) => request<GenerateResponse>("/api/generate", jsonInit("POST", input)),
  allocate: (groupIds: string[]) => request<AllocateResponse>("/api/allocate", jsonInit("POST", { groupIds })),

  // Search
  search: (term: string) =>
    request<SearchResult>(`/api/search?term=${encodeURIComponent(term)}`),
};
