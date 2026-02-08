import { Paper, PaperMetadata, SearchResult, Config, Highlight } from '../types';

const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  // Papers
  async getPapers(): Promise<PaperMetadata[]> {
    const response = await fetch(`${API_BASE}/papers`);
    return handleResponse(response);
  },

  async getPaper(id: string): Promise<Paper> {
    const response = await fetch(`${API_BASE}/papers/${id}`);
    return handleResponse(response);
  },

  async importPaper(input: string): Promise<any> {
    const response = await fetch(`${API_BASE}/papers/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });
    return handleResponse(response);
  },

  async updatePaper(id: string, data: Partial<Paper>): Promise<any> {
    const response = await fetch(`${API_BASE}/papers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updateTags(id: string, tags: string[]): Promise<any> {
    const response = await fetch(`${API_BASE}/papers/${id}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
    return handleResponse(response);
  },

  async bulkTag(paperIds: string[], addTags: string[], removeTags: string[]): Promise<any> {
    const response = await fetch(`${API_BASE}/papers/bulk-tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paper_ids: paperIds, add_tags: addTags, remove_tags: removeTags }),
    });
    return handleResponse(response);
  },

  async deletePaper(id: string): Promise<any> {
    const response = await fetch(`${API_BASE}/papers/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  getPDFUrl(id: string): string {
    return `${API_BASE}/papers/${id}/pdf`;
  },

  // Highlights
  async createHighlight(paperId: string, highlight: Omit<Highlight, 'id' | 'created_at'>): Promise<any> {
    const response = await fetch(`${API_BASE}/papers/${paperId}/highlights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(highlight),
    });
    return handleResponse(response);
  },

  async updateHighlight(paperId: string, highlightId: string, data: {
    comment?: string;
    color?: string;
    text?: string;
    anchor?: { start: { page: number; offset: number; x?: number; y?: number }; end: { page: number; offset: number; x?: number; y?: number } };
  }): Promise<any> {
    const response = await fetch(`${API_BASE}/papers/${paperId}/highlights/${highlightId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deleteHighlight(paperId: string, highlightId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/papers/${paperId}/highlights/${highlightId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  // Search
  async search(query: string): Promise<{ query: string; results: SearchResult[]; total: number }> {
    const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    return handleResponse(response);
  },

  // Config
  async getConfig(): Promise<Config> {
    const response = await fetch(`${API_BASE}/config`);
    return handleResponse(response);
  },

  async updateConfig(config: Config): Promise<any> {
    const response = await fetch(`${API_BASE}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return handleResponse(response);
  },
};
