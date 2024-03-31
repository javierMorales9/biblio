'use client';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import { useEffect, useRef, useState } from 'react';
import { VariableSizeList } from "react-window";
import { pdfjs, Document, Page } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

export default function PdfReader() {
  const [loading, setLoading] = useState<boolean>(true);
  const [outline, setOutline] = useState<any>();
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const container = useRef<HTMLDivElement>(null);
  const pageSelector = useRef<HTMLInputElement>(null);

  async function onDocumentLoadSuccess(props: any) {
    const outline = (await props.getOutline()).map((item: any) => ({
      title: item.title,
      dest: item.dest,
      url: item.url,
      action: item.action,
      count: item.count
    }));
    setOutline(outline);
    setLoading(false);
    setNumPages(props.numPages);
    if (pageSelector.current) {
      pageSelector.current.value = currentPage.toString();
    }
  }

  function onScroll(el: any) {
    if (loading || !numPages) return;

    const page = Math.round((el.target.scrollTop / el.target.scrollHeight) * numPages) + 1;
    updatePageSelector(page);
  }

  function goToPage(page: number) {
    updatePageSelector(page);
    scrollToPage(page);
  }

  function updatePageSelector(page: number) {
    if (page === currentPage || page < 1 || page > numPages) return;
    setCurrentPage(page);
    pageSelector.current!.value = page.toString();
  }

  function scrollToPage(page: number) {
    container.current!.scrollTop = (page - 1) * (container.current!.scrollHeight / numPages);
  }

  return (
    <Document
      file="pdfs/test.pdf"
      onLoadSuccess={onDocumentLoadSuccess}
    >
      <div
        ref={container}
        onScroll={onScroll}
        className="max-h-screen overflow-y-scroll"
      >
        <div className="sticky top-0 z-[10000000] w-full flex justify-center p-4 bg-white border border-gray-400 mb-2">
          <p className="">
            <input
              type="number"
              className="border border-gray-400 w-16 outline-none text-center remove-arrow"
              ref={pageSelector}
              onChange={e => goToPage(parseInt(e.target.value))}
            />
            / {numPages}
          </p>
        </div>
        {Array(numPages).fill(0).map((_, i) => (
          <Page
            className="border border-gray-400 my-2"
            key={`page_${i + 1}`}
            pageNumber={i + 1}
          />
        ))}
      </div>
    </Document >
  );
}
