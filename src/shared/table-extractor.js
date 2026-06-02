(function registerTableExtractor(globalScope) {
  const DETAIL_SELECTORS = [
    '.modal.show',
    '.modal[style*="display: block"]',
    '.modal-content',
    '.modal-body',
    '[role="dialog"]',
    '.ui-dialog',
    '.ui-widget',
    '.popover',
    '.tooltip',
    '.bootbox',
    '.swal2-popup',
    '.k-window',
    '.fancybox-wrap',
    '.jconfirm-box',
    '.layui-layer',
    '[class*="modal"]',
    '[id*="modal"]',
    '[class*="popup"]',
    '[id*="popup"]',
    '[class*="dialog"]',
    '[id*="dialog"]',
    '[class*="layer"]',
    '[id*="layer"]',
    '[class*="window"]',
    '[id*="window"]'
  ];

  const CLOSE_SELECTORS = [
    '[data-bs-dismiss="modal"]',
    '[data-dismiss="modal"]',
    '.modal .btn-close',
    '.modal .close',
    'button.close',
    '.swal2-close'
  ];

  const INTERACTIVE_SELECTOR = 'a, button, [role="button"], [onclick]';
  const DETAIL_TRIGGER_SELECTOR = 'button, [role="button"], [onclick], a[href="#"], a[href^="javascript:"]';
  const GROUP_HEADER_PATTERN = /(^|\W)(nhom|th|bt)(\W|$)|thuc hanh|bai tap/i;
  const DETAIL_TEXT_PATTERN = /(^|\W)(ma|mon|lop|nhom|lich|phong|si so|da dk|th|bt)(\W|$)|thuc hanh|bai tap/i;
  const MAX_DETAIL_TEXT_LENGTH = 5000;
  const META_ATTRIBUTES = [
    'title',
    'aria-label',
    'data-original-title',
    'data-bs-original-title',
    'data-title',
    'data-content',
    'data-bs-content'
  ];

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeForSearch(value) {
    return normalizeText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function getElementText(element) {
    return normalizeText(element.innerText || element.textContent || '');
  }

  function isElementVisible(element) {
    const styles = window.getComputedStyle(element);
    return styles.display !== 'none'
      && styles.visibility !== 'hidden'
      && element.getClientRects().length > 0;
  }

  function getHeaders(table) {
    const headerRow = table.querySelector('tr');
    if (!headerRow) {
      return [];
    }

    const headerCells = headerRow.querySelectorAll('th');
    const cells = headerCells.length ? headerCells : headerRow.querySelectorAll('td');
    return Array.from(cells).map(getElementText);
  }

  function getDataRows(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    return rows.slice(1).filter((row) => row.querySelectorAll('td').length > 0);
  }

  function isMeaningfulHref(href) {
    if (!href) {
      return false;
    }

    const normalizedHref = href.trim().toLowerCase();
    return !normalizedHref.startsWith('javascript:') && normalizedHref !== '#';
  }

  function addUnique(values, value) {
    const text = normalizeText(value);
    if (text && !values.includes(text)) {
      values.push(text);
    }
  }

  function formatAttributeName(attributeName) {
    return attributeName.replace(/^data-(bs-)?/, '').replace(/-/g, ' ');
  }

  function getElementMetadata(element) {
    const details = [];

    META_ATTRIBUTES.forEach((attributeName) => {
      const value = element.getAttribute(attributeName);
      if (value) {
        addUnique(details, `${formatAttributeName(attributeName)}: ${value}`);
      }
    });

    Array.from(element.attributes || []).forEach((attribute) => {
      if (!attribute.name.startsWith('data-') || META_ATTRIBUTES.includes(attribute.name)) {
        return;
      }

      addUnique(details, `${formatAttributeName(attribute.name)}: ${attribute.value}`);
    });

    if (element.tagName === 'A' && isMeaningfulHref(element.href)) {
      addUnique(details, `link: ${element.href}`);
    }

    const onclick = element.getAttribute('onclick');
    if (onclick) {
      addUnique(details, `action: ${onclick}`);
    }

    return details;
  }

  function getCellMetadata(cell) {
    const details = getElementMetadata(cell);
    const interactiveElements = Array.from(cell.querySelectorAll(INTERACTIVE_SELECTOR));

    interactiveElements.forEach((element) => {
      getElementMetadata(element).forEach((detail) => addUnique(details, detail));
    });

    return details;
  }

  function getVisibleDetailElements() {
    return DETAIL_SELECTORS.flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .filter((element) => {
        return isElementVisible(element) && getElementText(element);
      });
  }

  function getVisibleDetailSnapshot() {
    return new Map(getVisibleDetailElements().map((element) => [element, getElementText(element)]));
  }

  function getVisibleTextSnapshot() {
    return new Map(Array.from(document.querySelectorAll('body *'))
      .filter((element) => isElementVisible(element) && getElementText(element))
      .map((element) => [element, getElementText(element)]));
  }

  function getElementsFromMutation(mutation) {
    const elements = [];

    if (mutation.target.nodeType === Node.ELEMENT_NODE) {
      elements.push(mutation.target);
    } else if (mutation.target.parentElement) {
      elements.push(mutation.target.parentElement);
    }

    mutation.addedNodes.forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      elements.push(node);
      elements.push(...node.querySelectorAll('*'));
    });

    return elements;
  }

  function createDomChangeCollector() {
    const changedElements = new Set();
    let lastChangeAt = 0;

    const observer = new MutationObserver((mutations) => {
      lastChangeAt = Date.now();

      mutations.forEach((mutation) => {
        getElementsFromMutation(mutation).forEach((element) => changedElements.add(element));
      });
    });

    observer.observe(document.body, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true
    });

    return {
      changedElements,
      disconnect: () => observer.disconnect(),
      getLastChangeAt: () => lastChangeAt
    };
  }

  function isUsefulDetailText(text, triggerText) {
    if (!text || text === triggerText || text.length > MAX_DETAIL_TEXT_LENGTH) {
      return false;
    }

    const searchableText = normalizeForSearch(text);
    return text.length > triggerText.length && DETAIL_TEXT_PATTERN.test(searchableText);
  }

  function getChangedDetailText(previousSnapshot, changedElements, triggerText) {
    const candidates = Array.from(changedElements)
      .filter((element) => element.isConnected && isElementVisible(element))
      .map((element) => getElementText(element))
      .filter((text) => {
        if (!isUsefulDetailText(text, triggerText)) {
          return false;
        }

        return !Array.from(previousSnapshot.values()).includes(text);
      });

    return candidates.sort((left, right) => left.length - right.length)[0] || '';
  }

  async function waitForNewDetailText(previousDetailSnapshot, domChanges, previousTextSnapshot, triggerText, timeoutMs = 3500) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const detailElement = getVisibleDetailElements().find((element) => {
        const currentText = getElementText(element);
        const previousText = previousDetailSnapshot.get(element);

        return currentText
          && currentText !== previousText
          && isUsefulDetailText(currentText, triggerText);
      });

      if (detailElement) {
        return getElementText(detailElement);
      }

      const changedText = getChangedDetailText(
        previousTextSnapshot,
        domChanges.changedElements,
        triggerText
      );

      if (changedText) {
        return changedText;
      }

      if (!domChanges.getLastChangeAt() && Date.now() - startTime > 900) {
        return '';
      }

      await delay(120);
    }

    return '';
  }

  function closeOpenDetails() {
    const closeButton = CLOSE_SELECTORS
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .find((element) => element.getClientRects().length > 0);

    if (closeButton) {
      closeButton.click();
      return;
    }

    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      bubbles: true,
      cancelable: true
    }));
  }

  function isGroupHeader(header) {
    return GROUP_HEADER_PATTERN.test(normalizeForSearch(header));
  }

  function shouldEnrichCell(cell, header) {
    const text = getElementText(cell);
    return /^\d+$/.test(text)
      && isGroupHeader(header)
      && Boolean(findDetailTrigger(cell));
  }

  function findDetailTrigger(cell) {
    if (cell.matches(DETAIL_TRIGGER_SELECTOR)) {
      return cell;
    }

    return cell.querySelector(DETAIL_TRIGGER_SELECTOR);
  }

  async function getInteractiveDetails(cell) {
    const trigger = findDetailTrigger(cell);
    if (!trigger) {
      return '';
    }

    const triggerText = getElementText(cell);
    const previousDetailSnapshot = getVisibleDetailSnapshot();
    const previousTextSnapshot = getVisibleTextSnapshot();
    const domChanges = createDomChangeCollector();
    trigger.click();

    const detailText = await waitForNewDetailText(
      previousDetailSnapshot,
      domChanges,
      previousTextSnapshot,
      triggerText
    );
    domChanges.disconnect();
    closeOpenDetails();
    await delay(120);

    return detailText;
  }

  async function extractGroupCellValue(cell, header, options) {
    const visibleText = getElementText(cell);
    if (!visibleText) {
      return '';
    }

    if (!options.enrichInteractiveCells || !shouldEnrichCell(cell, header)) {
      return visibleText;
    }

    const detailText = await getInteractiveDetails(cell);
    if (!detailText || detailText === visibleText) {
      return visibleText;
    }

    return `${visibleText} | ${detailText}`;
  }

  async function extractCellValue(cell, header, options) {
    if (isGroupHeader(header)) {
      return extractGroupCellValue(cell, header, options);
    }

    const visibleText = getElementText(cell);
    const details = getCellMetadata(cell);

    if (options.enrichInteractiveCells && shouldEnrichCell(cell, header)) {
      const interactiveDetails = await getInteractiveDetails(cell);
      addUnique(details, interactiveDetails);
    }

    if (!details.length) {
      return visibleText;
    }

    return [visibleText, ...details.filter((detail) => detail !== visibleText)].join(' | ');
  }

  async function extractRow(row, headers, options) {
    const cells = Array.from(row.querySelectorAll('td'));
    const values = [];
    const item = {};

    for (let index = 0; index < cells.length; index += 1) {
      const header = headers[index] || `Column ${index + 1}`;
      const value = await extractCellValue(cells[index], header, options);

      values.push(value);
      item[header] = value;
    }

    return { item, values };
  }

  async function extractFirstTable(options = {}) {
    const table = document.querySelector('table');
    if (!table) {
      return {
        success: false,
        message: 'No tables found on this page'
      };
    }

    const headers = getHeaders(table);
    const dataRows = getDataRows(table);
    const data = [];
    const rows = [];

    for (const row of dataRows) {
      const extractedRow = await extractRow(row, headers, {
        enrichInteractiveCells: true,
        ...options
      });

      data.push(extractedRow.item);
      rows.push(extractedRow.values);
    }

    return {
      success: true,
      headers,
      data,
      rows
    };
  }

  globalScope.SubjectTableExtractor = {
    extractFirstTable
  };
})(globalThis);
