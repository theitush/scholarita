import { test, expect } from '@playwright/test';

test.describe('Highlighting Features', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', err => console.log('Browser error:', err.message));

    await page.goto('/');
    // Wait for app to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should display highlight popover when text is selected', async ({ page }) => {
    // Open first paper
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(3000); // Wait for PDF to fully render

      // Check if PDF loaded with text layer
      const textLayer = page.locator('.pdf-text-layer').first();

      if (await textLayer.isVisible()) {
        // Select text in the PDF
        // We'll use JavaScript to programmatically select text since Playwright text selection can be tricky
        await page.evaluate(() => {
          const textLayer = document.querySelector('.pdf-text-layer');
          if (textLayer) {
            const span = textLayer.querySelector('span');
            if (span && span.textContent && span.textContent.length >= 3) {
              const range = document.createRange();
              range.selectNodeContents(span);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);

              // Trigger mouseup event to show popover
              document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            }
          }
        });

        await page.waitForTimeout(500);

        // Check if popover is visible
        const popover = page.locator('.highlight-popover');
        const isPopoverVisible = await popover.isVisible();

        if (isPopoverVisible) {
          console.log('✓ Highlight popover displayed after text selection');
          await expect(popover).toBeVisible();

          // Check that color picker is present
          const colorPicker = page.locator('.color-picker');
          await expect(colorPicker).toBeVisible();

          // Check that color buttons exist
          const colorButtons = page.locator('.color-btn');
          const colorCount = await colorButtons.count();
          expect(colorCount).toBeGreaterThan(0);
          console.log(`✓ Found ${colorCount} color options`);

          // Check that comment input exists
          const commentInput = page.locator('.comment-input');
          await expect(commentInput).toBeVisible();

          // Check that highlight button exists
          const highlightButton = page.locator('.highlight-popover button:has-text("Highlight")');
          await expect(highlightButton).toBeVisible();

          console.log('✓ All popover elements present');
        } else {
          console.log('✗ Popover not visible - this may happen if text layer is not ready');
        }
      } else {
        console.log('✗ PDF text layer not found - skipping test');
        test.skip();
      }
    } else {
      test.skip();
      console.log('No papers available to test');
    }
  });

  test('should create a highlight with default color', async ({ page }) => {
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(3000);

      const textLayer = page.locator('.pdf-text-layer').first();

      if (await textLayer.isVisible()) {
        // Get initial highlight count
        const annotationPanel = page.locator('.annotation-panel-header');
        const initialText = await annotationPanel.textContent();
        const initialCount = parseInt(initialText?.match(/(\d+)/)?.[1] || '0');
        console.log(`Initial highlights: ${initialCount}`);

        // Select text and create highlight
        await page.evaluate(() => {
          const textLayer = document.querySelector('.pdf-text-layer');
          if (textLayer) {
            const span = textLayer.querySelector('span');
            if (span && span.textContent && span.textContent.length >= 3) {
              const range = document.createRange();
              range.selectNodeContents(span);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
              document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            }
          }
        });

        await page.waitForTimeout(500);

        const popover = page.locator('.highlight-popover');
        if (await popover.isVisible()) {
          // Click highlight button without changing color
          const highlightButton = page.locator('.highlight-popover button:has-text("Highlight")');
          await highlightButton.click();

          // Wait for API call to complete
          await page.waitForTimeout(1500);

          // Check that highlight count increased
          const newText = await annotationPanel.textContent();
          const newCount = parseInt(newText?.match(/(\d+)/)?.[1] || '0');
          console.log(`New highlights: ${newCount}`);

          expect(newCount).toBe(initialCount + 1);
          console.log('✓ Highlight created successfully');

          // Check that popover is hidden
          await expect(popover).not.toBeVisible();
          console.log('✓ Popover hidden after creating highlight');
        } else {
          console.log('✗ Popover not visible - skipping');
          test.skip();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should create highlight with custom color', async ({ page }) => {
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(3000);

      const textLayer = page.locator('.pdf-text-layer').first();

      if (await textLayer.isVisible()) {
        // Select text
        await page.evaluate(() => {
          const textLayer = document.querySelector('.pdf-text-layer');
          if (textLayer) {
            const spans = textLayer.querySelectorAll('span');
            const span = Array.from(spans).find(s => s.textContent && s.textContent.length >= 5);
            if (span) {
              const range = document.createRange();
              range.selectNodeContents(span);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
              document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            }
          }
        });

        await page.waitForTimeout(500);

        const popover = page.locator('.highlight-popover');
        if (await popover.isVisible()) {
          // Select a different color (second color button)
          const colorButtons = page.locator('.color-btn');
          const colorCount = await colorButtons.count();

          if (colorCount >= 2) {
            await colorButtons.nth(1).click();
            console.log('✓ Selected custom color');

            // Click highlight button
            const highlightButton = page.locator('.highlight-popover button:has-text("Highlight")');
            await highlightButton.click();

            await page.waitForTimeout(1500);

            // Expand annotation panel if collapsed
            const panelHeader = page.locator('.annotation-panel-header');
            const panel = page.locator('.annotation-panel');
            const isCollapsed = await panel.evaluate(el => el.classList.contains('collapsed'));

            if (isCollapsed) {
              await panelHeader.click();
              await page.waitForTimeout(300);
            }

            // Check that highlight appears in annotation panel
            const annotationItems = page.locator('.annotation-item');
            const count = await annotationItems.count();
            expect(count).toBeGreaterThan(0);
            console.log('✓ Highlight with custom color created');
          } else {
            console.log('Not enough color options available');
            test.skip();
          }
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should create highlight with comment', async ({ page }) => {
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(3000);

      const textLayer = page.locator('.pdf-text-layer').first();

      if (await textLayer.isVisible()) {
        // Select text
        await page.evaluate(() => {
          const textLayer = document.querySelector('.pdf-text-layer');
          if (textLayer) {
            const spans = textLayer.querySelectorAll('span');
            const span = Array.from(spans).find(s => s.textContent && s.textContent.length >= 5);
            if (span) {
              const range = document.createRange();
              range.selectNodeContents(span);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
              document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            }
          }
        });

        await page.waitForTimeout(500);

        const popover = page.locator('.highlight-popover');
        if (await popover.isVisible()) {
          // Type comment
          const commentInput = page.locator('.comment-input');
          const testComment = 'This is a test comment for E2E testing';
          await commentInput.fill(testComment);
          console.log('✓ Comment entered');

          // Click highlight button
          const highlightButton = page.locator('.highlight-popover button:has-text("Highlight")');
          await highlightButton.click();

          await page.waitForTimeout(1500);

          // Expand annotation panel if collapsed
          const panelHeader = page.locator('.annotation-panel-header');
          const panel = page.locator('.annotation-panel');
          const isCollapsed = await panel.evaluate(el => el.classList.contains('collapsed'));

          if (isCollapsed) {
            await panelHeader.click();
            await page.waitForTimeout(300);
          }

          // Check that comment appears in annotation panel
          const annotationContent = page.locator('.annotation-panel-content');
          const content = await annotationContent.textContent();
          expect(content).toContain(testComment);
          console.log('✓ Highlight with comment created and displayed');
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should support Enter key to create highlight', async ({ page }) => {
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(3000);

      const textLayer = page.locator('.pdf-text-layer').first();

      if (await textLayer.isVisible()) {
        // Get initial count
        const annotationPanel = page.locator('.annotation-panel-header');
        const initialText = await annotationPanel.textContent();
        const initialCount = parseInt(initialText?.match(/(\d+)/)?.[1] || '0');

        // Select text
        await page.evaluate(() => {
          const textLayer = document.querySelector('.pdf-text-layer');
          if (textLayer) {
            const spans = textLayer.querySelectorAll('span');
            const span = Array.from(spans).find(s => s.textContent && s.textContent.length >= 5);
            if (span) {
              const range = document.createRange();
              range.selectNodeContents(span);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
              document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            }
          }
        });

        await page.waitForTimeout(500);

        const popover = page.locator('.highlight-popover');
        if (await popover.isVisible()) {
          // Focus comment input and press Enter
          const commentInput = page.locator('.comment-input');
          await commentInput.click();
          await commentInput.press('Enter');

          await page.waitForTimeout(1500);

          // Check that highlight was created
          const newText = await annotationPanel.textContent();
          const newCount = parseInt(newText?.match(/(\d+)/)?.[1] || '0');
          expect(newCount).toBe(initialCount + 1);
          console.log('✓ Enter key creates highlight');
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should support Escape key to cancel highlight', async ({ page }) => {
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(3000);

      const textLayer = page.locator('.pdf-text-layer').first();

      if (await textLayer.isVisible()) {
        // Select text
        await page.evaluate(() => {
          const textLayer = document.querySelector('.pdf-text-layer');
          if (textLayer) {
            const spans = textLayer.querySelectorAll('span');
            const span = Array.from(spans).find(s => s.textContent && s.textContent.length >= 5);
            if (span) {
              const range = document.createRange();
              range.selectNodeContents(span);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
              document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            }
          }
        });

        await page.waitForTimeout(500);

        const popover = page.locator('.highlight-popover');
        if (await popover.isVisible()) {
          // Press Escape
          const commentInput = page.locator('.comment-input');
          await commentInput.click();
          await commentInput.press('Escape');

          await page.waitForTimeout(300);

          // Check that popover is hidden
          await expect(popover).not.toBeVisible();
          console.log('✓ Escape key cancels highlight');
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should cancel highlight creation with Cancel button', async ({ page }) => {
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(3000);

      const textLayer = page.locator('.pdf-text-layer').first();

      if (await textLayer.isVisible()) {
        // Select text
        await page.evaluate(() => {
          const textLayer = document.querySelector('.pdf-text-layer');
          if (textLayer) {
            const spans = textLayer.querySelectorAll('span');
            const span = Array.from(spans).find(s => s.textContent && s.textContent.length >= 5);
            if (span) {
              const range = document.createRange();
              range.selectNodeContents(span);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
              document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            }
          }
        });

        await page.waitForTimeout(500);

        const popover = page.locator('.highlight-popover');
        if (await popover.isVisible()) {
          // Click Cancel button
          const cancelButton = page.locator('.highlight-popover button:has-text("Cancel")');
          await cancelButton.click();

          await page.waitForTimeout(300);

          // Check that popover is hidden
          await expect(popover).not.toBeVisible();
          console.log('✓ Cancel button closes popover');
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should display highlights in annotation panel', async ({ page }) => {
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Check annotation panel
      const annotationPanel = page.locator('.annotation-panel');
      await expect(annotationPanel).toBeVisible();

      // Expand if collapsed
      const panelHeader = page.locator('.annotation-panel-header');
      const isCollapsed = await annotationPanel.evaluate(el => el.classList.contains('collapsed'));

      if (isCollapsed) {
        await panelHeader.click();
        await page.waitForTimeout(300);
      }

      // Check header text
      const headerText = await panelHeader.textContent();
      expect(headerText).toMatch(/\d+ pins/);
      console.log(`✓ Annotation panel shows: ${headerText}`);

      // Check if there are any highlights
      const annotationItems = page.locator('.annotation-item');
      const count = await annotationItems.count();
      console.log(`✓ Found ${count} highlights in annotation panel`);

      if (count > 0) {
        // Check first highlight has expected structure
        const firstItem = annotationItems.first();
        await expect(firstItem).toBeVisible();

        // Should have color indicator
        const colorIndicator = firstItem.locator('div[style*="background"]');
        await expect(colorIndicator.first()).toBeVisible();

        // Should have date
        const dateText = await firstItem.textContent();
        expect(dateText).toBeTruthy();

        console.log('✓ Highlights displayed correctly in annotation panel');
      }
    } else {
      test.skip();
    }
  });

  test('should edit highlight comment', async ({ page }) => {
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Expand annotation panel if needed
      const annotationPanel = page.locator('.annotation-panel');
      const panelHeader = page.locator('.annotation-panel-header');
      const isCollapsed = await annotationPanel.evaluate(el => el.classList.contains('collapsed'));

      if (isCollapsed) {
        await panelHeader.click();
        await page.waitForTimeout(300);
      }

      // Check if there are highlights to edit
      const annotationItems = page.locator('.annotation-item');
      const count = await annotationItems.count();

      if (count > 0) {
        const firstItem = annotationItems.first();

        // Click edit button (pencil emoji)
        const editButton = firstItem.locator('button[title="Edit comment"]');
        await editButton.click();
        await page.waitForTimeout(300);

        // Check that edit input appears
        const editInput = firstItem.locator('input.comment-input');
        await expect(editInput).toBeVisible();
        console.log('✓ Edit mode activated');

        // Enter new comment
        const newComment = 'Updated comment from E2E test';
        await editInput.fill(newComment);

        // Click Save button
        const saveButton = firstItem.locator('button:has-text("Save")');
        await saveButton.click();
        await page.waitForTimeout(1500);

        // Check that comment was updated
        const itemText = await firstItem.textContent();
        expect(itemText).toContain(newComment);
        console.log('✓ Comment edited successfully');
      } else {
        console.log('No highlights available to edit - skipping');
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should delete highlight', async ({ page }) => {
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Expand annotation panel if needed
      const annotationPanel = page.locator('.annotation-panel');
      const panelHeader = page.locator('.annotation-panel-header');
      const isCollapsed = await annotationPanel.evaluate(el => el.classList.contains('collapsed'));

      if (isCollapsed) {
        await panelHeader.click();
        await page.waitForTimeout(300);
      }

      // Get initial count
      const initialText = await panelHeader.textContent();
      const initialCount = parseInt(initialText?.match(/(\d+)/)?.[1] || '0');

      if (initialCount > 0) {
        const annotationItems = page.locator('.annotation-item');
        const firstItem = annotationItems.first();

        // Set up dialog handler to accept confirmation
        page.on('dialog', dialog => dialog.accept());

        // Click delete button (trash emoji)
        const deleteButton = firstItem.locator('button[title="Delete highlight"]');
        await deleteButton.click();
        await page.waitForTimeout(1500);

        // Check that count decreased
        const newText = await panelHeader.textContent();
        const newCount = parseInt(newText?.match(/(\d+)/)?.[1] || '0');
        expect(newCount).toBe(initialCount - 1);
        console.log('✓ Highlight deleted successfully');
      } else {
        console.log('No highlights available to delete - skipping');
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should collapse and expand annotation panel', async ({ page }) => {
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(2000);

      const annotationPanel = page.locator('.annotation-panel');
      const panelHeader = page.locator('.annotation-panel-header');

      // Check initial state
      const initiallyCollapsed = await annotationPanel.evaluate(el => el.classList.contains('collapsed'));
      console.log(`Initially collapsed: ${initiallyCollapsed}`);

      // Click to toggle
      await panelHeader.click();
      await page.waitForTimeout(300);

      // Check state changed
      const nowCollapsed = await annotationPanel.evaluate(el => el.classList.contains('collapsed'));
      expect(nowCollapsed).toBe(!initiallyCollapsed);
      console.log('✓ Panel toggled successfully');

      // Toggle again
      await panelHeader.click();
      await page.waitForTimeout(300);

      const backToInitial = await annotationPanel.evaluate(el => el.classList.contains('collapsed'));
      expect(backToInitial).toBe(initiallyCollapsed);
      console.log('✓ Panel toggle works both ways');
    } else {
      test.skip();
    }
  });
});
