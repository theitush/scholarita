import { test, expect } from '@playwright/test';

test.describe('Tag Management Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should open tag editor when clicking + button on paper', async ({ page }) => {
    // Wait for papers to load
    await page.waitForSelector('.paper-item', { timeout: 5000 });

    // Click the tag edit button on the first paper
    const firstPaper = page.locator('.paper-item').first();
    const editBtn = firstPaper.locator('.tag-edit-btn');
    await editBtn.click();

    // Tag editor modal should be visible
    await expect(page.locator('.tag-editor-modal')).toBeVisible();
    await expect(page.locator('.modal-header h3')).toHaveText('Edit Tags');
  });

  test('should add a new tag to a paper', async ({ page }) => {
    await page.waitForSelector('.paper-item', { timeout: 5000 });

    // Open tag editor
    const firstPaper = page.locator('.paper-item').first();
    await firstPaper.locator('.tag-edit-btn').click();

    // Wait for modal
    await page.waitForSelector('.tag-editor-modal');

    // Type a new tag
    const input = page.locator('.tag-editor-input');
    const tagName = 'test-tag-' + Date.now();
    await input.fill(tagName);
    await input.press('Enter');

    // Verify tag appears in the editor
    await expect(page.locator('.tag-editable').filter({ hasText: tagName })).toBeVisible();

    // Save
    await page.locator('.btn-primary').click();

    // Wait for modal to close
    await expect(page.locator('.tag-editor-modal')).not.toBeVisible();

    // Verify tag appears on the paper in sidebar
    await expect(firstPaper.locator('.paper-tags .tag').filter({ hasText: tagName })).toBeVisible();
  });

  test('should remove a tag from a paper', async ({ page }) => {
    await page.waitForSelector('.paper-item', { timeout: 5000 });

    // First add a tag
    const firstPaper = page.locator('.paper-item').first();
    await firstPaper.locator('.tag-edit-btn').click();
    await page.waitForSelector('.tag-editor-modal');

    const tagName = 'remove-test-' + Date.now();
    const input = page.locator('.tag-editor-input');
    await input.fill(tagName);
    await input.press('Enter');
    await page.locator('.btn-primary').click();
    await page.waitForTimeout(500);

    // Now remove it
    await firstPaper.locator('.tag-edit-btn').click();
    await page.waitForSelector('.tag-editor-modal');

    // Click the × button on the tag
    const tagToRemove = page.locator('.tag-editable').filter({ hasText: tagName });
    await tagToRemove.locator('.tag-remove').click();

    // Save
    await page.locator('.btn-primary').click();
    await expect(page.locator('.tag-editor-modal')).not.toBeVisible();

    // Verify tag is gone
    await expect(firstPaper.locator('.paper-tags')).not.toContainText(tagName);
  });

  test('should show tag suggestions from existing tags', async ({ page }) => {
    await page.waitForSelector('.paper-item', { timeout: 5000 });

    // Add a tag first
    const firstPaper = page.locator('.paper-item').first();
    await firstPaper.locator('.tag-edit-btn').click();
    await page.waitForSelector('.tag-editor-modal');

    const tagName = 'suggestion-test';
    await page.locator('.tag-editor-input').fill(tagName);
    await page.locator('.tag-editor-input').press('Enter');
    await page.locator('.btn-primary').click();
    await page.waitForTimeout(500);

    // Try to add the same tag to another paper - should show suggestion
    const secondPaper = page.locator('.paper-item').nth(1);
    await secondPaper.locator('.tag-edit-btn').click();
    await page.waitForSelector('.tag-editor-modal');

    // Type part of the tag name
    await page.locator('.tag-editor-input').fill('suggest');

    // Suggestions should appear
    await expect(page.locator('.tag-suggestions')).toBeVisible();
    await expect(page.locator('.tag-suggestion')).toContainText(tagName);

    // Close without saving
    await page.locator('.modal-close').click();
  });

  test('should filter papers by clicking tag in sidebar', async ({ page }) => {
    await page.waitForSelector('.paper-item', { timeout: 5000 });

    // Add a unique tag to the first paper
    const tagName = 'filter-test-' + Date.now();
    const firstPaper = page.locator('.paper-item').first();
    const firstPaperTitle = await firstPaper.locator('.paper-title').textContent();

    await firstPaper.locator('.tag-edit-btn').click();
    await page.waitForSelector('.tag-editor-modal');
    await page.locator('.tag-editor-input').fill(tagName);
    await page.locator('.tag-editor-input').press('Enter');
    await page.locator('.btn-primary').click();
    await page.waitForTimeout(500);

    // Click the tag to filter
    const tag = firstPaper.locator('.paper-tags .tag').filter({ hasText: tagName });
    await tag.click();

    // Should show active filter bar
    await expect(page.locator('.active-tag-filters')).toBeVisible();
    await expect(page.locator('.tag-filter-active')).toContainText(tagName);

    // Only papers with this tag should be visible
    const visiblePapers = page.locator('.paper-item');
    await expect(visiblePapers).toHaveCount(1);
    await expect(visiblePapers.first().locator('.paper-title')).toHaveText(firstPaperTitle || '');
  });

  test('should clear tag filters', async ({ page }) => {
    await page.waitForSelector('.paper-item', { timeout: 5000 });

    // Get initial paper count
    const initialCount = await page.locator('.paper-item').count();

    // Add and filter by a tag
    const tagName = 'clear-filter-test';
    const firstPaper = page.locator('.paper-item').first();
    await firstPaper.locator('.tag-edit-btn').click();
    await page.waitForSelector('.tag-editor-modal');
    await page.locator('.tag-editor-input').fill(tagName);
    await page.locator('.tag-editor-input').press('Enter');
    await page.locator('.btn-primary').click();
    await page.waitForTimeout(500);

    // Filter by the tag
    await firstPaper.locator('.paper-tags .tag').filter({ hasText: tagName }).click();
    await expect(page.locator('.active-tag-filters')).toBeVisible();

    // Clear filter
    await page.locator('.clear-filters-btn').click();

    // Filter bar should be gone and all papers should be visible
    await expect(page.locator('.active-tag-filters')).not.toBeVisible();
    await expect(page.locator('.paper-item')).toHaveCount(initialCount);
  });

  test('should enable bulk tagging when papers are selected', async ({ page }) => {
    await page.waitForSelector('.paper-item', { timeout: 5000 });

    // Clear any active filters first
    const clearBtn = page.locator('.clear-filters-btn');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForTimeout(300);
    }

    // Select multiple papers with Ctrl+Click
    const firstPaper = page.locator('.paper-item').first();
    const secondPaper = page.locator('.paper-item').nth(1);

    await firstPaper.click({ modifiers: ['Control'] });
    await secondPaper.click({ modifiers: ['Control'] });

    // Bulk actions bar should appear
    await expect(page.locator('.bulk-actions-bar')).toBeVisible();
    await expect(page.locator('.selection-count')).toContainText('2 selected');

    // Bulk Tag button should be visible
    await expect(page.locator('.bulk-actions-bar .btn').filter({ hasText: 'Bulk Tag' })).toBeVisible();
  });

  test('should bulk add tags to multiple papers', async ({ page }) => {
    await page.waitForSelector('.paper-item', { timeout: 5000 });

    // Clear any active filters first
    const clearBtn = page.locator('.clear-filters-btn');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForTimeout(300);
    }

    // Select two papers
    const firstPaper = page.locator('.paper-item').first();
    const secondPaper = page.locator('.paper-item').nth(1);

    await firstPaper.click({ modifiers: ['Control'] });
    await secondPaper.click({ modifiers: ['Control'] });

    // Click Bulk Tag button
    await page.locator('.bulk-actions-bar .btn').filter({ hasText: 'Bulk Tag' }).click();

    // Bulk tag editor should open
    await expect(page.locator('.bulk-tag-editor')).toBeVisible();
    await expect(page.locator('.modal-header h3')).toContainText('2 papers');

    // Add a tag
    const bulkTagName = 'bulk-tag-' + Date.now();
    await page.locator('.tag-editor-input').fill(bulkTagName);
    await page.locator('.tag-editor-input').press('Enter');

    // Should appear in "Tags to Add" section
    await expect(page.locator('.tag-add')).toContainText(bulkTagName);

    // Save
    await page.locator('.btn-primary').click();
    await page.waitForTimeout(1000); // Wait for API call

    // Both papers should have the tag
    await expect(firstPaper.locator('.paper-tags .tag').filter({ hasText: bulkTagName })).toBeVisible();
    await expect(secondPaper.locator('.paper-tags .tag').filter({ hasText: bulkTagName })).toBeVisible();

    // Selection should be cleared
    await expect(page.locator('.bulk-actions-bar')).not.toBeVisible();
  });

  test('should bulk remove tags from multiple papers', async ({ page }) => {
    await page.waitForSelector('.paper-item', { timeout: 5000 });

    // Clear any active filters first
    const clearBtn = page.locator('.clear-filters-btn');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForTimeout(300);
    }

    // First, add the same tag to two papers
    const sharedTag = 'bulk-remove-' + Date.now();
    const firstPaper = page.locator('.paper-item').first();
    const secondPaper = page.locator('.paper-item').nth(1);

    // Add to first paper
    await firstPaper.locator('.tag-edit-btn').click();
    await page.waitForSelector('.tag-editor-modal');
    await page.locator('.tag-editor-input').fill(sharedTag);
    await page.locator('.tag-editor-input').press('Enter');
    await page.locator('.btn-primary').click();
    await page.waitForTimeout(500);

    // Add to second paper
    await secondPaper.locator('.tag-edit-btn').click();
    await page.waitForSelector('.tag-editor-modal');
    await page.locator('.tag-editor-input').fill(sharedTag);
    await page.locator('.tag-editor-input').press('Enter');
    await page.locator('.btn-primary').click();
    await page.waitForTimeout(500);

    // Now bulk remove it
    await firstPaper.click({ modifiers: ['Control'] });
    await secondPaper.click({ modifiers: ['Control'] });
    await page.locator('.bulk-actions-bar .btn').filter({ hasText: 'Bulk Tag' }).click();

    // Switch to remove mode
    await page.locator('.mode-btn').filter({ hasText: 'Remove Tags' }).click();

    // Add tag to remove list
    await page.locator('.tag-editor-input').fill(sharedTag);
    await page.locator('.tag-editor-input').press('Enter');

    // Should appear in remove section
    await expect(page.locator('.tag-remove-item').filter({ hasText: sharedTag })).toBeVisible();

    // Save
    await page.locator('.btn-primary').click();
    await page.waitForTimeout(1000);

    // Tag should be removed from both papers
    await expect(firstPaper.locator('.paper-tags')).not.toContainText(sharedTag);
    await expect(secondPaper.locator('.paper-tags')).not.toContainText(sharedTag);
  });

  test('should show all tags in sidebar footer', async ({ page }) => {
    await page.waitForSelector('.paper-item', { timeout: 5000 });

    // Add a unique tag
    const uniqueTag = 'all-tags-test-' + Date.now();
    const firstPaper = page.locator('.paper-item').first();
    await firstPaper.locator('.tag-edit-btn').click();
    await page.waitForSelector('.tag-editor-modal');
    await page.locator('.tag-editor-input').fill(uniqueTag);
    await page.locator('.tag-editor-input').press('Enter');
    await page.locator('.btn-primary').click();
    await page.waitForTimeout(500);

    // Check that the tag appears in the "All Tags" section
    const allTagsSection = page.locator('.sidebar-all-tags');
    await expect(allTagsSection).toBeVisible();
    await expect(allTagsSection.locator('.tag').filter({ hasText: uniqueTag })).toBeVisible();
  });

  test('should close tag editor with Escape key', async ({ page }) => {
    await page.waitForSelector('.paper-item', { timeout: 5000 });

    // Open tag editor
    const firstPaper = page.locator('.paper-item').first();
    await firstPaper.locator('.tag-edit-btn').click();
    await page.waitForSelector('.tag-editor-modal');

    // Press Escape
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(page.locator('.tag-editor-modal')).not.toBeVisible();
  });

  test('should close tag editor by clicking backdrop', async ({ page }) => {
    await page.waitForSelector('.paper-item', { timeout: 5000 });

    // Open tag editor
    await page.locator('.paper-item').first().locator('.tag-edit-btn').click();
    await page.waitForSelector('.tag-editor-modal');

    // Click backdrop
    await page.locator('.modal-backdrop').click({ position: { x: 10, y: 10 } });

    // Modal should close
    await expect(page.locator('.tag-editor-modal')).not.toBeVisible();
  });
});
