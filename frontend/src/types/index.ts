export interface Author {
  name: string;
  affiliation?: string;
}

export interface HighlightAnchor {
  start: { page: number; offset: number; x?: number; y?: number };
  end: { page: number; offset: number; x?: number; y?: number };
}

export interface Highlight {
  id: string;
  page: number;
  color: string;
  text: string;
  anchor: HighlightAnchor;
  comment?: string;
  created_at: string;
}

export interface PaperMetadata {
  id: string;
  doi?: string;
  title: string;
  authors: Author[];
  abstract?: string;
  journal?: string;
  year?: number;
  url?: string;
  date_added: string;
  date_modified: string;
  tags: string[];
}

export interface Paper extends PaperMetadata {
  highlights: Highlight[];
}

export interface SearchMatch {
  field: string;
  snippet: string;
  page?: number;
}

export interface SearchResult {
  paper_id: string;
  title: string;
  score: number;
  matches: SearchMatch[];
}

export interface Config {
  scihub_domain: string;
  library_path: string;
  highlight_colors: string[];
  default_highlight_color: string;
  remember_last_color: boolean;
  tag_colors: { [tagName: string]: string };  // Maps tag names to color hex codes
}

export interface Tab {
  id: string;
  type: 'paper' | 'search' | 'settings';
  title: string;
  paperId?: string;
}
