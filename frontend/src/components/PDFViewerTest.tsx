import React, { useEffect, useRef } from 'react';
// @ts-ignore - pdfjs-dist has module resolution issues with Vite
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Minimal PDF viewer for testing
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const PDFViewerTest: React.FC<{ pdfUrl: string }> = ({ pdfUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        console.log('[TEST] Loading PDF from:', pdfUrl);
        // @ts-ignore
        console.log('[TEST] Worker URL:', pdfjsLib.GlobalWorkerOptions.workerSrc);

        // @ts-ignore
        const loadingTask = pdfjsLib.getDocument(pdfUrl);

        loadingTask.onProgress = (progress: any) => {
          console.log('[TEST] Progress:', progress.loaded, '/', progress.total);
        };

        const pdf = await loadingTask.promise;
        console.log('[TEST] PDF loaded! Pages:', pdf.numPages);

        // Render just first page
        const page = await pdf.getPage(1);
        console.log('[TEST] Page 1 loaded');

        const viewport = page.getViewport({ scale: 1.0 });
        console.log('[TEST] Viewport:', viewport.width, 'x', viewport.height);

        const canvas = canvasRef.current;
        if (!canvas) {
          console.error('[TEST] No canvas element');
          return;
        }

        const context = canvas.getContext('2d', { alpha: false });
        if (!context) {
          console.error('[TEST] No 2D context');
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // White background
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        console.log('[TEST] Starting render...');
        const renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        });

        await renderTask.promise;
        console.log('[TEST] Render complete!');
      } catch (error) {
        console.error('[TEST] Error:', error);
        console.error('[TEST] Error stack:', error instanceof Error ? error.stack : 'No stack');
      }
    };

    loadPdf();
  }, [pdfUrl]);

  return (
    <div style={{ padding: '20px', background: '#f0f0f0' }}>
      <h3>PDF Test Viewer</h3>
      <p>Check console for detailed logs</p>
      <canvas
        ref={canvasRef}
        style={{
          border: '2px solid red',
          background: 'white',
          display: 'block',
          marginTop: '10px'
        }}
      />
    </div>
  );
};
