const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PAGE_PADDING_MM = 13;
const CSS_PIXELS_PER_MM = 96 / 25.4;

type FormControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function copyFormState(source: ParentNode, target: ParentNode) {
  const sourceControls = source.querySelectorAll<FormControl>('input, textarea, select');
  const targetControls = target.querySelectorAll<FormControl>('input, textarea, select');

  sourceControls.forEach((sourceControl, index) => {
    const targetControl = targetControls[index];
    if (!targetControl) return;

    if (sourceControl instanceof HTMLInputElement && targetControl instanceof HTMLInputElement) {
      if (sourceControl.type === 'checkbox' || sourceControl.type === 'radio') {
        targetControl.checked = sourceControl.checked;
      } else if (sourceControl.type !== 'file') {
        targetControl.value = sourceControl.value;
      }
      return;
    }

    if (sourceControl instanceof HTMLTextAreaElement && targetControl instanceof HTMLTextAreaElement) {
      targetControl.value = sourceControl.value;
      return;
    }

    if (sourceControl instanceof HTMLSelectElement && targetControl instanceof HTMLSelectElement) {
      targetControl.value = sourceControl.value;
    }
  });
}

function materializePrintableControls(sheet: HTMLElement) {
  Array.from(sheet.querySelectorAll<FormControl>('input, textarea, select')).forEach((control) => {
    if (control instanceof HTMLInputElement && control.type === 'file') {
      control.remove();
      return;
    }

    if (control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')) {
      const mark = document.createElement('span');
      mark.className = 'quote-pdf-checkbox';
      mark.textContent = control.checked ? '✓' : '';
      mark.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;flex:0 0 14px;width:14px;height:14px;box-sizing:border-box;border:1px solid #56635a;border-radius:2px;color:#27352c;font:700 11px/1 Arial,sans-serif;vertical-align:middle;';
      control.replaceWith(mark);
      return;
    }

    const style = window.getComputedStyle(control);
    const printable = document.createElement(control instanceof HTMLTextAreaElement ? 'div' : 'span');
    printable.className = 'quote-pdf-value';
    printable.textContent = control instanceof HTMLInputElement
      ? control.value
      : control instanceof HTMLTextAreaElement
        ? control.value
        : control.selectedOptions[0]?.textContent || control.value;
    printable.style.cssText = [
      'display:block',
      `width:${style.width}`,
      `min-width:${style.minWidth}`,
      `max-width:${style.maxWidth}`,
      `min-height:${control instanceof HTMLTextAreaElement ? style.height : '0'}`,
      `height:${control instanceof HTMLTextAreaElement ? 'auto' : style.height}`,
      `box-sizing:${style.boxSizing}`,
      `padding:${style.padding}`,
      `margin:${style.margin}`,
      `font-family:${style.fontFamily}`,
      `font-size:${style.fontSize}`,
      `font-weight:${style.fontWeight}`,
      `line-height:${style.lineHeight}`,
      `letter-spacing:${style.letterSpacing}`,
      `color:${style.color}`,
      `text-align:${style.textAlign}`,
      `direction:${style.direction}`,
      `grid-column:${style.gridColumn}`,
      `border:${style.border}`,
      'background-color:transparent',
      'white-space:pre-wrap',
      'overflow-wrap:anywhere',
    ].join(';');
    control.replaceWith(printable);
  });
}

function preparePdfSheet(source: HTMLElement) {
  const sheet = source.cloneNode(true) as HTMLElement;
  sheet.classList.add('quote-pdf-page');
  sheet.style.cssText += `;width:${A4_WIDTH_MM}mm!important;height:${A4_HEIGHT_MM}mm!important;min-width:${A4_WIDTH_MM}mm!important;max-width:${A4_WIDTH_MM}mm!important;min-height:${A4_HEIGHT_MM}mm!important;max-height:${A4_HEIGHT_MM}mm!important;margin:0!important;padding:${PAGE_PADDING_MM}mm!important;box-sizing:border-box!important;overflow:hidden!important;box-shadow:none!important;`;

  const itemsWrap = sheet.querySelector<HTMLElement>('.quote-items-wrap');
  if (itemsWrap) {
    itemsWrap.style.cssText += ';width:100%!important;max-width:none!important;height:auto!important;max-height:none!important;overflow:visible!important;';
  }

  const table = sheet.querySelector<HTMLTableElement>('.quote-items-table');
  if (table) {
    table.style.cssText += ';width:100%!important;min-width:0!important;table-layout:fixed!important;border-collapse:collapse!important;';
  }

  sheet.querySelectorAll<HTMLElement>('button,.quote-logo-edit-hint,input[type="file"]').forEach((element) => {
    element.style.display = 'none';
  });
  return sheet;
}

function hideLastPageOnlyContent(sheet: HTMLElement) {
  [
    '.quote-below-table-grid',
    '.quote-notes-under-table',
    '.invoice-kind-panel',
    '.quote-signoff',
    '.quote-signature',
  ].forEach((selector) => {
    const element = sheet.querySelector<HTMLElement>(selector);
    if (element) element.style.display = 'none';
  });
}

export async function exportQuotePdf(source: HTMLElement, documentNumber: string) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `position:fixed;left:-20000px;top:0;width:${A4_WIDTH_MM}mm;z-index:-1;background:#fff;overflow:visible;`;
  document.body.appendChild(wrapper);

  try {
    const measureSheet = preparePdfSheet(source);
    copyFormState(source, measureSheet);
    wrapper.appendChild(measureSheet);
    materializePrintableControls(measureSheet);

    await (document.fonts?.ready || Promise.resolve());
    const images = Array.from(measureSheet.querySelectorAll('img'));
    await Promise.all(images.map((image) => (image as HTMLImageElement).decode().catch(() => undefined)));

    const table = measureSheet.querySelector<HTMLTableElement>('.quote-items-table');
    const tableBody = table?.tBodies[0];
    if (!table || !tableBody) return;

    const rows = Array.from(tableBody.rows);
    const rowHeights = rows.map((row) => row.getBoundingClientRect().height || 50);
    const sheetRect = measureSheet.getBoundingClientRect();
    const tableTop = table.getBoundingClientRect().top - sheetRect.top;
    const pageHeight = Math.round(A4_HEIGHT_MM * CSS_PIXELS_PER_MM);
    const pageBottom = pageHeight - PAGE_PADDING_MM * CSS_PIXELS_PER_MM;
    const tableHeaderHeight = table.tHead?.getBoundingClientRect().height || 0;
    const baseRowCapacity = pageBottom - tableTop - tableHeaderHeight;
    const footer = measureSheet.querySelector<HTMLElement>('.quote-sheet-footer');
    const footerReserve = footer && footer.offsetHeight > 0 ? footer.offsetHeight + 18 : 0;
    const rowCapacity = Math.max(0, baseRowCapacity - footerReserve);

    const bottomSelectors = [
      '.quote-below-table-grid',
      '.quote-notes-under-table',
      '.invoice-kind-panel',
      '.quote-signoff',
      '.quote-signature',
      '.quote-sheet-footer',
    ];
    const bottomStarts = bottomSelectors
      .map((selector) => measureSheet.querySelector<HTMLElement>(selector))
      .filter((element): element is HTMLElement => Boolean(element && element.offsetHeight > 0))
      .map((element) => element.getBoundingClientRect().top - sheetRect.top);
    const bottomReserve = bottomStarts.length
      ? Math.max(0, pageBottom - Math.min(...bottomStarts))
      : 0;
    const finalRowCapacity = Math.max(0, baseRowCapacity - bottomReserve);

    const pages: number[][] = [];
    let currentPage: number[] = [];
    let currentHeight = 0;
    rowHeights.forEach((height, index) => {
      if (currentPage.length && currentHeight + height > rowCapacity) {
        pages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
      }
      currentPage.push(index);
      currentHeight += height;
    });
    if (currentPage.length || pages.length === 0) pages.push(currentPage);

    while (pages.length > 0) {
      const lastPage = pages[pages.length - 1];
      let lastPageHeight = lastPage.reduce((sum, index) => sum + rowHeights[index], 0);
      if (lastPageHeight <= finalRowCapacity || lastPage.length <= 1) break;

      const carriedRows: number[] = [];
      while (lastPage.length > 1 && lastPageHeight > finalRowCapacity) {
        const movedIndex = lastPage.pop()!;
        carriedRows.unshift(movedIndex);
        lastPageHeight -= rowHeights[movedIndex];
      }
      if (carriedRows.length === 0) break;
      pages.push(carriedRows);
    }

    const pageSheets: HTMLElement[] = [];
    const measuredRows = Array.from(tableBody.rows);
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
      const page = preparePdfSheet(source);
      copyFormState(source, page);
      const pageBody = page.querySelector<HTMLTableElement>('.quote-items-table')?.tBodies[0];
      if (!pageBody) continue;

      const pageRows = pages[pageIndex].map((rowIndex) => {
        const row = measuredRows[rowIndex].cloneNode(true) as HTMLTableRowElement;
        copyFormState(measuredRows[rowIndex], row);
        return row;
      });
      pageBody.replaceChildren(...pageRows);

      wrapper.appendChild(page);
      if (pageIndex < pages.length - 1) hideLastPageOnlyContent(page);
      materializePrintableControls(page);
      pageSheets.push(page);
    }

    measureSheet.remove();

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pageWidth = Math.ceil(A4_WIDTH_MM * CSS_PIXELS_PER_MM);
    const pageHeightPx = Math.ceil(A4_HEIGHT_MM * CSS_PIXELS_PER_MM);

    for (let index = 0; index < pageSheets.length; index += 1) {
      const page = pageSheets[index];
      const canvas = await html2canvas(page, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: pageWidth,
        height: pageHeightPx,
        windowWidth: pageWidth,
        windowHeight: pageHeightPx,
        scrollX: 0,
        scrollY: 0,
      });
      if (index > 0) pdf.addPage('a4', 'portrait');
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'FAST');
    }

    const safeNumber = documentNumber.replace(/[\\/:*?"<>|]/g, '-').trim() || 'quote';
    pdf.save(`${safeNumber}.pdf`);
  } finally {
    wrapper.remove();
  }
}
