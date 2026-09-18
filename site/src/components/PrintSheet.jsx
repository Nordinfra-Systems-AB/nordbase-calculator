import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

// ---------------------------------------------------------------------------
// 2D print sheet for Configurator3D — ported 2026-09-18 from the standalone
// prototype's "Print 2D drawing (PDF)" button
// (https://claude.ai/artifact/FuUJrPAo8FEkDPPsDCHnGs). Same drafting-style
// ISO-zoned sheet, same real measured dimensions/geometry, same title block
// fields — the only thing that changed is the hosting: this renders into a
// portal appended at the end of <body> (outside the React app root) so a
// print triggered from anywhere on the page shows just the sheet, driven by
// a `body.printing-foundation` class (see index.css) rather than the
// prototype's hand-picked element list (it only had one page to hide).
//
// `data` is null until Configurator3D's print handler has captured the
// three orthographic views and computed the title-block fields — this
// renders nothing until then, and the portal container itself starts empty
// so an ordinary Ctrl+P on any other page is unaffected.
// ---------------------------------------------------------------------------

function DimStrip({ orientation, label }) {
  // VIEW_PAD = 1.18 in Configurator3D.jsx's captureOrthoView — the object
  // fills 1/1.18 of the frame, centered, so the margin on each side is
  // (1 - 1/1.18) / 2. Kept in sync with that constant rather than
  // duplicated as a magic number — see the comment there.
  const VIEW_PAD = 1.18;
  const marginPct = ((1 - 1 / VIEW_PAD) / 2) * 100;
  const a = marginPct.toFixed(2) + "%";
  const b = (100 - marginPct).toFixed(2) + "%";

  if (orientation === "h") {
    return (
      <>
        <span className="ps-dim-ext" style={{ left: a }} />
        <span className="ps-dim-ext" style={{ left: b }} />
        <span className="ps-dim-line" style={{ left: a, right: `calc(100% - ${b})` }} />
        <span className="ps-dim-arrow left" style={{ left: a }} />
        <span className="ps-dim-arrow right" style={{ left: `calc(${b} - 6px)` }} />
        <span className="ps-dim-label h">{label}</span>
      </>
    );
  }
  return (
    <>
      <span className="ps-dim-ext" style={{ top: a }} />
      <span className="ps-dim-ext" style={{ top: b }} />
      <span className="ps-dim-line" style={{ top: a, bottom: `calc(100% - ${b})` }} />
      <span className="ps-dim-arrow top" style={{ top: a }} />
      <span className="ps-dim-arrow bottom" style={{ top: `calc(${b} - 6px)` }} />
      <span className="ps-dim-label v">{label}</span>
    </>
  );
}

function DraftingZones() {
  // Purely decorative ISO-style zoned border (1-8 across top/bottom, A-F
  // down the sides) — doesn't depend on any configuration data.
  const cols = [1, 2, 3, 4, 5, 6, 7, 8];
  const rows = ["A", "B", "C", "D", "E", "F"];
  return (
    <>
      <div className="ps-zoneband ps-zoneband-top">
        {cols.map((c, i) => (
          <span key={c} className="ps-zone-label" style={{ left: `${((i + 0.5) / cols.length) * 100}%` }}>
            {c}
          </span>
        ))}
      </div>
      <div className="ps-zoneband ps-zoneband-bottom">
        {cols.map((c, i) => (
          <span key={c} className="ps-zone-label" style={{ left: `${((i + 0.5) / cols.length) * 100}%` }}>
            {c}
          </span>
        ))}
      </div>
      <div className="ps-zoneband ps-zoneband-left">
        {rows.map((r, i) => (
          <span key={r} className="ps-zone-label" style={{ top: `${((i + 0.5) / rows.length) * 100}%` }}>
            {r}
          </span>
        ))}
      </div>
      <div className="ps-zoneband ps-zoneband-right">
        {rows.map((r, i) => (
          <span key={r} className="ps-zone-label" style={{ top: `${((i + 0.5) / rows.length) * 100}%` }}>
            {r}
          </span>
        ))}
      </div>
    </>
  );
}

export default function PrintSheet({ data }) {
  const [container] = useState(() => {
    const el = document.createElement("div");
    el.id = "print-sheet-root";
    return el;
  });

  useEffect(() => {
    document.body.appendChild(container);
    return () => {
      if (container.parentNode === document.body) document.body.removeChild(container);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) return ReactDOM.createPortal(null, container);

  const { title, parts, size, views, todayISO } = data;

  return ReactDOM.createPortal(
    <div className="ps-sheet">
      <DraftingZones />

      <div className="ps-inner">
        <div className="ps-header">
          <div className="ps-header-top">
            <img className="ps-header-logo" src="/logo/logo-icon-dark.png" alt="" />
            <div className="ps-eyebrow">Nordinfra — NordBase</div>
          </div>
          <h1>{title}</h1>
          <div className="ps-sub">{parts}</div>
        </div>

        <div className="ps-overall">
          Overall envelope: Width {size.wLabel} &nbsp;×&nbsp; Depth {size.dLabel} &nbsp;×&nbsp; Height {size.hLabel}
        </div>

        <div className="ps-views">
          <div className="ps-view">
            <h3>Front view</h3>
            <div className="ps-view-grid">
              <div className="ps-view-hdim">
                <DimStrip orientation="h" label={size.wLabel} />
              </div>
              <div className="ps-view-img-wrap">
                <img src={views.front} alt="Front view" />
              </div>
              <div className="ps-view-vdim">
                <DimStrip orientation="v" label={size.hLabel} />
              </div>
            </div>
          </div>
          <div className="ps-view">
            <h3>Top view</h3>
            <div className="ps-view-grid">
              <div className="ps-view-hdim">
                <DimStrip orientation="h" label={size.wLabel} />
              </div>
              <div className="ps-view-img-wrap">
                <img src={views.top} alt="Top view" />
              </div>
              <div className="ps-view-vdim">
                <DimStrip orientation="v" label={size.dLabel} />
              </div>
            </div>
          </div>
          <div className="ps-view">
            <h3>Side view</h3>
            <div className="ps-view-grid">
              <div className="ps-view-hdim">
                <DimStrip orientation="h" label={size.dLabel} />
              </div>
              <div className="ps-view-img-wrap">
                <img src={views.side} alt="Side view" />
              </div>
              <div className="ps-view-vdim">
                <DimStrip orientation="v" label={size.hLabel} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="ps-footerband">
        <div className="ps-footer-brand">
          <img className="ps-footer-logo" src="/logo/logo-icon-dark.png" alt="" />
          <img className="ps-footer-wordmark" src="/logo/logo-wordmark-dark.png" alt="" />
          <div className="ps-footer-tagline">Practical. Proven. Progressive.</div>
        </div>
        <div className="ps-footer-notes">
          <div className="ps-footer-notes-label">General notes</div>
          <div className="ps-footer">
            Nordinfra — NordBase 3D Configurator — dimensions measured from real STEP-derived CAD geometry, in inches. Holes shown are real
            geometry; no hole schedule (size/spacing) is called out numerically, as that data is not separately confirmed. Not for
            construction — reference only.
          </div>
          <div className="ps-footer-scale">Drawing not to scale (NTS).</div>
        </div>
      </div>

      <div className="ps-titleblock">
        <div className="tb-cell" style={{ "--area": "dept" }}>
          <div className="tb-label">Dept.</div>
          <div className="tb-value">USA</div>
        </div>
        <div className="tb-cell" style={{ "--area": "techref" }}>
          <div className="tb-label">Technical reference</div>
        </div>
        <div className="tb-cell" style={{ "--area": "createdby" }}>
          <div className="tb-label">Created by</div>
          <div className="tb-value">Nordinfra Systems AB</div>
        </div>
        <div className="tb-cell" style={{ "--area": "approvedby" }}>
          <div className="tb-label">Approved by</div>
          <div className="tb-value" />
        </div>
        <div className="tb-cell" style={{ "--area": "doctype" }}>
          <div className="tb-label">Document type</div>
          <div className="tb-value">Reference drawing</div>
        </div>
        <div className="tb-cell" style={{ "--area": "docstatus" }}>
          <div className="tb-label">Document status</div>
          <div className="tb-value">Not for construction</div>
        </div>
        <div className="tb-cell" style={{ "--area": "title" }}>
          <div className="tb-label">Title</div>
          <div className="tb-value" id="tb-title">
            {title}
          </div>
        </div>
        <div className="tb-cell" style={{ "--area": "dwgno" }}>
          <div className="tb-label">DWG No.</div>
          <div className="tb-value">{parts || "—"}</div>
        </div>
        <div className="tb-cell" style={{ "--area": "rev" }}>
          <div className="tb-label">Rev</div>
          <div className="tb-value">-</div>
        </div>
        <div className="tb-cell" style={{ "--area": "dateissue" }}>
          <div className="tb-label">Date of issue</div>
          <div className="tb-value">{todayISO}</div>
        </div>
        <div className="tb-cell" style={{ "--area": "sheet" }}>
          <div className="tb-label">Sheet</div>
          <div className="tb-value">1/1</div>
        </div>
      </div>
    </div>,
    container
  );
}
