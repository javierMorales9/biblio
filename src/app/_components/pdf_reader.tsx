'use client';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import { useEffect, useRef, useState } from 'react';
import { VariableSizeList } from "react-window";
import { pdfjs, Document, Page } from 'react-pdf';
import { debounce } from 'throttle-debounce';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

const scale = 1.2;
export default function PdfReader() {
  const [responsiveScale, setResponsiveScale] = useState<number>(1);
  const [pdf, setPdf] = useState<any>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  //The map we want to use is pages. But, since it is a weak map we can't check
  //if a key exists in it. So we use pageNumbers to store that data (it is a map
  //because we want fast checks).
  const [pages, setPages] = useState<WeakMap<{ pageNumber: number }, HTMLElement>>(new WeakMap());
  const [pageNumbers, setPageNumbers] = useState<Map<number, { pageNumber: number }>>(new Map());

  const list = useRef<VariableSizeList>(null);

  const [cachedPageDimensions, setCachedPageDimensions] = useState<Map<number, [number, number]>>(new Map());
  const [outline, setOutline] = useState<any>();
  const [currentPage, setCurrentPage] = useState<number>(1);

  const pageSelector = useRef<HTMLInputElement>(null);

  const callResizeHandler = debounce(50, handleResize);
  const callOrientationChangeHandler = debounce(1000, handleResize);

  useEffect(() => {
    window.addEventListener('resize', callResizeHandler);
    window.addEventListener('orientationchange', callOrientationChangeHandler);

    return () => {
      window.removeEventListener('resize', callResizeHandler);
      window.removeEventListener('orientationchange', callOrientationChangeHandler);
    };
  }, []);

  useEffect(() => {
    recomputeRowHeights();
  }, [responsiveScale]);

  function changePageDimensions(pdf: any) {
    const promises = Array.from({ length: pdf.numPages }, (v, i) => i + 1).map((pageNumber) => {
      return pdf.getPage(pageNumber);
    });

    Promise.all(promises).then((pages) => {
      const pageDimensions = new Map();

      for (const page of pages) {
        const w = page.view[2] * scale;
        const h = page.view[3] * scale;

        pageDimensions.set(page._pageIndex + 1, [w, h]);
      }

      setCachedPageDimensions(pageDimensions);
    });
  }

  function recomputeRowHeights() {
    if (list.current) {
      list.current.resetAfterIndex(0);
    }
  }

  function computeRowHeight(index: number) {
    if (cachedPageDimensions && responsiveScale) {
      const dim = cachedPageDimensions.get(index + 1) || [0, 0];
      return dim[1] / responsiveScale;
    }

    return 768;
  }

  async function onDocumentLoadSuccess(pdf: any) {
    setPdf(pdf);
    changePageDimensions(pdf);
    const outline = (await pdf.getOutline()).map((item: any) => ({
      title: item.title,
      dest: item.dest,
      url: item.url,
      action: item.action,
      count: item.count
    }));
    setOutline(outline);
    if (pageSelector.current) {
      pageSelector.current.value = currentPage.toString();
    }
  }

  function updateVisiblePage({ visibleStopIndex }: { visibleStopIndex: number }) {
    const page = visibleStopIndex + 1;
    setCurrentPage(page);
    if (pageSelector.current) {
      pageSelector.current.value = page.toString();
    }
  }

  function computeResponsiveScale(pageNumber: number) {
    const key = pageNumbers.get(pageNumber);
    const node = key && pages.get(key);

    if (!node) return;

    const dim = cachedPageDimensions.get(pageNumber) || [0, 0];
    return dim[1] / node.clientHeight;
  }

  function handleResize() {
    const newResponsiveScale = computeResponsiveScale(currentPage);
    if (newResponsiveScale && responsiveScale !== newResponsiveScale) {
      setResponsiveScale(newResponsiveScale);
    }

    setContainerHeight(window.innerHeight);
  }

  function handleClick(index: number) {
    list.current?.scrollToItem(index);
  }

  return (
    <Document
      file="pdfs/test.pdf"
      onLoadSuccess={onDocumentLoadSuccess}
    >
      <div className="max-h-screen overflow-y-scroll">
        <div className="sticky top-0 z-[10000000] w-full flex justify-center p-4 bg-white border border-gray-400 mb-2">
          <p className="">
            <input
              type="number"
              className="border border-gray-400 w-16 outline-none text-center remove-arrow"
              ref={pageSelector}
              onChange={e => handleClick(parseInt(e.target.value) - 1)}
            />
            / {pdf?.numPages || 0}
          </p>
        </div>
        <VariableSizeList
          ref={list}
          height={containerHeight}
          itemCount={pdf?.numPages || 0}
          itemSize={computeRowHeight}
          itemData={{
            scale,
            pages,
            pageNumbers,
            numPages: pdf?.numPages || 0,
            triggerResize: handleResize,
          }}
          overscanCount={2}
          onItemsRendered={updateVisiblePage}
        >
          {PageRenderer}
        </VariableSizeList>
      </div>
    </Document >
  );
}

function PageRenderer({ index, style, data }: {
  index: number,
  style: React.CSSProperties,
  data: {
    scale: number,
    pages: WeakMap<{ pageNumber: number }, HTMLElement>,
    pageNumbers: Map<number, { pageNumber: number }>,
    numPages: number,
    triggerResize: () => void,
  }
  width: number,
}) {
  return (
    <div style={style}>
      <div
        ref={(ref) => {
          if (!ref) return;

          if (!data.pageNumbers.has(index + 1)) {
            data.pageNumbers.set(index + 1, { pageNumber: index + 1 });
          }

          data.pages.set(data.pageNumbers.get(index + 1)!, ref);
        }}
      >
        <Page
          pageNumber={index + 1}
          //scale={data.scale}
          onLoadError={(error) => console.error(error)}
          onLoadSuccess={(page) => {
            if (page.pageNumber === data.numPages) {
              data.triggerResize();
            }
          }}
        />
      </div>
    </div>
  );
}
