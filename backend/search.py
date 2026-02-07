"""In-memory search index for papers."""
import re
from collections import defaultdict
from typing import List, Dict, Set
from models import Paper, SearchResult, SearchMatch
from storage import list_papers, load_paper


# Common English stopwords
STOPWORDS = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'this', 'but', 'they', 'have', 'had',
    'what', 'when', 'where', 'who', 'which', 'why', 'how'
}


class SearchIndex:
    def __init__(self):
        self.papers: Dict[str, Paper] = {}
        self.index: Dict[str, List[tuple]] = defaultdict(list)

    def tokenize(self, text: str) -> List[str]:
        """Tokenize text into searchable words."""
        if not text:
            return []
        # Lowercase, split on non-alphanumeric, remove stopwords
        words = re.findall(r'\w+', text.lower())
        return [word for word in words if word not in STOPWORDS and len(word) > 1]

    def add_paper(self, paper: Paper):
        """Add a paper to the search index."""
        self.papers[paper.id] = paper

        # Index title (weight: 10)
        for token in self.tokenize(paper.title):
            self.index[token].append((paper.id, 'title', 10))

        # Index tags (weight: 8)
        for tag in paper.tags:
            for token in self.tokenize(tag):
                self.index[token].append((paper.id, 'tag', 8))

        # Index highlights (weight: 6)
        for hl in paper.highlights:
            highlight_text = hl.text + ' ' + (hl.comment or '')
            for token in self.tokenize(highlight_text):
                self.index[token].append((paper.id, 'highlight', 6, hl.page, hl.text))

        # Index abstract (weight: 4)
        if paper.abstract:
            for token in self.tokenize(paper.abstract):
                self.index[token].append((paper.id, 'abstract', 4))

        # Index authors (weight: 7)
        for author in paper.authors:
            for token in self.tokenize(author.name):
                self.index[token].append((paper.id, 'author', 7))

    def rebuild(self):
        """Rebuild the entire search index."""
        self.index.clear()
        self.papers.clear()

        # Load all papers
        for paper_metadata in list_papers():
            paper = load_paper(paper_metadata.id)
            if paper:
                self.add_paper(paper)

    def search(self, query: str, limit: int = 50) -> List[SearchResult]:
        """Search for papers matching the query."""
        tokens = self.tokenize(query)
        if not tokens:
            return []

        # Calculate scores
        scores: Dict[str, float] = defaultdict(float)
        matches_by_paper: Dict[str, List[Dict]] = defaultdict(list)

        for token in tokens:
            for entry in self.index.get(token, []):
                paper_id = entry[0]
                field = entry[1]
                weight = entry[2]
                scores[paper_id] += weight

                # Store match info
                match_info = {'field': field, 'token': token}
                if field == 'highlight' and len(entry) > 3:
                    match_info['page'] = entry[3]
                    match_info['text'] = entry[4]

                matches_by_paper[paper_id].append(match_info)

        # Sort by score
        sorted_papers = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:limit]

        # Build results
        results = []
        for paper_id, score in sorted_papers:
            paper = self.papers.get(paper_id)
            if not paper:
                continue

            # Generate match snippets
            matches = []
            seen_fields = set()

            for match_info in matches_by_paper[paper_id]:
                field = match_info['field']
                if field in seen_fields and field != 'highlight':
                    continue

                snippet = self._generate_snippet(paper, match_info, query)
                if snippet:
                    match = SearchMatch(
                        field=field,
                        snippet=snippet,
                        page=match_info.get('page')
                    )
                    matches.append(match)
                    if field != 'highlight':
                        seen_fields.add(field)

            results.append(SearchResult(
                paper_id=paper.id,
                title=paper.title,
                score=score,
                matches=matches
            ))

        return results

    def _generate_snippet(self, paper: Paper, match_info: Dict, query: str) -> str:
        """Generate a highlighted snippet for a match."""
        field = match_info['field']
        token = match_info['token']

        if field == 'title':
            return self._highlight_text(paper.title, query)
        elif field == 'tag':
            # Find matching tag
            for tag in paper.tags:
                if token in tag.lower():
                    return self._highlight_text(tag, query)
        elif field == 'highlight':
            text = match_info.get('text', '')
            return self._highlight_text(text[:200], query)
        elif field == 'abstract':
            # Find context around match
            abstract = paper.abstract or ''
            snippet = self._extract_context(abstract, token)
            return self._highlight_text(snippet, query)
        elif field == 'author':
            for author in paper.authors:
                if token in author.name.lower():
                    return self._highlight_text(author.name, query)

        return ''

    def _extract_context(self, text: str, token: str, context_chars: int = 100) -> str:
        """Extract context around a token in text."""
        text_lower = text.lower()
        pos = text_lower.find(token)
        if pos == -1:
            return text[:context_chars]

        start = max(0, pos - context_chars // 2)
        end = min(len(text), pos + len(token) + context_chars // 2)

        snippet = text[start:end]
        if start > 0:
            snippet = '...' + snippet
        if end < len(text):
            snippet = snippet + '...'

        return snippet

    def _highlight_text(self, text: str, query: str) -> str:
        """Add <mark> tags around matching words."""
        tokens = self.tokenize(query)
        result = text

        for token in tokens:
            # Case-insensitive replacement with <mark> tags
            pattern = re.compile(re.escape(token), re.IGNORECASE)
            result = pattern.sub(lambda m: f'<mark>{m.group()}</mark>', result)

        return result


# Global search index instance
search_index = SearchIndex()


def initialize_search_index():
    """Initialize the search index on startup."""
    search_index.rebuild()


def refresh_search_index():
    """Refresh the search index."""
    search_index.rebuild()


def add_paper_to_index(paper: Paper):
    """Add or update a paper in the search index."""
    search_index.add_paper(paper)


def search_papers(query: str, limit: int = 50) -> List[SearchResult]:
    """Search for papers."""
    return search_index.search(query, limit)
