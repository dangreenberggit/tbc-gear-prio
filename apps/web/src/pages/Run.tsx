/**
 * `/run/$id` — the wait, then the answer (PLAN.md §12).
 *
 * The rules this page exists to keep: the list area is a fixed height from
 * page load; skeletons appear once the candidate count is known; rows fill in
 * arrival order and never re-sort during the run; completion is exactly one
 * animated re-sort; and every view control recomputes `applyView` here in the
 * browser with no request.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RankedItem } from "@tbc-gear-prio/core";
import { applyView } from "@tbc-gear-prio/core/view";
import { exportJsonUrl, fetchJob, fetchShareLink } from "../api.js";
import {
  mergeRows,
  progressLabel,
  showPinControl,
  skeletonCount,
} from "../run-state.js";
import { toViewOptions, type UiViewOptions } from "../view-options.js";
import { ResultRow, RowSkeleton } from "../components/ResultRow.js";
import { HitCapBanner } from "../components/HitCapBanner.js";
import { AssumptionsDrawer } from "../components/AssumptionsDrawer.js";
import { ViewControls } from "../components/ViewControls.js";
import { Footer } from "../components/Footer.js";
import { useFlipOnce } from "../use-flip.js";

export function Run({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["job", id],
    queryFn: () => fetchJob(id),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === "queued" || status === "running" ? 1000 : false;
    },
    retry: false,
  });

  const [view, setView] = useState<UiViewOptions>({ greyOwned: true });
  const [showBelow, setShowBelow] = useState(false);
  const [shareLink, setShareLink] = useState<string | undefined>(undefined);

  // Arrival order, accumulated across polls. Kept outside react-query's cache
  // because the ordering is a property of *when rows were seen*, which a
  // refetched snapshot does not carry.
  const [rows, setRows] = useState<RankedItem[]>([]);
  const incoming = query.data?.progress.rows;
  useEffect(() => {
    if (incoming === undefined) return;
    setRows((prev) => mergeRows(prev, incoming));
  }, [incoming]);

  const job = query.data;
  const done = job?.status === "done" && job.result !== undefined;

  const viewResult = useMemo(() => {
    if (!job?.result) return undefined;
    return applyView(job.result, toViewOptions(view));
  }, [job?.result, view]);

  const listRef = useRef<HTMLDivElement>(null);
  // The single unprompted motion on the page. Keyed on the completion
  // transition, so a later control change re-renders without animating —
  // a user-initiated re-sort is a third case and needs no "done" signal.
  useFlipOnce(listRef, done);

  if (query.isPending) {
    return (
      <main className="page">
        <h1>Ranking</h1>
        <div className="rows" />
      </main>
    );
  }

  if (query.isError) {
    return (
      <main className="page page--narrow">
        <h1>Ranking</h1>
        <div className="error">
          <p>Could not read this run: {query.error.message}</p>
          <p>
            <a href="/">Start over</a>
          </p>
        </div>
      </main>
    );
  }

  if (job === undefined) return null;

  if (job.status === "error") {
    return (
      <main className="page page--narrow">
        <h1>Ranking failed</h1>
        <div className="error">
          <p>
            <strong>{job.errorKind ?? "unknown error"}</strong>
          </p>
          {job.errorDetail !== undefined && <p>{job.errorDetail}</p>}
          <p>
            <a href="/">Start over</a>
          </p>
        </div>
        <Footer simVersion={job.simVersion} />
      </main>
    );
  }

  const skeletons = skeletonCount(job.progress);
  const displayRows = viewResult?.rows ?? rows;
  const shortlist = viewResult?.shortlist;
  const below = viewResult
    ? viewResult.rows.filter((r) => r.belowCutoffInView)
    : [];
  const visible = done && shortlist && !showBelow ? shortlist : displayRows;

  // Skeletons only stand in for candidates that have not reported yet. At
  // completion there are none: the rowless ones disappear in the same motion
  // as the re-sort.
  const pending =
    done || skeletons === undefined
      ? 0
      : Math.max(0, skeletons - displayRows.length);

  return (
    <main className="page">
      <div className="status-line">
        <h1>Ranking</h1>
        <span className="status-line__stage">
          {done ? "done" : progressLabel(job.progress)}
        </span>
      </div>

      {done && job.result && <HitCapBanner caps={job.result.caps} />}

      {done && job.result && viewResult && (
        <ViewControls
          items={job.result.items}
          value={view}
          onChange={setView}
          showPinBis={showPinControl(viewResult)}
        />
      )}

      <div className="rows" ref={listRef}>
        {visible.map((row) => (
          <ResultRow
            key={`${String(row.itemId)}|${row.slot}|${row.slotChoice ?? ""}`}
            row={row}
            greyOwned={view.greyOwned ?? true}
            belowCutoff={
              "belowCutoffInView" in row && row.belowCutoffInView === true
            }
          />
        ))}
        {Array.from({ length: pending }, (_, i) => (
          <RowSkeleton key={`skeleton-${String(i)}`} />
        ))}
      </div>

      {done && below.length > 0 && (
        <div className="expand">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setShowBelow((s) => !s);
            }}
          >
            {showBelow
              ? `Hide ${String(below.length)} below the cutoff`
              : `Show ${String(below.length)} below the cutoff`}
          </button>
        </div>
      )}

      {done && job.result && (
        <>
          <AssumptionsDrawer ranking={job.result} simVersion={job.simVersion} />

          <div className="exports">
            {/* An anchor, not a button: the server sends the file as an
                attachment, so the browser's own download is the whole
                behaviour and script would only get in its way. */}
            <a href={exportJsonUrl(job.id)} download>
              Download sim settings (JSON)
            </a>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                void fetchShareLink(job.id).then(setShareLink);
              }}
            >
              Get wowsims share link
            </button>
          </div>

          {shareLink !== undefined && (
            <p>
              <a href={shareLink} target="_blank" rel="noreferrer noopener">
                Open in wowsims
              </a>
            </p>
          )}
        </>
      )}

      <Footer simVersion={job.simVersion} />
    </main>
  );
}
