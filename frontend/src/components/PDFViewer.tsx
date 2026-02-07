import React, { useEffect, useRef, useState } from 'react';
import { Paper } from '../types';
import { api } from '../services/api';
import { useAppStore } from '../stores/appStore';

// Type definitions for PDF.js loaded from CDN
interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNum: number): Promise<PDFPageProxy>;
  destroy(): void;
}

interface PDFPageProxy {
  getViewport(params: { scale: number }): any;
  render(params: any): { promise: Promise<void> };
  getTextContent(): Promise<any>;
}

interface PDFViewerProps {
  paper: Paper;
}

// Load PDF.js from CDN
const loadPDFJS = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;

    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        console.log('PDF.js loaded from CDN, version:', pdfjsLib.version);
        resolve(pdfjsLib);
      } else {
        reject(new Error('PDF.js library not found on window'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load PDF.js from CDN'));
    };

    document.head.appendChild(script);
  });
};

interface HighlightPopoverState {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  pageNumber: number;
  rects: DOMRect[];
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ paper }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popover, setPopover] = useState<HighlightPopoverState>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: '',
    pageNumber: 0,
    rects: []
  });
  const [comment, setComment] = useState('');
  const { config, lastUsedHighlightColor, setLastUsedHighlightColor, setCurrentPaper } = useAppStore();
  const [selectedColor, setSelectedColor] = useState(lastUsedHighlightColor || 'yellow');

  useEffect(() => {
    loadPDF();
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, [paper.id]);

  useEffect(() => {
    // Render highlights when paper changes
    if (pdfDoc && paper.highlights) {
      renderHighlights();
    }
  }, [paper.highlights, pdfDoc]);

  useEffect(() => {
    // Add mouseup listener for text selection
    const handleMouseUp = () => {
      handleTextSelection();
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      setPopover({ ...popover, visible: false });
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length < 3) {
      setPopover({ ...popover, visible: false });
      return;
    }

    // Check if selection is within PDF text layer
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const textLayer = (container.nodeType === Node.ELEMENT_NODE
      ? container as Element
      : container.parentElement)?.closest('.pdf-text-layer');

    if (!textLayer) {
      setPopover({ ...popover, visible: false });
      return;
    }

    // Get page number
    const pageContainer = textLayer.closest('.pdf-page');
    const pageNumber = pageContainer ? parseInt(pageContainer.getAttribute('data-page-number') || '0') : 0;

    if (!pageNumber) return;

    // Get selection rectangles
    const rects = Array.from(range.getClientRects());
    if (rects.length === 0) return;

    // Position popover below the selection
    const lastRect = rects[rects.length - 1];
    const scrollTop = containerRef.current?.scrollTop || 0;
    const scrollLeft = containerRef.current?.scrollLeft || 0;

    setPopover({
      visible: true,
      x: lastRect.right + scrollLeft,
      y: lastRect.bottom + scrollTop + 5,
      selectedText,
      pageNumber,
      rects: rects as DOMRect[]
    });
  };

  const createHighlight = async () => {
    if (!popover.visible || !popover.selectedText) return;

    try {
      // Calculate anchor positions (simplified - using character offsets)
      const highlight = {
        page: popover.pageNumber,
        color: selectedColor,
        text: popover.selectedText,
        anchor: {
          start: { page: popover.pageNumber, offset: 0 },
          end: { page: popover.pageNumber, offset: popover.selectedText.length }
        },
        comment: comment || undefined
      };

      await api.createHighlight(paper.id, highlight);

      // Refresh paper to get updated highlights
      const updatedPaper = await api.getPaper(paper.id);
      setCurrentPaper(updatedPaper);

      // Remember color if config says so
      if (config?.remember_last_color) {
        setLastUsedHighlightColor(selectedColor);
      }

      // Clear selection and popover
      window.getSelection()?.removeAllRanges();
      setPopover({ ...popover, visible: false });
      setComment('');
    } catch (err) {
      console.error('Error creating highlight:', err);
      alert('Failed to create highlight');
    }
  };

  const renderHighlights = () => {
    if (!containerRef.current) return;

    // Clear existing highlights
    const highlightLayers = containerRef.current.querySelectorAll('.highlight-layer');
    highlightLayers.forEach(layer => {
      layer.innerHTML = '';
    });

    // Render each highlight
    paper.highlights?.forEach(highlight => {
      const highlightLayer = containerRef.current?.querySelector(
        `.highlight-layer[data-page="${highlight.page}"]`
      ) as HTMLElement;

      if (!highlightLayer) return;

      // Create highlight element (simplified - using full page width for now)
      const highlightEl = document.createElement('div');
      highlightEl.className = `highlight ${highlight.color}`;
      highlightEl.style.left = '0';
      highlightEl.style.top = '0';
      highlightEl.style.width = '100%';
      highlightEl.style.height = '20px';
      highlightEl.title = highlight.text;
      highlightEl.setAttribute('data-highlight-id', highlight.id);

      // Add click handler to show highlight details
      highlightEl.addEventListener('click', () => {
        // Could open a dialog to edit/delete highlight
        console.log('Highlight clicked:', highlight);
      });

      highlightLayer.appendChild(highlightEl);
    });
  };

  const loadPDF = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load PDF.js from CDN
      const pdfjsLib = await loadPDFJS();

      const pdfUrl = api.getPDFUrl(paper.id);
      console.log('Loading PDF from:', pdfUrl);

      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;

      console.log(`PDF loaded successfully: ${pdf.numPages} pages`);
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      setLoading(false);

      // Render all pages
      await renderAllPages(pdf);
      console.log('PDF rendering complete');
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError(`Failed to load PDF: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  const renderAllPages = async (pdf: PDFDocumentProxy) => {
    if (!containerRef.current) return;

    // Clear container
    containerRef.current.innerHTML = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        // Create page container
        const pageContainer = document.createElement('div');
        pageContainer.className = 'pdf-page';
        pageContainer.style.width = `${viewport.width}px`;
        pageContainer.style.height = `${viewport.height}px`;
        pageContainer.style.background = '#ffffff';
        pageContainer.setAttribute('data-page-number', pageNum.toString());

        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false });

        if (!context) {
          console.error(`Failed to get canvas context for page ${pageNum}`);
          continue;
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.display = 'block';

        // Set white background for canvas
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        pageContainer.appendChild(canvas);

        // Render PDF page with error handling
        try {
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;
        } catch (renderError) {
          console.error(`Error rendering page ${pageNum}:`, renderError);
          // Show error message on canvas
          context.fillStyle = '#000000';
          context.font = '16px sans-serif';
          context.fillText(`Error rendering page ${pageNum}`, 20, 50);
          context.fillText(String(renderError), 20, 80);
        }

        // Add text layer
        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'pdf-text-layer';
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;

        try {
          const textContent = await page.getTextContent();

          // Simple text layer rendering
          textContent.items.forEach((item: any) => {
            if (!item.str) return;

            const span = document.createElement('span');
            span.textContent = item.str;

            if (item.transform) {
              const tx = item.transform[4];
              const ty = item.transform[5];
              const fontSize = Math.sqrt(item.transform[0] * item.transform[0] + item.transform[1] * item.transform[1]);

              span.style.left = `${tx}px`;
              span.style.top = `${viewport.height - ty}px`;
              span.style.fontSize = `${fontSize}px`;
              span.style.fontFamily = item.fontName || 'sans-serif';
            }

            textLayerDiv.appendChild(span);
          });
        } catch (textError) {
          console.warn(`Error rendering text layer for page ${pageNum}:`, textError);
        }

        pageContainer.appendChild(textLayerDiv);

        // Add highlight layer
        const highlightLayer = document.createElement('div');
        highlightLayer.className = 'highlight-layer';
        highlightLayer.setAttribute('data-page', pageNum.toString());
        pageContainer.appendChild(highlightLayer);

        containerRef.current?.appendChild(pageContainer);
      } catch (pageError) {
        console.error(`Error loading page ${pageNum}:`, pageError);
        // Continue to next page
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading PDF...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="pdf-container">
      <div className="pdf-canvas-wrapper" ref={containerRef} />

      {popover.visible && (
        <div
          className="highlight-popover"
          style={{
            left: `${popover.x}px`,
            top: `${popover.y}px`
          }}
        >
          <div className="color-picker">
            {(config?.highlight_colors || ['#ffeb3b', '#4caf50', '#f44336', '#2196f3']).map(color => (
              <div
                key={color}
                className={`color-btn ${selectedColor === color ? 'selected' : ''}`}
                style={{ background: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>

          <input
            type="text"
            className="comment-input"
            placeholder="Add a comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                createHighlight();
              } else if (e.key === 'Escape') {
                setPopover({ ...popover, visible: false });
                setComment('');
              }
            }}
          />

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn" onClick={createHighlight}>
              Highlight
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setPopover({ ...popover, visible: false });
                setComment('');
                window.getSelection()?.removeAllRanges();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
