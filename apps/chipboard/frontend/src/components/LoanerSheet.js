import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { API_BASE_URL } from '../config';
import './LoanerSheet.css';
// While the loaner service runs standalone (before the bopchipboard merge),
// point these pages at it with REACT_APP_LOANER_API_BASE_URL; once merged,
// leave that unset and the chipboard API base is used.
const LOANER_API = process.env.REACT_APP_LOANER_API_BASE_URL || API_BASE_URL;

// The latest loaner payment sheet. The sheet HTML comes fully rendered from
// the backend (same document that can be pasted into an email); it is shown
// in a sandboxed iframe so its own sorting/brand-filter script can run
// without touching the app's DOM or styles.
function LoanerSheet() {
  const { auth } = useAuth();
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noSheet, setNoSheet] = useState(false);
  const [filterTerm, setFilterTerm] = useState('');
  const filterTermRef = useRef('');
  const iframeRef = useRef(null);

  const userRole = auth?.user?.role || auth?.user?.role_name;
  const isAdmin = userRole === 'Admin';
  const isSalesperson = userRole === 'Salesperson';
  const canManageLoaners = ['Admin', 'Manager'].includes(userRole);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await axios.get(`${LOANER_API}/loaner-pricing/sheet`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        if (!cancelled) setSheet(response.data);
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 404) {
          setNoSheet(true);
        } else {
          setError(err.response?.data?.message || 'Failed to load the loaner sheet');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [auth.token]);

  const applyPrimaryTableFilter = useCallback((term = filterTermRef.current) => {
    const doc = iframeRef.current?.contentDocument;
    const table = doc?.querySelector('table.sortable');
    const body = table?.tBodies?.[0];
    if (!body) return;

    const query = term.trim().toLocaleLowerCase();
    const activeBrand = iframeRef.current?.dataset.activeBrand || 'ALL';
    let visibleIndex = 0;

    Array.from(body.rows).forEach((row) => {
      const brandMatches = activeBrand === 'ALL' || row.dataset.brand === activeBrand;
      const textMatches = !query || row.textContent.toLocaleLowerCase().includes(query);
      const visible = brandMatches && textMatches;
      row.style.display = visible ? '' : 'none';
      if (visible) {
        row.style.background = visibleIndex % 2 ? '#f8fafc' : '#ffffff';
        visibleIndex += 1;
      }
    });
  }, []);

  const resizeIframe = useCallback(() => {
    const frame = iframeRef.current;
    if (frame?.contentDocument?.body) {
      frame.style.height = `${frame.contentDocument.body.scrollHeight + 40}px`;
    }
  }, []);

  const prepareIframe = useCallback(() => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!doc) return;

    frame.dataset.activeBrand = 'ALL';

    const primaryTable = doc.querySelector('table.sortable');
    let supplementalSection = primaryTable?.nextElementSibling;
    while (supplementalSection) {
      supplementalSection.classList.add('loaner-supplemental-section');
      if (isSalesperson) {
        supplementalSection.style.display = 'none';
      }
      supplementalSection = supplementalSection.nextElementSibling;
    }

    doc.querySelectorAll('#brand-filter button[data-brand]').forEach((button) => {
      button.addEventListener('click', () => {
        frame.dataset.activeBrand = button.dataset.brand || 'ALL';
        window.setTimeout(() => {
          applyPrimaryTableFilter();
          resizeIframe();
        }, 0);
      });
    });

    const printStyles = doc.createElement('style');
    printStyles.textContent = `
      @media print {
        #brand-filter, .sort-hint, .loaner-supplemental-section { display: none !important; }
        body { margin: 0; }
        table.sortable { break-inside: auto; }
        table.sortable tr { break-inside: avoid; }
      }
    `;
    doc.head?.appendChild(printStyles);

    applyPrimaryTableFilter();
    resizeIframe();
  }, [applyPrimaryTableFilter, isSalesperson, resizeIframe]);

  useEffect(() => {
    filterTermRef.current = filterTerm;
    applyPrimaryTableFilter(filterTerm);
    resizeIframe();
  }, [applyPrimaryTableFilter, filterTerm, resizeIframe]);

  const handlePrint = () => {
    const printWindow = iframeRef.current?.contentWindow;
    if (!printWindow) return;
    printWindow.focus();
    printWindow.print();
  };

  const handleInventoryManagerReport = async () => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;
    reportWindow.document.write('<p style="font-family:Arial,Helvetica,sans-serif;">Loading Inventory Manager report...</p>');
    try {
      const response = await axios.get(`${LOANER_API}/loaner-pricing/inventory-manager-report`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      reportWindow.document.open();
      reportWindow.document.write(response.data.html);
      reportWindow.document.close();
    } catch (err) {
      reportWindow.document.open();
      reportWindow.document.write('<p style="font-family:Arial,Helvetica,sans-serif;color:#991b1b;">Failed to load the Inventory Manager report.</p>');
      reportWindow.document.close();
      setError(err.response?.data?.message || 'Failed to load the Inventory Manager report');
    }
  };

  if (loading) {
    return <div className="loaner-sheet-loading">Loading loaner sheet...</div>;
  }

  if (noSheet) {
    return (
      <div className="loaner-sheet-empty">
        <h2>No loaner sheet yet</h2>
        <p>{canManageLoaners
          ? 'Upload the daily inventory and vAuto exports to generate the first one.'
          : 'Please check back after a manager uploads the daily data.'}</p>
        {canManageLoaners && <Link className="loaner-btn" to="/loaners/upload">Upload data</Link>}
      </div>
    );
  }

  if (error) {
    return <div className="loaner-sheet-error">{error}</div>;
  }

  const { meta, staleRates, html } = sheet;

  return (
    <div className="loaner-sheet-page">
      <div className="loaner-sheet-toolbar">
        <div className="loaner-sheet-status">
          <span>
            <b>Data last uploaded:</b>{' '}
            {format(new Date(meta.generatedAt), "EEEE, MMMM d 'at' h:mm a")}
            {meta.generatedBy ? ` by ${meta.generatedBy}` : ''}
          </span>
          <span className="loaner-sheet-counts">
            {meta.priced} priced
            {!isSalesperson && meta.attention ? ` | ${meta.attention} need attention` : ''}
            {!isSalesperson && meta.mileageUpdates ? ` | ${meta.mileageUpdates} mileage updates` : ''}
            {!isSalesperson && meta.inventoryManagerChangeCount ? ` | ${meta.inventoryManagerChangeCount} changed` : ''}
          </span>
          {staleRates && (
            <div className="loaner-sheet-stale">
              Warning: rates changed after this sheet was generated; upload fresh data to reprice.
            </div>
          )}
        </div>
        <div className="loaner-sheet-actions">
          <label className="loaner-sheet-filter">
            <span className="visually-hidden">Filter loaners</span>
            <input
              type="search"
              value={filterTerm}
              onChange={(event) => {
                filterTermRef.current = event.target.value;
                setFilterTerm(event.target.value);
              }}
              placeholder="Filter this table…"
              aria-label="Filter loaners in the first table"
            />
          </label>
          <button className="loaner-btn loaner-btn-secondary" type="button" onClick={handlePrint}>
            Print / Save PDF
          </button>
          {canManageLoaners && (
            <button className="loaner-btn loaner-btn-secondary" type="button" onClick={handleInventoryManagerReport}>
              Inventory Manager report
            </button>
          )}
          {canManageLoaners && (
            <Link className="loaner-btn" to="/loaners/upload">Upload new data</Link>
          )}
          {isAdmin && (
            <Link className="loaner-btn loaner-btn-secondary" to="/loaners/settings">
              Settings
            </Link>
          )}
        </div>
      </div>
      <iframe
        ref={iframeRef}
        className="loaner-sheet-frame"
        title="Loaner Payment Sheet"
        sandbox="allow-scripts allow-same-origin allow-modals"
        srcDoc={html}
        onLoad={prepareIframe}
      />
    </div>
  );
}

export default LoanerSheet;
