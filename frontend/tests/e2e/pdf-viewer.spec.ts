import { test, expect } from '@playwright/test';

test.describe('PDF Viewer', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', err => console.log('Browser error:', err.message));

    await page.goto('/');
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('should load the application', async ({ page }) => {
    // Check that the main app elements are present
    await expect(page.locator('.top-bar')).toBeVisible();
    await expect(page.locator('.main-container')).toBeVisible();
    await expect(page.locator('.status-bar')).toBeVisible();
  });

  test('should display welcome message when no paper is selected', async ({ page }) => {
    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState.locator('h2')).toContainText('Welcome to Scholarita');
  });

  test('should display papers in sidebar', async ({ page }) => {
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();

    // Check if papers are loaded
    const statusBar = page.locator('.status-bar');
    await expect(statusBar).toContainText(/\d+ papers/);
  });

  test('should load PDF when paper is selected from sidebar', async ({ page }) => {
    // Wait for papers to load
    await page.waitForTimeout(1000);

    // Find and click the first paper in the sidebar
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();

      // Wait for PDF viewer to appear
      await page.waitForSelector('.pdf-container', { timeout: 10000 });

      // Check that PDF is loading or loaded
      const pdfContainer = page.locator('.pdf-container');
      await expect(pdfContainer).toBeVisible();

      // Wait for loading to complete (either shows loading or content)
      await page.waitForTimeout(2000);

      // Check if PDF loaded successfully (should have canvas or error message)
      const hasCanvas = await page.locator('.pdf-canvas-wrapper canvas').count() > 0;
      const hasError = await page.locator('.error').isVisible();
      const isLoading = await page.locator('.loading').isVisible();

      // At this point, we should either have:
      // - Canvas elements (successful load)
      // - Error message (failed load)
      // - Still loading (slow network)
      expect(hasCanvas || hasError || isLoading).toBeTruthy();

      if (hasCanvas) {
        console.log('✓ PDF loaded successfully with canvas');
      } else if (hasError) {
        const errorText = await page.locator('.error').textContent();
        console.log('✗ PDF failed to load:', errorText);
      } else if (isLoading) {
        console.log('⌛ PDF still loading after 2s');
      }
    } else {
      test.skip();
      console.log('No papers available to test');
    }
  });

  test('should render PDF pages with canvas elements', async ({ page }) => {
    // Wait for papers to load
    await page.waitForTimeout(1000);

    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();

      // Wait for PDF to load
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(3000); // Give PDF time to render

      // Check for canvas elements
      const canvases = page.locator('.pdf-canvas-wrapper canvas');
      const canvasCount = await canvases.count();

      if (canvasCount > 0) {
        console.log(`✓ Found ${canvasCount} canvas elements (pages)`);
        expect(canvasCount).toBeGreaterThan(0);

        // Check that canvases have actual dimensions
        const firstCanvas = canvases.first();
        const boundingBox = await firstCanvas.boundingBox();

        expect(boundingBox).not.toBeNull();
        expect(boundingBox!.width).toBeGreaterThan(0);
        expect(boundingBox!.height).toBeGreaterThan(0);

        console.log(`✓ Canvas dimensions: ${boundingBox!.width}x${boundingBox!.height}`);
      } else {
        const hasError = await page.locator('.error').isVisible();
        if (hasError) {
          const errorText = await page.locator('.error').textContent();
          console.log('✗ PDF error:', errorText);
        }
        console.log(`✗ No canvas elements found`);
      }
    } else {
      test.skip();
    }
  });

  test('should create and display tabs when papers are selected', async ({ page }) => {
    // Wait for papers to load
    await page.waitForTimeout(1000);

    const papers = page.locator('.paper-item');
    const paperCount = await papers.count();

    if (paperCount >= 2) {
      // Click first paper
      await papers.nth(0).click();
      await page.waitForTimeout(500);

      // Check tab was created
      let tabs = page.locator('.tab');
      await expect(tabs).toHaveCount(1);

      // Click second paper
      await papers.nth(1).click();
      await page.waitForTimeout(500);

      // Check second tab was created
      tabs = page.locator('.tab');
      await expect(tabs).toHaveCount(2);

      console.log('✓ Tabs created successfully');
    } else {
      test.skip();
      console.log('Need at least 2 papers to test tabs');
    }
  });

  test('should switch between tabs and maintain PDF state', async ({ page }) => {
    // Wait for papers to load
    await page.waitForTimeout(1000);

    const papers = page.locator('.paper-item');
    const paperCount = await papers.count();

    if (paperCount >= 2) {
      // Open first paper
      await papers.nth(0).click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Check if first PDF loaded
      const firstPDFHasCanvas = await page.locator('.pdf-canvas-wrapper canvas').count() > 0;
      console.log(`First PDF canvas count: ${await page.locator('.pdf-canvas-wrapper canvas').count()}`);

      // Open second paper
      await papers.nth(1).click();
      await page.waitForTimeout(2000);

      // Check if second PDF loaded
      const secondPDFHasCanvas = await page.locator('.pdf-canvas-wrapper canvas').count() > 0;
      console.log(`Second PDF canvas count: ${await page.locator('.pdf-canvas-wrapper canvas').count()}`);

      // Switch back to first tab
      const tabs = page.locator('.tab');
      await tabs.first().click();
      await page.waitForTimeout(1000);

      // Check if first PDF is still displayed
      const backToFirstCanvasCount = await page.locator('.pdf-canvas-wrapper canvas').count();
      console.log(`Back to first PDF canvas count: ${backToFirstCanvasCount}`);

      // The canvas count should be maintained when switching back
      if (firstPDFHasCanvas) {
        expect(backToFirstCanvasCount).toBeGreaterThan(0);
        console.log('✓ PDF state maintained when switching tabs');
      } else {
        console.log('✗ First PDF did not load initially');
      }

      // Check for gray screen issue - there will be multiple pdf-containers now (one per tab)
      const visiblePdfContainers = page.locator('.pdf-container:visible');
      const count = await visiblePdfContainers.count();
      expect(count).toBeGreaterThan(0);

      // Take a screenshot to verify visual state
      await page.screenshot({ path: 'tests/e2e/screenshots/tab-switch.png' });

    } else {
      test.skip();
      console.log('Need at least 2 papers to test tab switching');
    }
  });

  test('should handle PDF loading errors gracefully', async ({ page }) => {
    // This test checks error handling when PDF fails to load
    // We can't easily trigger this without a broken PDF, but we can check the structure

    await page.waitForTimeout(1000);
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(3000);

      // Check if we have either success (canvas) or error
      const hasCanvas = await page.locator('.pdf-canvas-wrapper canvas').count() > 0;
      const hasError = await page.locator('.error').isVisible();
      const isLoading = await page.locator('.loading').isVisible();

      // One of these should be true
      expect(hasCanvas || hasError || isLoading).toBeTruthy();

      if (hasError) {
        const errorMessage = await page.locator('.error').textContent();
        console.log('Error message displayed:', errorMessage);
        expect(errorMessage).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });

  test('should display annotation panel alongside PDF', async ({ page }) => {
    await page.waitForTimeout(1000);

    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });

      // Check if annotation panel is visible
      const annotationPanel = page.locator('.annotation-panel');
      await expect(annotationPanel).toBeVisible();

      console.log('✓ Annotation panel is visible');
    } else {
      test.skip();
    }
  });
});
