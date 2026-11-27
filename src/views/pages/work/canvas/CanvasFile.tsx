import type { CSSProperties } from "react";
import { Ico } from "../Ico";
import { ACCESS, KIND, PEOPLE, ago, type Doc } from "./model";
import { downloadBlob, makePdf } from "./pdf";

type Props = {
  doc: Doc;
  path: string;
  now: number;
  onSign?: () => void;
  onCopyLink: () => void;
  onToast: (text: string) => void;
};

/* Preview for uploaded and indexed files. Uploads render for real (image, or the
   browser's PDF viewer); indexed PDFs render their extracted text on a page. */
export default function CanvasFile({ doc, path, now, onSign, onCopyLink, onToast }: Props) {
  const signed = doc.folder === "signed";
  const clean = doc.title.replace(/\.[a-z0-9]+$/i, "");
  const owner = PEOPLE[doc.owner];

  const download = () => {
    if (doc.url) {
      const a = document.createElement("a");
      a.href = doc.url;
      a.download = doc.title;
      a.click();
    } else {
      const footer = signed ? "Signed electronically with Pulse Signatures. Certificate of completion filed in Canvas." : "Exported from Pulse Canvas";
      downloadBlob(makePdf(clean, (path ? path + "  |  " : "") + (doc.pages || 1) + " pages", doc.body || [], footer), /\.pdf$/i.test(doc.title) ? doc.title : clean + ".pdf");
    }
    onToast("Downloading " + doc.title);
  };

  const rows: [string, string][] = [
    ["Type", KIND[doc.kind].label + (doc.pages ? ", " + doc.pages + " pages" : "")],
    ["Size", doc.size || "Unknown"],
    ["Owner", owner?.initials ? owner.name : owner?.short || "Uploaded"],
    ["Folder", path || "Canvas"],
    ["Access", ACCESS[doc.access].label(doc)],
    ["Last activity", ago(doc.at, now)],
  ];

  return (
    <div className="cv-file">
      <div className="cv-file-view">
        {doc.url && doc.kind === "image" && <img className="cv-file-img" src={doc.url} alt={doc.title} />}
        {doc.url && doc.kind === "pdf" && <iframe className="cv-file-frame" src={doc.url} title={doc.title} />}
        {doc.url && doc.kind === "file" && (
          <div className="ws-card ws-empty">
            <b>No preview for this file type</b>
            <span>It is stored in Canvas and can be downloaded or shared.</span>
          </div>
        )}
        {!doc.url && (
          <div className="cv-paper">
            <div className="cv-paper-meta">{path || "Canvas"}</div>
            <h2>{clean}</h2>
            {(doc.body || ["This file has been indexed. Its text is searchable from Helios and the command bar."]).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {signed && (
              <div className="cv-paper-sign">
                <div>
                  <span className="cv-script">Martin Kilbride</span>
                  <small>Martin Kilbride, Kilbride Group</small>
                </div>
                <div className="cv-paper-seal">
                  <Ico d="shield" size={14} /> Signed with Pulse Signatures
                </div>
              </div>
            )}
            <div className="cv-paper-foot">Page 1 of {doc.pages || 1}</div>
          </div>
        )}
      </div>
      <aside className="ws-card cv-file-info">
        <div className="cv-file-head">
          <span className="cv-ktile" style={{ ["--k" as string]: KIND[doc.kind].tint } as CSSProperties}>
            <Ico d={KIND[doc.kind].icon} size={16} />
          </span>
          <div style={{ minWidth: 0 }}>
            <b>{doc.title}</b>
            <span>{signed ? "Signed copy, filed automatically" : doc.url ? "Uploaded by you" : "Indexed for search"}</span>
          </div>
        </div>
        <dl className="cv-facts">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="cv-file-actions">
          <button className="ws-btn ws-btn-accent" onClick={download}>
            <Ico d="download" size={14} /> Download
          </button>
          {doc.kind === "pdf" && !signed && onSign && (
            <button className="ws-btn" onClick={onSign}>
              <Ico d="signDoc" size={14} /> Send for signature
            </button>
          )}
          <button className="ws-btn" onClick={onCopyLink}>
            <Ico d="link" size={14} /> Copy link
          </button>
        </div>
      </aside>
    </div>
  );
}
