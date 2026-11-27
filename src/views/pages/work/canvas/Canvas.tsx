import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent as RMouseEvent } from "react";
import "../../../../styles/canvas.css";
import { usePersist } from "../../../../components/usePersist";
import { Ico, type IcoName } from "../Ico";
import {
  ACCESS, KIND, PEOPLE, TEMPLATES, ago, blankBoard, blankSheet, copyBlocks, copyBoard, copySheet, descendants, fileKindOf,
  isFileKind, pathLabel, pathOf, seedBoards, seedDocs, seedFolders, seedPages, seedSheets, sizeLabel, templateContent, uid,
  type Access, type Block, type Board, type Doc, type Folder, type Kind, type Sheet, type Template,
} from "./model";
import CanvasPage from "./CanvasPage";
import CanvasSheet from "./CanvasSheet";
import CanvasBoard, { Avatar } from "./CanvasBoard";
import CanvasFile from "./CanvasFile";
import Thumb from "./Thumb";

type View = "home" | "starred" | "mine" | "shared" | "templates" | "bin" | "folder";
type Nav = { view: View; folder?: string };
type Filter = "all" | "page" | "sheet" | "tracker" | "file";
type MenuSpec = { type: "row"; id: string } | { type: "new" } | { type: "share"; id: string } | { type: "doc"; id: string };
type Menu = null | (MenuSpec & { x: number; y: number });

const NAVS: [View, string, IcoName][] = [
  ["home", "Home", "home"],
  ["starred", "Starred", "star"],
  ["mine", "Mine", "user"],
  ["shared", "Shared with me", "users"],
  ["templates", "Templates", "template"],
  ["bin", "Bin", "bin"],
];
const FILTERS: [Filter, string][] = [["all", "All"], ["page", "Pages"], ["sheet", "Sheets"], ["tracker", "Trackers"], ["file", "Files"]];
const ACCESS_OPTS: [Access, string, string][] = [
  ["me", "Only me", "Nobody else can open it"],
  ["people", "Specific people", "Aoife, Tom and Niamh"],
  ["company", "Company", "Everyone at Kilbride Group"],
  ["public", "Anyone with the link", "No sign-in needed to view"],
];

const nameOf = (d: Doc) => d.title.trim() || "Untitled";
const kStyle = (k: Kind) => ({ ["--k" as string]: KIND[k].tint }) as CSSProperties;
const matches = (d: Doc, f: Filter) =>
  f === "all" || (f === "tracker" ? d.kind === "tracker" || d.kind === "pipeline" : f === "file" ? isFileKind(d.kind) : d.kind === f);
const firstBlock = (id: string): Block[] => [{ id: id + "-b0", type: "p", text: "" }];

export default function Canvas({ v }: { v: any }) {
  const [docs, setDocs] = usePersist<Doc[]>("canvas:docs", seedDocs);
  const [folders, setFolders] = usePersist<Folder[]>("canvas:folders", seedFolders);
  const [pages, setPages] = usePersist<Record<string, Block[]>>("canvas:pages", seedPages);
  const [sheets, setSheets] = usePersist<Record<string, Sheet>>("canvas:sheets", seedSheets);
  const [boards, setBoards] = usePersist<Record<string, Board>>("canvas:boards", seedBoards);
  const [nav, setNav] = usePersist<Nav>("canvas:nav", { view: "home" });
  const [openId, setOpenId] = usePersist<string | null>("canvas:open", null);
  const [expanded, setExpanded] = usePersist<Record<string, boolean>>("canvas:tree", { clients: true });
  const [filter, setFilter] = usePersist<Filter>("canvas:filter", "all");
  const [sort, setSort] = usePersist<"recent" | "name">("canvas:sort", "recent");
  const [layout, setLayout] = usePersist<"list" | "grid">("canvas:layout", "list");
  const [side, setSide] = usePersist<boolean>("canvas:side", true);

  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<Menu>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [toast, setToast] = useState<null | { text: string; undo?: () => void; key: number }>(null);
  const [dragDoc, setDragDoc] = useState<string | null>(null);
  const [dropFolder, setDropFolder] = useState<string | null>(null);
  const [fileOver, setFileOver] = useState(false);
  const [moveId, setMoveId] = useState<string | null>(null);
  const [saving, setSaving] = useState<"saving" | "saved">("saved");
  const [now, setNow] = useState(() => Date.now());

  const searchRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const toastTimer = useRef<number | undefined>(undefined);

  const live = useMemo(() => docs.filter((d) => !d.binned), [docs]);
  const folderById = useMemo(() => Object.fromEntries(folders.map((f) => [f.id, f])) as Record<string, Folder>, [folders]);
  const openDoc = openId ? docs.find((d) => d.id === openId && !d.binned) : undefined;
  const here = nav.view === "folder" && nav.folder && folderById[nav.folder] ? nav.folder : "";
  const others = useMemo(() => [...new Set(live.flatMap((d) => d.live || []).filter((p) => p !== "me"))], [live]);

  /* Relative times stay current, and teammates keep working in the background. */
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    const w = window.setInterval(() => {
      setDocs((ds) => {
        const busy = ds.filter((d) => !d.binned && d.live?.some((p) => p !== "me"));
        if (!busy.length) return ds;
        const pick = busy[Math.floor(Math.random() * busy.length)];
        return ds.map((d) => (d.id === pick.id ? { ...d, at: Date.now() } : d));
      });
      setNow(Date.now());
    }, 45000);
    return () => {
      window.clearInterval(t);
      window.clearInterval(w);
    };
  }, [setDocs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (e.key === "/" && !typing && !openDoc) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setMenu(null);
        setMoveId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openDoc]);

  useEffect(() => () => {
    window.clearTimeout(saveTimer.current);
    window.clearTimeout(toastTimer.current);
  }, []);

  /* ---------- actions ---------- */
  const say = (text: string, undo?: () => void) => {
    setToast({ text, undo, key: Date.now() });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  };
  const touch = (id: string) => setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, at: Date.now() } : d)));
  const saved = () => {
    setSaving("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setSaving("saved"), 700);
  };
  const patchDoc = (id: string, patch: Partial<Doc>) => setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const scrollTop = () => document.querySelector("[data-scroll-main]")?.scrollTo({ top: 0 });
  const open = (id: string) => {
    setOpenId(id);
    setMenu(null);
    scrollTop();
  };
  const goView = (view: View, folder?: string) => {
    setNav({ view, folder });
    setOpenId(null);
    setQuery("");
    setMenu(null);
    if (folder) {
      const chain = pathOf(folder, folders).map((f) => f.id);
      setExpanded((e) => ({ ...e, ...Object.fromEntries(chain.map((c) => [c, true])) }));
    }
    scrollTop();
  };

  const create = (kind: Kind, tpl?: Template) => {
    const t = tpl || TEMPLATES.find((x) => x.kind === kind && x.blank)!;
    const id = uid("d");
    const content = templateContent(t, pages, sheets, boards);
    const title = t.blank ? (kind === "page" ? "" : "Untitled " + KIND[kind].label.toLowerCase()) : t.title;
    const doc: Doc = { id, title, kind, folder: here, owner: "me", access: "me", at: Date.now() };
    setDocs((ds) => [doc, ...ds]);
    if (content.page) setPages((p) => ({ ...p, [id]: content.page! }));
    if (content.sheet) setSheets((s) => ({ ...s, [id]: content.sheet! }));
    if (content.board) setBoards((b) => ({ ...b, [id]: content.board! }));
    open(id);
  };

  const newFolder = (parent: string | null) => {
    const id = uid("f");
    setFolders((fs) => [...fs, { id, name: "New folder", parent }]);
    if (parent) setExpanded((e) => ({ ...e, [parent]: true }));
    setRenamingFolder(id);
    setMenu(null);
  };

  const upload = (files: FileList | File[] | null) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    const added: Doc[] = list.map((f) => ({
      id: uid("u"), title: f.name, kind: fileKindOf(f), folder: here, owner: "me", access: "me",
      at: Date.now(), size: sizeLabel(f.size), url: URL.createObjectURL(f),
    }));
    setDocs((ds) => [...added, ...ds]);
    say("Uploaded " + (list.length === 1 ? list[0].name : list.length + " files") + (here ? " to " + folderById[here].name : ""));
  };

  const binDoc = (id: string) => {
    const d = docs.find((x) => x.id === id);
    patchDoc(id, { binned: true });
    if (openId === id) setOpenId(null);
    setMenu(null);
    say("Moved “" + (d ? nameOf(d) : "it") + "” to the Bin", () => patchDoc(id, { binned: false }));
  };
  const restore = (id: string) => {
    patchDoc(id, { binned: false, at: Date.now() });
    setMenu(null);
    say("Restored");
  };
  const destroy = (id: string) => {
    setDocs((ds) => ds.filter((d) => d.id !== id));
    setMenu(null);
    say("Deleted for good");
  };
  const duplicate = (id: string) => {
    const d = docs.find((x) => x.id === id);
    if (!d) return;
    const nid = uid("d");
    setDocs((ds) => [{ ...d, id: nid, title: nameOf(d) + " (copy)", owner: "me", access: "me", starred: false, shared: false, live: undefined, at: Date.now() }, ...ds]);
    if (pages[id]) setPages((p) => ({ ...p, [nid]: copyBlocks(p[id]) }));
    if (sheets[id]) setSheets((s) => ({ ...s, [nid]: copySheet(s[id]) }));
    if (boards[id]) setBoards((b) => ({ ...b, [nid]: copyBoard(b[id]) }));
    setMenu(null);
    say("Duplicated “" + nameOf(d) + "”");
  };
  const moveTo = (id: string, folder: string) => {
    patchDoc(id, { folder, at: Date.now() });
    setMoveId(null);
    setMenu(null);
    say("Moved to " + (folder ? folderById[folder]?.name : "Canvas"));
  };
  const copyLink = (id: string) => {
    navigator.clipboard?.writeText(window.location.origin + "/canvas/" + id).catch(() => undefined);
    setMenu(null);
    say("Link copied");
  };
  const star = (id: string) => {
    const d = docs.find((x) => x.id === id);
    patchDoc(id, { starred: !d?.starred });
    setMenu(null);
  };

  const pageUpdate = (id: string) => (fn: (b: Block[]) => Block[]) => {
    setPages((p) => ({ ...p, [id]: fn(p[id]?.length ? p[id] : firstBlock(id)) }));
    touch(id);
    saved();
  };
  const sheetUpdate = (id: string) => (fn: (s: Sheet) => Sheet) => {
    setSheets((s) => ({ ...s, [id]: fn(s[id] || blankSheet()) }));
    touch(id);
    saved();
  };
  const boardUpdate = (id: string, kind: Kind) => (fn: (b: Board) => Board) => {
    setBoards((b) => ({ ...b, [id]: fn(b[id] || blankBoard(kind)) }));
    touch(id);
    saved();
  };

  /* ---------- drag to move, drop to upload ---------- */
  const folderDrop = (id: string) => ({
    onDragOver: (e: DragEvent) => {
      if (!dragDoc) return;
      e.preventDefault();
      e.stopPropagation();
      if (dropFolder !== id) setDropFolder(id);
    },
    onDragLeave: () => setDropFolder((f) => (f === id ? null : f)),
    onDrop: (e: DragEvent) => {
      if (!dragDoc) return;
      e.preventDefault();
      e.stopPropagation();
      moveTo(dragDoc, id);
      setDragDoc(null);
      setDropFolder(null);
    },
  });
  const isFiles = (e: DragEvent) => Array.from(e.dataTransfer.types || []).includes("Files");

  const menuAt = (e: RMouseEvent, m: MenuSpec, fromButton = true) => {
    e.preventDefault();
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = fromButton ? r.right - 220 : e.clientX;
    const y = fromButton ? r.bottom + 6 : e.clientY;
    setMenu({ ...m, x: Math.max(8, Math.min(x, window.innerWidth - 240)), y: Math.max(8, Math.min(y, window.innerHeight - 340)) });
  };

  /* ---------- what the list shows ---------- */
  const q = query.trim().toLowerCase();
  const baseList: Doc[] = q
    ? live.filter((d) => nameOf(d).toLowerCase().includes(q) || pathLabel(d.folder, folders).toLowerCase().includes(q))
    : nav.view === "starred" ? live.filter((d) => d.starred)
    : nav.view === "mine" ? live.filter((d) => d.owner === "me")
    : nav.view === "shared" ? live.filter((d) => d.shared)
    : nav.view === "bin" ? docs.filter((d) => d.binned)
    : nav.view === "folder" ? live.filter((d) => d.folder === here)
    : live;
  const counts = Object.fromEntries(FILTERS.map(([f]) => [f, baseList.filter((d) => matches(d, f)).length])) as Record<Filter, number>;
  const list = baseList
    .filter((d) => matches(d, filter))
    .sort((a, b) => (sort === "name" ? nameOf(a).localeCompare(nameOf(b)) : b.at - a.at));

  const itemCount = (fid: string) => {
    const ids = new Set(descendants(fid, folders));
    return live.filter((d) => ids.has(d.folder)).length + folders.filter((f) => f.parent === fid).length;
  };

  /* ---------- pieces ---------- */
  const renderTree = (parent: string | null, depth: number): JSX.Element[] =>
    folders
      .filter((f) => f.parent === parent)
      .map((f) => {
        const kids = folders.some((x) => x.parent === f.id);
        const isOpen = !!expanded[f.id];
        return (
          <Fragment key={f.id}>
            <div
              className="cv-tree-row"
              style={{ paddingLeft: 4 + depth * 14 }}
              aria-current={nav.view === "folder" && nav.folder === f.id && !openDoc && !q ? "true" : undefined}
              data-drop={dropFolder === f.id ? "1" : undefined}
              onClick={() => goView("folder", f.id)}
              {...folderDrop(f.id)}
            >
              {kids ? (
                <button
                  className="cv-chev"
                  data-open={isOpen ? "1" : undefined}
                  aria-label={isOpen ? "Collapse" : "Expand"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((x) => ({ ...x, [f.id]: !isOpen }));
                  }}
                >
                  <Ico d="chevronRight" size={12} sw={2} />
                </button>
              ) : (
                <span className="cv-chev-sp" />
              )}
              <Ico d="folder" size={15} />
              {renamingFolder === f.id ? (
                <input
                  className="cv-inline"
                  autoFocus
                  defaultValue={f.name}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={(e) => {
                    const name = e.target.value.trim() || f.name;
                    setFolders((fs) => fs.map((x) => (x.id === f.id ? { ...x, name } : x)));
                    setRenamingFolder(null);
                  }}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === "Escape") && (e.target as HTMLInputElement).blur()}
                />
              ) : (
                <span className="cv-tree-name" onDoubleClick={(e) => { e.stopPropagation(); setRenamingFolder(f.id); }}>{f.name}</span>
              )}
            </div>
            {kids && isOpen && renderTree(f.id, depth + 1)}
          </Fragment>
        );
      });

  const ownerCell = (d: Doc) => {
    const p = PEOPLE[d.owner];
    return (
      <div className="cv-owner cv-hide-sm">
        {p?.initials ? <Avatar who={d.owner} size={24} /> : null}
        <span>{p ? p.short : d.owner}</span>
      </div>
    );
  };

  const accessCell = (d: Doc) => {
    const a = ACCESS[d.access];
    return (
      <div className="cv-access cv-hide-sm" data-loud={a.loud ? "1" : undefined}>
        <Ico d={a.icon} size={14} />
        {a.label(d)}
      </div>
    );
  };

  const liveNote = (d: Doc) => {
    const ppl = (d.live || []).filter((p) => p !== "me");
    if (!ppl.length) return null;
    return (
      <span className="cv-livenote">
        <i className="cv-ping" />
        {PEOPLE[ppl[0]].short.split(" ")[0]}{ppl.length > 1 ? " and " + (ppl.length - 1) + " more" : ""} in it now
      </span>
    );
  };

  const rows = (items: Doc[], inBin = false) =>
    layout === "grid" && !inBin ? (
      <div className="cv-cards">
        {items.map((d) => (
          <div
            key={d.id}
            className="ws-card cv-card"
            role="button"
            tabIndex={0}
            draggable
            data-dragging={dragDoc === d.id ? "1" : undefined}
            onDragStart={(e) => { e.dataTransfer.setData("text/plain", d.id); setDragDoc(d.id); }}
            onDragEnd={() => { setDragDoc(null); setDropFolder(null); }}
            onClick={() => open(d.id)}
            onKeyDown={(e) => e.key === "Enter" && open(d.id)}
            onContextMenu={(e) => menuAt(e, { type: "row", id: d.id }, false)}
          >
            <Thumb kind={d.kind} title={nameOf(d)} blocks={pages[d.id]} sheet={sheets[d.id]} board={boards[d.id]} doc={d} />
            <div className="cv-card-body">
              <div className="cv-card-title">
                <span className="cv-ktile cv-ktile-sm" style={kStyle(d.kind)}><Ico d={KIND[d.kind].icon} size={12} /></span>
                <b>{nameOf(d)}</b>
                {d.starred && <Ico d="star" size={12} className="cv-star" />}
              </div>
              <div className="cv-card-meta">
                {liveNote(d) || <span>{ago(d.at, now)}</span>}
                <button className="ws-btn ws-btn-ghost ws-btn-sm ws-icon-btn" aria-label="More" onClick={(e) => menuAt(e, { type: "row", id: d.id })}>
                  <Ico d="more" size={16} sw={3} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="ws-card cv-table">
        <div className="cv-tr cv-th">
          <span>Name</span>
          <span className="cv-hide-sm">Owner</span>
          <span className="cv-hide-sm">Access</span>
          <span>{inBin ? "Binned" : "Last activity"}</span>
          <span />
        </div>
        {items.map((d) => {
          const path = pathLabel(d.folder, folders);
          return (
            <div
              key={d.id}
              className="cv-tr"
              role="button"
              tabIndex={0}
              draggable={!inBin}
              data-dragging={dragDoc === d.id ? "1" : undefined}
              onDragStart={(e) => { e.dataTransfer.setData("text/plain", d.id); setDragDoc(d.id); }}
              onDragEnd={() => { setDragDoc(null); setDropFolder(null); }}
              onClick={() => (inBin ? undefined : open(d.id))}
              onKeyDown={(e) => e.key === "Enter" && !inBin && open(d.id)}
              onContextMenu={(e) => menuAt(e, { type: "row", id: d.id }, false)}
            >
              <div className="cv-name">
                <span className="cv-ktile" style={kStyle(d.kind)}><Ico d={KIND[d.kind].icon} size={16} /></span>
                <div className="cv-name-text">
                  {renaming === d.id ? (
                    <input
                      className="cv-inline"
                      autoFocus
                      defaultValue={nameOf(d)}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => e.currentTarget.select()}
                      onBlur={(e) => {
                        patchDoc(d.id, { title: e.target.value.trim() || d.title });
                        setRenaming(null);
                      }}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === "Escape") && (e.target as HTMLInputElement).blur()}
                    />
                  ) : (
                    <b>
                      {nameOf(d)}
                      {d.starred && <Ico d="star" size={12} className="cv-star" />}
                    </b>
                  )}
                  {(path || d.live?.some((p) => p !== "me")) && (
                    <span>
                      {path}
                      {path && liveNote(d) ? "  " : ""}
                      {liveNote(d)}
                    </span>
                  )}
                </div>
              </div>
              {ownerCell(d)}
              {accessCell(d)}
              <div className="cv-when">{ago(d.at, now)}</div>
              <button className="ws-btn ws-btn-ghost ws-btn-sm ws-icon-btn" aria-label="More" onClick={(e) => menuAt(e, { type: "row", id: d.id })}>
                <Ico d="more" size={16} sw={3} />
              </button>
            </div>
          );
        })}
        {!items.length && (
          <div className="ws-empty">
            {inBin ? (
              <>
                <b>The Bin is empty</b>
                <span>Anything you remove sits here until you empty it.</span>
              </>
            ) : q ? (
              <>
                <b>Nothing matches “{query}”</b>
                <span>Try part of a name, a client or a folder.</span>
              </>
            ) : nav.view === "folder" ? (
              <>
                <b>This folder is empty</b>
                <span>Drop files anywhere on this page, or start something new.</span>
              </>
            ) : (
              <>
                <b>Nothing here yet</b>
                <span>{nav.view === "starred" ? "Star a page or sheet to keep it here." : "Switch filter, or start something new."}</span>
              </>
            )}
          </div>
        )}
      </div>
    );

  const listTools = (
    <div className="cv-toolbar">
      <div className="ws-seg" role="group" aria-label="Filter">
        {FILTERS.map(([f, label]) => (
          <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {label}
            <span className="ws-count">{counts[f]}</span>
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <button className="ws-btn ws-btn-sm" onClick={() => setSort(sort === "recent" ? "name" : "recent")} title="Change sort">
        <Ico d={sort === "recent" ? "clock" : "sort"} size={13} /> {sort === "recent" ? "Recent" : "Name"}
      </button>
      <div className="ws-seg cv-seg-icons" role="group" aria-label="Layout">
        <button aria-pressed={layout === "list"} onClick={() => setLayout("list")} aria-label="List"><Ico d="list" size={14} /></button>
        <button aria-pressed={layout === "grid"} onClick={() => setLayout("grid")} aria-label="Grid"><Ico d="grid" size={14} /></button>
      </div>
    </div>
  );

  const folderTiles = (parent: string | null) => (
    <div className="cv-folders">
      {folders
        .filter((f) => f.parent === parent)
        .map((f) => (
          <button key={f.id} className="ws-card cv-folder" data-drop={dropFolder === f.id ? "1" : undefined} onClick={() => goView("folder", f.id)} {...folderDrop(f.id)}>
            <Ico d="folder" size={20} />
            <div>
              <b>{f.name}</b>
              <span>{itemCount(f.id)} {itemCount(f.id) === 1 ? "item" : "items"}</span>
            </div>
          </button>
        ))}
      <button className="cv-folder cv-folder-new" onClick={() => newFolder(parent)}>
        <Ico d="folderPlus" size={20} />
        <div><b>New folder</b></div>
      </button>
    </div>
  );

  const startRow = (
    <div className="cv-tpl-row">
      {TEMPLATES.filter((t) => t.blank).map((t) => (
        <button key={t.id} className="ws-card cv-tpl" onClick={() => create(t.kind, t)}>
          <Thumb kind={t.kind} title={t.title} blank chip={KIND[t.kind].label} />
          <div className="cv-tpl-title"><span className="cv-ktile cv-ktile-sm" style={kStyle(t.kind)}><Ico d={KIND[t.kind].icon} size={12} /></span>{t.title}</div>
          <div className="cv-tpl-sub">{t.sub}</div>
        </button>
      ))}
    </div>
  );

  /* ---------- browse view ---------- */
  const viewTitle = q ? "Results for “" + query.trim() + "”" : nav.view === "folder" ? folderById[here]?.name || "Folder" : NAVS.find((n) => n[0] === nav.view)?.[1] || "Home";

  const browse = (
    <>
      <div className="cv-main-head">
        {nav.view === "folder" && !q && (
          <div className="cv-crumbs">
            <button onClick={() => goView("home")}>Canvas</button>
            {pathOf(here, folders).slice(0, -1).map((f) => (
              <Fragment key={f.id}>
                <Ico d="chevronRight" size={12} />
                <button onClick={() => goView("folder", f.id)} {...folderDrop(f.id)}>{f.name}</button>
              </Fragment>
            ))}
          </div>
        )}
        <div className="cv-main-title">
          <h2>{viewTitle}</h2>
          {nav.view === "folder" && !q && <span>{itemCount(here)} items</span>}
          {nav.view === "bin" && !q && docs.some((d) => d.binned) && (
            <button className="ws-btn ws-btn-sm ws-btn-danger" onClick={() => { setDocs((ds) => ds.filter((d) => !d.binned)); say("Bin emptied"); }}>
              <Ico d="bin" size={13} /> Empty bin
            </button>
          )}
        </div>
      </div>

      {nav.view === "home" && !q && (
        <>
          <section className="cv-section cv-section-first">
            <div className="cv-section-head">
              <h3>Start something</h3>
              <button className="cv-link" onClick={() => goView("templates")}>All {TEMPLATES.length} templates</button>
            </div>
            {startRow}
          </section>
          <section className="cv-section">
            <div className="cv-section-head"><h3>Folders</h3></div>
            {folderTiles(null)}
          </section>
          <section className="cv-section">
            {listTools}
            {rows(list)}
          </section>
        </>
      )}

      {nav.view === "templates" && !q && (
        <section className="cv-section cv-section-first">
          <p className="cv-lede">Start from something that already works. Each one opens as a copy you own.</p>
          <div className="cv-tpl-grid">
            {TEMPLATES.map((t) => (
              <button key={t.id} className="ws-card cv-tpl" onClick={() => create(t.kind, t)}>
                <Thumb kind={t.kind} title={t.title} blank={t.blank && t.kind === "page"} blocks={t.from ? pages[t.from] : undefined} sheet={t.from ? sheets[t.from] : undefined} board={t.from ? boards[t.from] : undefined} />
                <div className="cv-tpl-title"><span className="cv-ktile cv-ktile-sm" style={kStyle(t.kind)}><Ico d={KIND[t.kind].icon} size={12} /></span>{t.title}</div>
                <div className="cv-tpl-sub">{t.sub}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {nav.view === "folder" && !q && (
        <>
          {folders.some((f) => f.parent === here) && <section className="cv-section cv-section-first">{folderTiles(here)}</section>}
          <section className="cv-section">
            {listTools}
            {rows(list)}
          </section>
        </>
      )}

      {(q || ["starred", "mine", "shared"].includes(nav.view)) && (
        <section className="cv-section cv-section-first">
          {listTools}
          {rows(list)}
        </section>
      )}

      {nav.view === "bin" && !q && <section className="cv-section cv-section-first">{rows(list, true)}</section>}
    </>
  );

  /* ---------- open doc ---------- */
  const docView = openDoc && (() => {
    const d = openDoc;
    const crumbs = pathOf(d.folder, folders);
    const ppl = (d.live || []).filter((p) => p !== "me");
    const isPage = d.kind === "page";
    return (
      <>
        <div className="cv-docbar">
          <button className="ws-btn ws-btn-sm" onClick={() => setOpenId(null)}>
            <Ico d="back" size={13} /> Canvas
          </button>
          <button className="ws-btn ws-btn-sm ws-btn-ghost ws-icon-btn cv-hide-sm" onClick={() => setSide(!side)} title={side ? "Hide sidebar" : "Show sidebar"} aria-label="Toggle sidebar">
            <Ico d="sidebar" size={15} />
          </button>
          <div className="cv-crumbs">
            {crumbs.map((f) => (
              <Fragment key={f.id}>
                <button onClick={() => goView("folder", f.id)}>{f.name}</button>
                <Ico d="chevronRight" size={12} />
              </Fragment>
            ))}
            <b>{nameOf(d)}</b>
          </div>
          <div style={{ flex: 1 }} />
          {!isFileKind(d.kind) && (
            <span className="cv-saved" aria-live="polite">
              {saving === "saving" ? "Saving" : <><Ico d="check" size={12} sw={2.4} /> Saved</>}
            </span>
          )}
          <div className="ws-avatar-stack" title={ppl.length ? ppl.map((p) => PEOPLE[p].name).join(", ") + " and you" : "Just you"}>
            {ppl.map((p) => <Avatar key={p} who={p} size={26} />)}
            <Avatar who="me" size={26} />
          </div>
          <button className="ws-btn ws-btn-sm ws-icon-btn" onClick={() => star(d.id)} aria-label={d.starred ? "Unstar" : "Star"} title={d.starred ? "Unstar" : "Star"}>
            <Ico d="star" size={14} className={d.starred ? "cv-star cv-star-on" : undefined} />
          </button>
          <button className="ws-btn ws-btn-sm ws-btn-accent" onClick={(e) => menuAt(e, { type: "share", id: d.id })}>
            <Ico d="share" size={13} /> Share
          </button>
          <button className="ws-btn ws-btn-sm ws-icon-btn" aria-label="More" onClick={(e) => menuAt(e, { type: "doc", id: d.id })}>
            <Ico d="more" size={16} sw={3} />
          </button>
        </div>

        {!isPage && (
          <div className="cv-dochead">
            <span className="cv-ktile cv-ktile-lg" style={kStyle(d.kind)}><Ico d={KIND[d.kind].icon} size={20} /></span>
            <div className="cv-dochead-main">
              {isFileKind(d.kind) ? (
                <h2 className="cv-doctitle-static">{nameOf(d)}</h2>
              ) : (
                <input className="cv-doctitle" value={d.title} placeholder="Untitled" aria-label="Title" onChange={(e) => { patchDoc(d.id, { title: e.target.value, at: Date.now() }); saved(); }} />
              )}
              <div className="cv-dochead-meta">
                {KIND[d.kind].label} · {PEOPLE[d.owner]?.initials ? PEOPLE[d.owner].name : PEOPLE[d.owner]?.short} · edited {ago(d.at, now).toLowerCase()}
                {ppl.length > 0 && <> · {liveNote(d)}</>}
              </div>
            </div>
          </div>
        )}

        <div className="cv-editor" key={d.id}>
          {isPage && (
            <CanvasPage
              doc={d}
              blocks={pages[d.id]?.length ? pages[d.id] : firstBlock(d.id)}
              update={pageUpdate(d.id)}
              onTitle={(title) => { patchDoc(d.id, { title, at: Date.now() }); saved(); }}
            />
          )}
          {d.kind === "sheet" && <CanvasSheet sheet={sheets[d.id] || blankSheet()} update={sheetUpdate(d.id)} live={d.live} />}
          {(d.kind === "tracker" || d.kind === "pipeline") && (
            <CanvasBoard
              kind={d.kind}
              board={boards[d.id] || blankBoard(d.kind)}
              update={boardUpdate(d.id, d.kind)}
            />
          )}
          {isFileKind(d.kind) && (
            <CanvasFile
              doc={d}
              path={pathLabel(d.folder, folders)}
              now={now}
              onSign={v?.goSignatures}
              onCopyLink={() => copyLink(d.id)}
              onToast={(t) => say(t)}
            />
          )}
        </div>
      </>
    );
  })();

  /* ---------- menus ---------- */
  const menuDoc = menu && "id" in menu ? docs.find((d) => d.id === menu.id) : undefined;
  const flatFolders = (parent: string | null, depth: number): { f: Folder; depth: number }[] =>
    folders.filter((f) => f.parent === parent).flatMap((f) => [{ f, depth }, ...flatFolders(f.id, depth + 1)]);

  const showSide = !openDoc || side;

  return (
    <div className="ws-page cv-root" data-open={openDoc ? "1" : undefined}>
      {!openDoc && (
        <div className="ws-head">
          <div className="ws-head-main">
            <div className="ws-eyebrow">Workspace</div>
            <h1 className="ws-h1">Canvas</h1>
            <div className="ws-sub cv-sub">
              <span>{live.length} docs · {folders.length} folders</span>
              {others.length > 0 && (
                <span className="cv-livenote cv-live-big">
                  <i className="cv-ping" />
                  {others.length} {others.length === 1 ? "person" : "people"} working in it now
                </span>
              )}
            </div>
          </div>
          <div className="cv-actions">
            <label className="ws-input cv-search">
              <Ico d="search" size={15} />
              <input ref={searchRef} value={query} onChange={(e) => { setQuery(e.target.value); setOpenId(null); }} placeholder="Search pages, sheets, files" aria-label="Search Canvas" />
              {query ? (
                <button className="cv-clear" onClick={() => setQuery("")} aria-label="Clear search"><Ico d="x" size={11} sw={2.4} /></button>
              ) : (
                <span className="ws-kbd">/</span>
              )}
            </label>
            <button className="ws-btn" onClick={() => newFolder(here || null)}>
              <Ico d="folderPlus" size={15} /> Folder
            </button>
            <button className="ws-btn" onClick={() => fileRef.current?.click()}>
              <Ico d="importDoc" size={15} /> Import
            </button>
            <button className="ws-btn ws-btn-accent" onClick={(e) => menuAt(e, { type: "new" })}>
              New <Ico d="plus" size={15} sw={2.2} />
            </button>
          </div>
        </div>
      )}

      <div className="cv-shell" data-side={showSide ? "1" : "0"}>
        {showSide && (
          <aside className="ws-card cv-side" aria-label="Canvas navigation">
            {NAVS.map(([view, label, icon]) => {
              const n = view === "bin" ? docs.filter((d) => d.binned).length : view === "starred" ? live.filter((d) => d.starred).length : 0;
              return (
                <button key={view} className="cv-nav" aria-current={nav.view === view && !openDoc && !q ? "true" : undefined} onClick={() => goView(view)}>
                  <Ico d={icon} size={16} />
                  {label}
                  {n > 0 && <span className="cv-n">{n}</span>}
                </button>
              );
            })}
            <div className="cv-side-label">
              <span>Folders</span>
              <button className="cv-mini" onClick={() => newFolder(null)} title="New folder" aria-label="New folder"><Ico d="plus" size={13} /></button>
            </div>
            <div className="cv-tree">{renderTree(null, 0)}</div>
          </aside>
        )}

        <main
          className="cv-main"
          onDragOver={(e) => {
            if (!isFiles(e)) return;
            e.preventDefault();
            setFileOver(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setFileOver(false);
          }}
          onDrop={(e) => {
            if (!isFiles(e)) return;
            e.preventDefault();
            setFileOver(false);
            upload(e.dataTransfer.files);
          }}
        >
          {openDoc ? docView : browse}
          {fileOver && (
            <div className="cv-dropzone">
              <Ico d="upload" size={26} />
              <b>Drop to upload{here ? " to " + folderById[here]?.name : ""}</b>
              <span>PDFs, images, spreadsheets, anything up to 40 MB</span>
            </div>
          )}
        </main>
      </div>

      <input ref={fileRef} type="file" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />

      {menu && (
        <>
          <div className="cv-menu-catch" onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} />
          <div className="ws-menu cv-menu" style={{ left: menu.x, top: menu.y }} role="menu">
            {menu.type === "new" && (
              <>
                <div className="ws-menu-label">Create{here ? " in " + folderById[here]?.name : ""}</div>
                {(["page", "sheet", "tracker", "pipeline"] as Kind[]).map((k) => (
                  <button key={k} onClick={() => create(k)}>
                    <span className="cv-ktile cv-ktile-sm" style={kStyle(k)}><Ico d={KIND[k].icon} size={12} /></span>
                    {KIND[k].label}
                    <span className="ws-menu-hint">{TEMPLATES.find((t) => t.kind === k && t.blank)?.sub.split(".")[0]}</span>
                  </button>
                ))}
                <hr />
                <button onClick={() => { setMenu(null); fileRef.current?.click(); }}><Ico d="upload" size={15} /> Upload files</button>
                <button onClick={() => newFolder(here || null)}><Ico d="folderPlus" size={15} /> New folder</button>
                <button onClick={() => goView("templates")}><Ico d="template" size={15} /> From a template</button>
              </>
            )}

            {menu.type === "row" && menuDoc && (
              menuDoc.binned ? (
                <>
                  <button onClick={() => restore(menuDoc.id)}><Ico d="restore" size={15} /> Restore</button>
                  <hr />
                  <button className="ws-danger" onClick={() => destroy(menuDoc.id)}><Ico d="bin" size={15} /> Delete for good</button>
                </>
              ) : (
                <>
                  <button onClick={() => open(menuDoc.id)}><Ico d="open" size={15} /> Open</button>
                  <button onClick={() => star(menuDoc.id)}><Ico d="star" size={15} /> {menuDoc.starred ? "Unstar" : "Star"}</button>
                  <button onClick={() => { setRenaming(menuDoc.id); setMenu(null); }}><Ico d="edit" size={15} /> Rename</button>
                  <button onClick={() => duplicate(menuDoc.id)}><Ico d="copy" size={15} /> Duplicate</button>
                  <button onClick={() => { setMoveId(menuDoc.id); setMenu(null); }}><Ico d="folder" size={15} /> Move to</button>
                  <button onClick={() => copyLink(menuDoc.id)}><Ico d="link" size={15} /> Copy link</button>
                  {menuDoc.kind === "pdf" && menuDoc.folder !== "signed" && v?.goSignatures && (
                    <button onClick={() => { setMenu(null); v.goSignatures(); }}><Ico d="signDoc" size={15} /> Send for signature</button>
                  )}
                  <hr />
                  <button className="ws-danger" onClick={() => binDoc(menuDoc.id)}><Ico d="bin" size={15} /> Move to Bin</button>
                </>
              )
            )}

            {menu.type === "doc" && menuDoc && (
              <>
                <button onClick={() => duplicate(menuDoc.id)}><Ico d="copy" size={15} /> Duplicate</button>
                <button onClick={() => { setMoveId(menuDoc.id); setMenu(null); }}><Ico d="folder" size={15} /> Move to</button>
                <button onClick={() => copyLink(menuDoc.id)}><Ico d="link" size={15} /> Copy link</button>
                <hr />
                <button className="ws-danger" onClick={() => binDoc(menuDoc.id)}><Ico d="bin" size={15} /> Move to Bin</button>
              </>
            )}

            {menu.type === "share" && menuDoc && (
              <div className="cv-share">
                <div className="ws-menu-label">Who can open it</div>
                {ACCESS_OPTS.map(([a, label, hint]) => (
                  <button key={a} className="cv-share-opt" data-on={menuDoc.access === a ? "1" : undefined} onClick={() => { patchDoc(menuDoc.id, { access: a, people: a === "people" ? 3 : menuDoc.people }); say(label === "Only me" ? "Only you can open it now" : "Shared with " + label.toLowerCase()); }}>
                    <span className="cv-radio" />
                    <span className="cv-share-text"><b>{label}</b><small>{hint}</small></span>
                  </button>
                ))}
                <hr />
                <button onClick={() => copyLink(menuDoc.id)}><Ico d="link" size={15} /> Copy link</button>
              </div>
            )}
          </div>
        </>
      )}

      {moveId && (() => {
        const d = docs.find((x) => x.id === moveId);
        if (!d) return null;
        return (
          <div className="ws-scrim" onClick={() => setMoveId(null)}>
            <div className="ws-modal cv-move" role="dialog" aria-label="Move to folder" onClick={(e) => e.stopPropagation()}>
              <div className="cv-move-head">
                <b>Move “{nameOf(d)}”</b>
                <button className="ws-btn ws-btn-ghost ws-btn-sm ws-icon-btn" onClick={() => setMoveId(null)} aria-label="Close"><Ico d="x" size={14} /></button>
              </div>
              <div className="cv-move-list">
                <button className="cv-tree-row" aria-current={!d.folder ? "true" : undefined} onClick={() => moveTo(d.id, "")}>
                  <span className="cv-chev-sp" /><Ico d="home" size={15} /><span className="cv-tree-name">Canvas, no folder</span>
                </button>
                {flatFolders(null, 0).map(({ f, depth }) => (
                  <button key={f.id} className="cv-tree-row" style={{ paddingLeft: 4 + depth * 16 }} aria-current={d.folder === f.id ? "true" : undefined} onClick={() => moveTo(d.id, f.id)}>
                    <span className="cv-chev-sp" /><Ico d="folder" size={15} /><span className="cv-tree-name">{f.name}</span>
                    {d.folder === f.id && <Ico d="check" size={13} sw={2.4} style={{ marginLeft: "auto" }} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {toast && (
        <div className="ws-toast" key={toast.key} role="status">
          <span>{toast.text}</span>
          {toast.undo && (
            <button onClick={() => { toast.undo?.(); setToast(null); }}>Undo</button>
          )}
        </div>
      )}
    </div>
  );
}
