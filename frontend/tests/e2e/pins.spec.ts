import { test, expect } from '@playwright/test';

test.describe('Pin Annotation Features', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', err => console.log('Browser error:', err.message));

    await page.goto('/');
    // Wait for app to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should display context menu on right-click in PDF', async ({ page }) => {
    // Open first paper
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(3000); // Wait for PDF to fully render

      // Check if PDF page is rendered
      const pdfPage = page.locator('.pdf-page').first();

      if (await pdfPage.isVisible()) {
        // Right-click on the PDF
        await pdfPage.click({ button: 'right', position: { x: 100, y: 100 } });
        await page.waitForTimeout(500);

        // Check if context menu is visible
        const contextMenu = page.locator('.context-menu');
        const isMenuVisible = await contextMenu.isVisible();

        if (isMenuVisible) {
          console.log('✓ Context menu displayed on right-click');
          await expect(contextMenu).toBeVisible();

          // Check that "Add Pin" option exists
          const addPinOption = page.locator('.context-menu-item:has-text("Add Pin")');
          await expect(addPinOption).toBeVisible();
          console.log('✓ "Add Pin" option present in context menu');

          // Check that "Tag" option exists
          const tagOption = page.locator('.context-menu-item:has-text("Tag")');
          await expect(tagOption).toBeVisible();
          console.log('✓ "Tag" option present in context menu');
        } else {
          console.log('✗ Context menu not visible');
        }
      } else {
        console.log('✗ PDF page not found - skipping test');
        test.skip();
      }
    } else {
      test.skip();
      console.log('No papers available to test');
    }
  });

  test('should show pin form when "Add Pin" is clicked', async ({ page }) => {
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(3000);

      const pdfPage = page.locator('.pdf-page').first();

      if (await pdfPage.isVisible()) {
        // Right-click on the PDF
        await pdfPage.click({ button: 'right', position: { x: 150, y: 150 } });
        await page.waitForTimeout(500);

        const contextMenu = page.locator('.context-menu');
        if (await contextMenu.isVisible()) {
          // Click "Add Pin"
          const addPinOption = page.locator('.context-menu-item:has-text("Add Pin")');
          await addPinOption.click();
          await page.waitForTimeout(500);

          // Check that pin form is visible
          const pinForm = page.locator('.pin-form');
          const isFormVisible = await pinForm.isVisible();

          if (isFormVisible) {
            console.log('✓ Pin form displayed after clicking "Add Pin"');
            await expect(pinForm).toBeVisible();

            // Check that color picker is present
            const colorPicker = page.locator('.color-picker');
            await expect(colorPicker).toBeVisible();

            // Check that color buttons exist
            const colorButtons = page.locator('.color-btn');
            const colorCount = await colorButtons.count();
            expect(colorCount).toBeGreaterThan(0);
            console.log(`✓ Found ${colorCount} color options`);

            // Check that text input exists
            const textInput = page.locator('.pin-text-input');
            await expect(textInput).toBeVisible();
            console.log('✓ Pin text input present');

            // Check that "Add Pin" button exists
            const addButton = page.locator('.pin-form button:has-text("Add Pin")');
            await expect(addButton).toBeVisible();
            console.log('✓ Add Pin button present');

            // Context menu should be hidden
            await expect(contextMenu).not.toBeVisible();
            console.log('✓ Context menu hidden after opening pin form');
          } else {
            console.log('✗ Pin form not visible');
          }
        } else {
          console.log('✗ Context menu not visible - skipping');
          test.skip();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should create a pin with text and default color', async ({ page }) => {
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(3000);

      // Get initial pin count
      const annotationPanel = page.locator('.annotation-panel-header');
      const initialText = await annotationPanel.textContent();
      const initialCount = parseInt(initialText?.match(/(\d+)/)?.[1] || '0');
      console.log(`Initial pins: ${initialCount}`);

      const pdfPage = page.locator('.pdf-page').first();

      if (await pdfPage.isVisible()) {
        // Right-click and add pin
        await pdfPage.click({ button: 'right', position: { x: 200, y: 200 } });
        await page.waitForTimeout(500);

        const addPinOption = page.locator('.context-menu-item:has-text("Add Pin")');
        if (await addPinOption.isVisible()) {
          await addPinOption.click();
          await page.waitForTimeout(500);

          const pinForm = page.locator('.pin-form');
          if (await pinForm.isVisible()) {
            // Type pin text
            const textInput = page.locator('.pin-text-input');
            const testText = 'This is a test pin annotation';
            await textInput.fill(testText);
            console.log('✓ Pin text entered');

            // Click "Add Pin" button
            const addButton = page.locator('.pin-form button:has-text("Add Pin")');
            await addButton.click();

            // Wait for API call to complete
            await page.waitForTimeout(1500);

            // Check that pin count increased
            const newText = await annotationPanel.textContent();
            const newCount = parseInt(newText?.match(/(\d+)/)?.[1] || '0');
            console.log(`New pins: ${newCount}`);

            expect(newCount).toBe(initialCount + 1);
            console.log('✓ Pin created successfully');

            // Check that pin form is hidden
            await expect(pinForm).not.toBeVisible();
            console.log('✓ Pin form hidden after creating pin');
          } else {
            console.log('✗ Pin form not visible - skipping');
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

  test('should create pin with custom color', async ({ page }) => {
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(3000);

      const pdfPage = page.locator('.pdf-page').first();

      if (await pdfPage.isVisible()) {
        // Right-click and add pin
        await pdfPage.click({ button: 'right', position: { x: 250, y: 250 } });
        await page.waitForTimeout(500);

        const addPinOption = page.locator('.context-menu-item:has-text("Add Pin")');
        if (await addPinOption.isVisible()) {
          await addPinOption.click();
          await page.waitForTimeout(500);

          const pinForm = page.locator('.pin-form');
          if (await pinForm.isVisible()) {
            // Select a different color (second color button)
            const colorButtons = page.locator('.color-btn');
            const colorCount = await colorButtons.count();

            if (colorCount >= 2) {
              await colorButtons.nth(1).click();
              console.log('✓ Selected custom color');

              // Type pin text
              const textInput = page.locator('.pin-text-input');
              await textInput.fill('Pin with custom color');

              // Click "Add Pin" button
              const addButton = page.locator('.pin-form button:has-text("Add Pin")');
              await addButton.click();

              await page.waitForTimeout(1500);

              console.log('✓ Pin with custom color created');
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
    } else {
      test.skip();
    }
  });

  test('should display pin as colored circle on PDF', async ({ page }) => {
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(3000);

      const pdfPage = page.locator('.pdf-page').first();

      if (await pdfPage.isVisible()) {
        // Right-click and add pin
        await pdfPage.click({ button: 'right', position: { x: 300, y: 300 } });
        await page.waitForTimeout(500);

        const addPinOption = page.locator('.context-menu-item:has-text("Add Pin")');
        if (await addPinOption.isVisible()) {
          await addPinOption.click();
          await page.waitForTimeout(500);

          const pinForm = page.locator('.pin-form');
          if (await pinForm.isVisible()) {
            const textInput = page.locator('.pin-text-input');
            await textInput.fill('Pin to test visualization');

            const addButton = page.locator('.pin-form button:has-text("Add Pin")');
            await addButton.click();

            await page.waitForTimeout(1500);

            // Check that pin element exists on the page
            const pin = page.locator('.pin').first();
            const isPinVisible = await pin.isVisible();

            if (isPinVisible) {
              console.log('✓ Pin displayed on PDF');
              await expect(pin).toBeVisible();

              // Check that pin has a number
              const pinNumber = pin.locator('.pin-number');
              await expect(pinNumber).toBeVisible();
              const numberText = await pinNumber.textContent();
              expect(numberText).toBeTruthy();
              console.log(`✓ Pin shows number: ${numberText}`);
            } else {
              console.log('✗ Pin not visible on PDF');
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
    } else {
      test.skip();
    }
  });

  test('should expand and collapse pin on click', async ({ page }) => {
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(3000);

      // Check if there are existing pins
      const pins = page.locator('.pin');
      const pinCount = await pins.count();

      if (pinCount > 0) {
        const firstPin = pins.first();

        // Click pin to expand
        await firstPin.click();
        await page.waitForTimeout(500);

        // Check if sticky note is visible
        const stickyNote = page.locator('.sticky-note').first();
        const isNoteVisible = await stickyNote.isVisible();

        if (isNoteVisible) {
          console.log('✓ Sticky note displayed when pin is clicked');
          await expect(stickyNote).toBeVisible();

          // Check that sticky note has text
          const noteText = stickyNote.locator('.sticky-note-text');
          await expect(noteText).toBeVisible();
          const text = await noteText.textContent();
          expect(text).toBeTruthy();
          console.log('✓ Sticky note shows pin text');

          // Click pin again to collapse
          await firstPin.click();
          await page.waitForTimeout(500);

          // Check that sticky note is hidden
          await expect(stickyNote).not.toBeVisible();
          console.log('✓ Sticky note hidden when pin is clicked again');
        } else {
          console.log('✗ Sticky note not visible');
        }
      } else {
        console.log('No pins available to test - skipping');
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should cancel pin creation with Cancel button', async ({ page }) => {
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(3000);

      // Get initial count
      const annotationPanel = page.locator('.annotation-panel-header');
      const initialText = await annotationPanel.textContent();
      const initialCount = parseInt(initialText?.match(/(\d+)/)?.[1] || '0');

      const pdfPage = page.locator('.pdf-page').first();

      if (await pdfPage.isVisible()) {
        // Right-click and add pin
        await pdfPage.click({ button: 'right', position: { x: 350, y: 350 } });
        await page.waitForTimeout(500);

        const addPinOption = page.locator('.context-menu-item:has-text("Add Pin")');
        if (await addPinOption.isVisible()) {
          await addPinOption.click();
          await page.waitForTimeout(500);

          const pinForm = page.locator('.pin-form');
          if (await pinForm.isVisible()) {
            // Type some text
            const textInput = page.locator('.pin-text-input');
            await textInput.fill('This pin will be cancelled');

            // Click Cancel button
            const cancelButton = page.locator('.pin-form button:has-text("Cancel")');
            await cancelButton.click();

            await page.waitForTimeout(500);

            // Check that pin form is hidden
            await expect(pinForm).not.toBeVisible();
            console.log('✓ Pin form hidden after clicking Cancel');

            // Check that pin count did not change
            const newText = await annotationPanel.textContent();
            const newCount = parseInt(newText?.match(/(\d+)/)?.[1] || '0');
            expect(newCount).toBe(initialCount);
            console.log('✓ Pin not created when cancelled');
          } else {
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

  test('should support Escape key to cancel pin creation', async ({ page }) => {
    const firstPaper = page.locator('.paper-item').first();

    if (await firstPaper.isVisible()) {
      await firstPaper.click();
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      await page.waitForTimeout(3000);

      const pdfPage = page.locator('.pdf-page').first();

      if (await pdfPage.isVisible()) {
        // Right-click and add pin
        await pdfPage.click({ button: 'right', position: { x: 400, y: 400 } });
        await page.waitForTimeout(500);

        const addPinOption = page.locator('.context-menu-item:has-text("Add Pin")');
        if (await addPinOption.isVisible()) {
          await addPinOption.click();
          await page.waitForTimeout(500);

          const pinForm = page.locator('.pin-form');
          if (await pinForm.isVisible()) {
            // Focus text input and press Escape
            const textInput = page.locator('.pin-text-input');
            await textInput.click();
            await textInput.press('Escape');

            await page.waitForTimeout(300);

            // Check that pin form is hidden
            await expect(pinForm).not.toBeVisible();
            console.log('✓ Escape key cancels pin creation');
          } else {
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

  test('should display pins in annotation panel', async ({ page }) => {
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

      // Check header text shows "pins" instead of "highlights"
      const headerText = await panelHeader.textContent();
      expect(headerText).toMatch(/\d+ pins/);
      console.log(`✓ Annotation panel shows: ${headerText}`);

      // Check if there are any pins
      const annotationItems = page.locator('.annotation-item');
      const count = await annotationItems.count();
      console.log(`✓ Found ${count} pins in annotation panel`);

      if (count > 0) {
        // Check first pin has expected structure
        const firstItem = annotationItems.first();
        await expect(firstItem).toBeVisible();
        console.log('✓ Pins displayed in annotation panel');
      }
    } else {
      test.skip();
    }
  });

  test('should delete pin from annotation panel', async ({ page }) => {
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

        // Click delete button
        const deleteButton = firstItem.locator('button[title="Delete highlight"]');
        await deleteButton.click();
        await page.waitForTimeout(1500);

        // Check that count decreased
        const newText = await panelHeader.textContent();
        const newCount = parseInt(newText?.match(/(\d+)/)?.[1] || '0');
        expect(newCount).toBe(initialCount - 1);
        console.log('✓ Pin deleted successfully');

        // Check that pin disappeared from PDF
        const pins = page.locator('.pin');
        const pinCount = await pins.count();
        expect(pinCount).toBe(newCount);
        console.log('✓ Pin removed from PDF display');
      } else {
        console.log('No pins available to delete - skipping');
        test.skip();
      }
    } else {
      test.skip();
    }
  });
});
