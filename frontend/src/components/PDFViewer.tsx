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

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  pageNumber: number;
  pageX: number;
  pageY: number;
}

interface PinFormState {
  visible: boolean;
  x: number;
  y: number;
  color: string;
  text: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ paper }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    pageNumber: 0,
    pageX: 0,
    pageY: 0
  });
  const [pinForm, setPinForm] = useState<PinFormState>({
    visible: false,
    x: 0,
    y: 0,
    color: 'yellow',
    text: ''
  });
  const [expandedPinId, setExpandedPinId] = useState<string | null>(null);
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [editingPinText, setEditingPinText] = useState('');
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const { config, lastUsedHighlightColor, setLastUsedHighlightColor, setCurrentPaper } = useAppStore();

  useEffect(() => {
    loadPDF();
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, [paper.id]);

  useEffect(() => {
    // Render pins when paper changes or on initial load
    if (pdfDoc) {
      renderPins();
    }
  }, [paper.highlights, pdfDoc]);

  useEffect(() => {
    // Add right-click listener for context menu
    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Check if right-click is within a PDF page
      const pageContainer = target.closest('.pdf-page');
      if (!pageContainer) return;

      event.preventDefault();

      const pageNumber = parseInt(pageContainer.getAttribute('data-page-number') || '0');
      if (!pageNumber) return;

      const pageRect = pageContainer.getBoundingClientRect();
      const pageX = event.clientX - pageRect.left;
      const pageY = event.clientY - pageRect.top;

      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        pageNumber,
        pageX,
        pageY
      });
    };

    // Close context menu and pin form on click outside
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.context-menu') && !target.closest('.pin-form')) {
        setContextMenu({ ...contextMenu, visible: false });
        setPinForm({ ...pinForm, visible: false });
      }
    };

    // Handle pin dragging
    const handleMouseMove = (event: MouseEvent) => {
      // Check if any pin is ready to drag (hasn't started dragging yet)
      const readyPins = document.querySelectorAll('[data-drag-ready="true"]');

      readyPins.forEach((pinEl) => {
        const startX = parseFloat(pinEl.getAttribute('data-drag-start-x') || '0');
        const startY = parseFloat(pinEl.getAttribute('data-drag-start-y') || '0');
        const dragDist = Math.hypot(event.clientX - startX, event.clientY - startY);

        // If moved more than 5 pixels, start dragging
        if (dragDist > 5) {
          const pinId = pinEl.getAttribute('data-pin-id');
          if (pinId) {
            pinEl.setAttribute('data-drag-ready', 'false');
            pinEl.setAttribute('data-was-drag', 'true');
            setDraggingPinId(pinId);
            setExpandedPinId(null);
          }
        }
      });

      // Handle active drag
      if (!draggingPinId) return;

      const target = event.target as HTMLElement;
      const pageContainer = target.closest('.pdf-page') || document.elementFromPoint(event.clientX, event.clientY)?.closest('.pdf-page');
      if (!pageContainer) return;

      const pageRect = pageContainer.getBoundingClientRect();
      // Calculate the new position: mouse position minus offset, plus half pin size (14px) to center
      const newX = event.clientX - pageRect.left - dragOffset.x + 14;
      const newY = event.clientY - pageRect.top - dragOffset.y + 14;

      // Update pin position visually (optimistic update)
      const pinEl = pageContainer.querySelector(`[data-pin-id="${draggingPinId}"]`) as HTMLElement;
      if (pinEl) {
        pinEl.style.left = `${newX}px`;
        pinEl.style.top = `${newY}px`;
      }
    };

    const handleMouseUp = async (event: MouseEvent) => {
      // Clear drag-ready state for all pins
      const readyPins = document.querySelectorAll('[data-drag-ready="true"]');
      readyPins.forEach((pinEl) => {
        pinEl.setAttribute('data-drag-ready', 'false');
      });

      if (!draggingPinId) return;

      const target = event.target as HTMLElement;
      const pageContainer = target.closest('.pdf-page') || document.elementFromPoint(event.clientX, event.clientY)?.closest('.pdf-page');
      if (!pageContainer) {
        setDraggingPinId(null);
        return;
      }

      const pageNumber = parseInt(pageContainer.getAttribute('data-page-number') || '0');
      if (!pageNumber) {
        setDraggingPinId(null);
        return;
      }

      const pageRect = pageContainer.getBoundingClientRect();
      // Calculate the new position: mouse position minus offset, plus half pin size (14px) to center
      const newX = event.clientX - pageRect.left - dragOffset.x + 14;
      const newY = event.clientY - pageRect.top - dragOffset.y + 14;

      await handlePinDrop(draggingPinId, pageNumber, newX, newY);
      setDraggingPinId(null);
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [contextMenu, pinForm, draggingPinId, dragOffset]);

  const handleAddPin = () => {
    const color = lastUsedHighlightColor || 'yellow';
    setPinForm({
      visible: true,
      x: contextMenu.x,
      y: contextMenu.y,
      color,
      text: ''
    });
    setContextMenu({ ...contextMenu, visible: false });
  };

  const createPin = async () => {
    if (!pinForm.text.trim()) {
      alert('Please enter text for the pin');
      return;
    }

    try {
      const pin = {
        page: contextMenu.pageNumber,
        color: pinForm.color,
        text: pinForm.text,
        anchor: {
          start: { page: contextMenu.pageNumber, offset: 0, x: contextMenu.pageX, y: contextMenu.pageY },
          end: { page: contextMenu.pageNumber, offset: 0, x: contextMenu.pageX, y: contextMenu.pageY }
        }
      };

      await api.createHighlight(paper.id, pin);

      // Refresh paper to get updated pins
      if ((window as any).refreshPaper) {
        await (window as any).refreshPaper(paper.id);
      } else {
        const updatedPaper = await api.getPaper(paper.id);
        setCurrentPaper(updatedPaper);
      }

      // Remember color if config says so
      if (config?.remember_last_color) {
        setLastUsedHighlightColor(pinForm.color);
      }

      setPinForm({ ...pinForm, visible: false, text: '' });
    } catch (err) {
      console.error('Error creating pin:', err);
      alert(`Failed to create pin: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleEditPin = async (pinId: string) => {
    if (!editingPinText.trim()) {
      alert('Please enter text for the pin');
      return;
    }

    try {
      await api.updateHighlight(paper.id, pinId, { text: editingPinText });

      // Refresh paper
      if ((window as any).refreshPaper) {
        await (window as any).refreshPaper(paper.id);
      } else {
        const updatedPaper = await api.getPaper(paper.id);
        setCurrentPaper(updatedPaper);
      }

      setEditingPinId(null);
      setEditingPinText('');
    } catch (err) {
      console.error('Error updating pin:', err);
      alert('Failed to update pin');
    }
  };

  const handleDeletePin = async (pinId: string) => {
    if (!confirm('Delete this pin?')) return;

    try {
      await api.deleteHighlight(paper.id, pinId);

      // Refresh paper
      if ((window as any).refreshPaper) {
        await (window as any).refreshPaper(paper.id);
      } else {
        const updatedPaper = await api.getPaper(paper.id);
        setCurrentPaper(updatedPaper);
      }

      setExpandedPinId(null);
    } catch (err) {
      console.error('Error deleting pin:', err);
      alert('Failed to delete pin');
    }
  };

  const handlePinDrop = async (pinId: string, pageNumber: number, x: number, y: number) => {
    try {
      // Update pin position
      await api.updateHighlight(paper.id, pinId, {
        anchor: {
          start: { page: pageNumber, offset: 0, x, y },
          end: { page: pageNumber, offset: 0, x, y }
        }
      });

      // Refresh paper
      if ((window as any).refreshPaper) {
        await (window as any).refreshPaper(paper.id);
      } else {
        const updatedPaper = await api.getPaper(paper.id);
        setCurrentPaper(updatedPaper);
      }
    } catch (err) {
      console.error('Error moving pin:', err);
    }
  };

  const renderPins = () => {
    if (!containerRef.current) {
      console.log('renderPins: containerRef not available');
      return;
    }

    const startTime = performance.now();

    // Clear existing pins
    const pinLayers = containerRef.current.querySelectorAll('.pin-layer');
    if (pinLayers.length === 0) {
      console.log('renderPins: no pin layers found yet');
      return;
    }

    pinLayers.forEach(layer => {
      layer.innerHTML = '';
    });

    // Render each pin
    paper.highlights?.forEach((highlight, index) => {
      const pinLayer = containerRef.current?.querySelector(
        `.pin-layer[data-page="${highlight.page}"]`
      ) as HTMLElement;

      if (!pinLayer) {
        console.log(`renderPins: pin layer not found for page ${highlight.page}`);
        return;
      }

      const x = highlight.anchor?.start?.x || 0;
      const y = highlight.anchor?.start?.y || 0;

      // Create pin element (colored circle with number)
      const pinEl = document.createElement('div');
      pinEl.className = `pin ${highlight.color}`;
      pinEl.style.left = `${x}px`;
      pinEl.style.top = `${y}px`;
      pinEl.setAttribute('data-pin-id', highlight.id);

      const pinNumber = document.createElement('span');
      pinNumber.className = 'pin-number';
      pinNumber.textContent = (index + 1).toString();
      pinEl.appendChild(pinNumber);

      // Store drag state in data attributes to avoid closure issues
      pinEl.setAttribute('data-drag-ready', 'false');

      // Add click handler to expand/collapse
      pinEl.addEventListener('click', (e) => {
        e.stopPropagation();

        // Check if this was a drag - if so, ignore click
        const wasDrag = pinEl.getAttribute('data-was-drag') === 'true';
        pinEl.setAttribute('data-was-drag', 'false');

        if (wasDrag) {
          return;
        }

        // Toggle expanded state
        if (expandedPinId === highlight.id) {
          setExpandedPinId(null);
        } else {
          setExpandedPinId(highlight.id);
        }
      });

      // Add drag handlers for moving pins
      pinEl.addEventListener('mousedown', (e) => {
        // Only left mouse button
        if (e.button !== 0) return;

        e.stopPropagation();

        // Mark as ready to drag
        pinEl.setAttribute('data-drag-ready', 'true');
        pinEl.setAttribute('data-was-drag', 'false');
        pinEl.setAttribute('data-drag-start-x', e.clientX.toString());
        pinEl.setAttribute('data-drag-start-y', e.clientY.toString());

        // Get the pin's current position
        const pinRect = pinEl.getBoundingClientRect();

        // Calculate offset from mouse to pin's visual center
        const pinCenterX = pinRect.left + pinRect.width / 2;
        const pinCenterY = pinRect.top + pinRect.height / 2;

        setDragOffset({
          x: e.clientX - pinCenterX,
          y: e.clientY - pinCenterY
        });
      });

      // Make pin draggable
      pinEl.style.cursor = 'move';

      pinLayer.appendChild(pinEl);

      console.log(`Rendered pin ${index + 1} on page ${highlight.page} at (${x}, ${y})`);

      // If this pin is expanded, show sticky note
      if (expandedPinId === highlight.id) {
        const stickyNote = document.createElement('div');
        stickyNote.className = 'sticky-note';
        stickyNote.style.left = `${x + 30}px`;
        stickyNote.style.top = `${y}px`;

        // Check if this pin is being edited
        if (editingPinId === highlight.id) {
          // Show edit form
          const editForm = document.createElement('div');

          const textArea = document.createElement('textarea');
          textArea.className = 'pin-text-input';
          textArea.value = editingPinText;
          textArea.rows = 4;

          // Store text updates locally without triggering re-render
          textArea.addEventListener('input', (e) => {
            const newValue = (e.target as HTMLTextAreaElement).value;
            setEditingPinText(newValue);
          });

          textArea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              setEditingPinId(null);
              setEditingPinText('');
            }
          });

          editForm.appendChild(textArea);

          // Auto-focus the textarea after a small delay to ensure it's in the DOM
          setTimeout(() => textArea.focus(), 0);

          const buttonContainer = document.createElement('div');
          buttonContainer.style.display = 'flex';
          buttonContainer.style.gap = '0.5rem';
          buttonContainer.style.marginTop = '0.5rem';

          const saveButton = document.createElement('button');
          saveButton.className = 'btn';
          saveButton.textContent = 'Save';
          saveButton.style.fontSize = '12px';
          saveButton.style.padding = '0.25rem 0.5rem';
          saveButton.addEventListener('click', (e) => {
            e.stopPropagation();
            handleEditPin(highlight.id);
          });
          buttonContainer.appendChild(saveButton);

          const cancelButton = document.createElement('button');
          cancelButton.className = 'btn btn-secondary';
          cancelButton.textContent = 'Cancel';
          cancelButton.style.fontSize = '12px';
          cancelButton.style.padding = '0.25rem 0.5rem';
          cancelButton.addEventListener('click', (e) => {
            e.stopPropagation();
            setEditingPinId(null);
            setEditingPinText('');
          });
          buttonContainer.appendChild(cancelButton);

          editForm.appendChild(buttonContainer);
          stickyNote.appendChild(editForm);
        } else {
          // Show pin text and action buttons
          const noteText = document.createElement('div');
          noteText.className = 'sticky-note-text';
          noteText.textContent = highlight.text;
          stickyNote.appendChild(noteText);

          // Action buttons
          const actionButtons = document.createElement('div');
          actionButtons.className = 'pin-actions';
          actionButtons.style.display = 'flex';
          actionButtons.style.gap = '0.5rem';
          actionButtons.style.marginTop = '0.5rem';
          actionButtons.style.paddingTop = '0.5rem';
          actionButtons.style.borderTop = '1px solid #d4af37';

          const editButton = document.createElement('button');
          editButton.className = 'btn';
          editButton.textContent = '✏️';
          editButton.style.fontSize = '11px';
          editButton.style.padding = '0.25rem 0.5rem';
          editButton.title = 'Edit pin';
          editButton.addEventListener('click', (e) => {
            e.stopPropagation();
            setEditingPinId(highlight.id);
            setEditingPinText(highlight.text);
          });
          actionButtons.appendChild(editButton);

          const deleteButton = document.createElement('button');
          deleteButton.className = 'btn btn-secondary';
          deleteButton.textContent = '🗑️';
          deleteButton.style.fontSize = '11px';
          deleteButton.style.padding = '0.25rem 0.5rem';
          deleteButton.title = 'Delete pin';
          deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            handleDeletePin(highlight.id);
          });
          actionButtons.appendChild(deleteButton);

          stickyNote.appendChild(actionButtons);
        }

        pinLayer.appendChild(stickyNote);

        // Prevent click on sticky note from closing it
        stickyNote.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
    });

    const endTime = performance.now();
    console.log(`renderPins: Rendered ${paper.highlights?.length || 0} pins in ${(endTime - startTime).toFixed(2)}ms`);
  };

  // Re-render pins when expandedPinId or editingPinId changes (but NOT editingPinText to avoid focus loss)
  useEffect(() => {
    if (pdfDoc) {
      renderPins();
    }
  }, [expandedPinId, editingPinId]);

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

      // Render pins immediately after pages are rendered
      // Wait a bit for DOM to be fully ready, then render
      console.log('Rendering pins...');
      const tryRenderPins = () => {
        const pinLayers = containerRef.current?.querySelectorAll('.pin-layer');
        if (pinLayers && pinLayers.length > 0) {
          renderPins();
          console.log('Pins rendered successfully');
        } else {
          console.log('Pin layers not ready, retrying...');
          setTimeout(tryRenderPins, 50);
        }
      };
      setTimeout(tryRenderPins, 10);
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

        // Add text layer using PDF.js TextLayer (for future search/copy features)
        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'pdf-text-layer';
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;

        try {
          const textContent = await page.getTextContent();
          const pdfjsLib = (window as any).pdfjsLib;

          // Use PDF.js renderTextLayer for proper positioning
          if (pdfjsLib && pdfjsLib.renderTextLayer) {
            pdfjsLib.renderTextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport: viewport,
              textDivs: []
            });
          }
        } catch (textError) {
          console.warn(`Error rendering text layer for page ${pageNum}:`, textError);
        }

        pageContainer.appendChild(textLayerDiv);

        // Add pin layer
        const pinLayer = document.createElement('div');
        pinLayer.className = 'pin-layer';
        pinLayer.setAttribute('data-page', pageNum.toString());
        pageContainer.appendChild(pinLayer);

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

      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`
          }}
        >
          <div className="context-menu-item" onClick={handleAddPin}>
            Add Pin
          </div>
          <div className="context-menu-item" onClick={() => alert('Tag feature coming soon')}>
            Tag (coming soon)
          </div>
        </div>
      )}

      {pinForm.visible && (
        <div
          className="pin-form"
          style={{
            left: `${pinForm.x}px`,
            top: `${pinForm.y}px`
          }}
        >
          <div className="color-picker">
            {(config?.highlight_colors || ['#ffeb3b', '#4caf50', '#f44336', '#2196f3']).map(color => (
              <div
                key={color}
                className={`color-btn ${pinForm.color === color ? 'selected' : ''}`}
                style={{ background: color }}
                onClick={() => setPinForm({ ...pinForm, color })}
              />
            ))}
          </div>

          <textarea
            className="pin-text-input"
            placeholder="Enter note text..."
            value={pinForm.text}
            onChange={(e) => setPinForm({ ...pinForm, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                createPin();
              } else if (e.key === 'Escape') {
                setPinForm({ ...pinForm, visible: false, text: '' });
              }
            }}
            rows={4}
            autoFocus
          />

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button className="btn" onClick={createPin}>
              Add Pin
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setPinForm({ ...pinForm, visible: false, text: '' });
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
