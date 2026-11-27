import { Fragment, useMemo } from "react";
import { COLS, KIND, PEOPLE, type Block, type Board, type Doc, type Kind, type Sheet } from "./model";
import { computeAll, display } from "./formula";

type Props = {
  kind: Kind;
  title: string;
  blocks?: Block[];
  sheet?: Sheet;
  board?: Board;
  doc?: Doc;
  /** The small chip in the corner. */
  chip?: string;
  /** Blank template: show the empty state of the kind. */
  blank?: boolean;
};

/* Small live previews of a doc's real contents, for template cards and grid view. */
export default function Thumb({ kind, title, blocks, sheet, board, doc, chip, blank }: Props) {
  return (
    <div className="cv-thumb">
      {kind === "page" && <PageThumb title={title} blocks={blocks} blank={blank} />}
      {kind === "sheet" && <SheetThumb sheet={sheet} />}
      {(kind === "tracker" || kind === "pipeline") && <BoardThumb board={board} kind={kind} />}
      {(kind === "pdf" || kind === "file") && <PageThumb title={title.replace(/\.[a-z0-9]+$/i, "")} paragraphs={doc?.body} file />}
      {kind === "image" && (doc?.url ? <img className="cv-thumb-img" src={doc.url} alt="" /> : <PageThumb title={title} />)}
      <span className="cv-thumb-kind">{chip ?? KIND[kind].label}</span>
    </div>
  );
}

function PageThumb({ title, blocks, paragraphs, blank, file }: { title: string; blocks?: Block[]; paragraphs?: string[]; blank?: boolean; file?: boolean }) {
  const lines = blocks ? blocks.filter((b) => b.text.trim()).slice(0, 7) : [];
  return (
    <div className="cv-thumb-paper" data-file={file ? "1" : undefined}>
      {blank ? (
        <span className="cv-thumb-ph">Type / for blocks</span>
      ) : (
        <>
          <b>{title || "Untitled"}</b>
          {lines.map((b) => (
            <div key={b.id} className={"cv-tp-" + b.type}>
              {b.type === "todo" ? (b.checked ? "☑ " : "☐ ") : b.type === "bullet" ? "• " : ""}
              {b.text}
            </div>
          ))}
          {paragraphs?.slice(0, 3).map((p, i) => <p key={i}>{p}</p>)}
        </>
      )}
    </div>
  );
}

function SheetThumb({ sheet }: { sheet?: Sheet }) {
  const tab = sheet?.tabs[0];
  const vals = useMemo(() => (tab ? computeAll(tab.cells) : {}), [tab]);
  return (
    <div className="cv-thumb-sheet">
      <table>
        <tbody>
          {Array.from({ length: 7 }, (_, r) => (
            <tr key={r}>
              {COLS.slice(0, 4).map((c) => (
                <td key={c} data-bold={tab?.bold.includes(r + 1) ? "1" : undefined}>
                  {tab ? display(vals[c + (r + 1)], tab.fmt[c]) : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BoardThumb({ board, kind }: { board?: Board; kind: Kind }) {
  const cols = board?.columns || (kind === "pipeline"
    ? [{ id: "a", name: "New" }, { id: "b", name: "Quoted" }, { id: "c", name: "Won" }]
    : [{ id: "a", name: "Not started" }, { id: "b", name: "In progress" }, { id: "c", name: "Done" }]);
  return (
    <div className="cv-thumb-board">
      {cols.slice(0, 3).map((col) => (
        <div key={col.id} className="cv-thumb-col">
          <span className="cv-thumb-colname">{col.name}</span>
          {(board?.cards || [])
            .filter((c) => c.col === col.id)
            .slice(0, 3)
            .map((c) => (
              <Fragment key={c.id}>
                <span className="cv-thumb-card">
                  <i style={{ background: PEOPLE[c.who]?.tint || "var(--faint)" }} />
                  {c.title}
                </span>
              </Fragment>
            ))}
        </div>
      ))}
    </div>
  );
}
