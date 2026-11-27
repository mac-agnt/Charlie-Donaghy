import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Ico, type IcoName } from "../Ico";
import { uid, type Block, type BlockType, type Doc } from "./model";

type Props = {
  doc: Doc;
  blocks: Block[];
  update: (fn: (b: Block[]) => Block[]) => void;
  onTitle: (title: string) => void;
};

const SLASH: { type: BlockType; label: string; hint: string; icon: IcoName }[] = [
  { type: "p", label: "Text", hint: "", icon: "text" },
  { type: "h1", label: "Heading 1", hint: "#", icon: "heading" },
  { type: "h2", label: "Heading 2", hint: "##", icon: "heading" },
  { type: "h3", label: "Heading 3", hint: "###", icon: "heading" },
  { type: "todo", label: "To-do list", hint: "[]", icon: "checkbox" },
  { type: "bullet", label: "Bulleted list", hint: "-", icon: "list" },
  { type: "number", label: "Numbered list", hint: "1.", icon: "list" },
  { type: "quote", label: "Quote", hint: ">", icon: "quote" },
  { type: "callout", label: "Callout", hint: "!", icon: "callout" },
  { type: "divider", label: "Divider", hint: "---", icon: "divider" },
];

const PLACEHOLDER: Record<BlockType, string> = {
  p: "Type / for blocks, or just write",
  h1: "Heading 1", h2: "Heading 2", h3: "Heading 3",
  todo: "To-do", bullet: "List", number: "List", quote: "Quote", callout: "Something worth calling out", divider: "",
};

const SHORTCUTS: [RegExp, BlockType][] = [
  [/^#\s/, "h1"], [/^##\s/, "h2"], [/^###\s/, "h3"], [/^[-*]\s/, "bullet"], [/^1[.)]\s/, "number"],
  [/^\[\s?\]\s/, "todo"], [/^>\s/, "quote"], [/^!\s/, "callout"],
];

const LISTY = new Set<BlockType>(["bullet", "number", "todo"]);

function heliosText(doc: Doc, blocks: Block[]): string {
  const filled = blocks.filter((b) => b.text.trim());
  if (filled.length < 3) {
    return "Charlie AI: a first pass at “" + (doc.title || "this page") + "”. Open with why it matters, then who owns it and what has to happen by Friday. Type / and pick To-do list to capture the actions.";
  }
  const heads = blocks.filter((b) => /^h[123]$/.test(b.type) && b.text.trim()).map((b) => b.text.trim());
  const open = blocks.filter((b) => b.type === "todo" && !b.checked && b.text.trim());
  return (
    "Charlie AI summary: " + (heads.length ? heads.length + " sections (" + heads.slice(0, 3).join(", ") + "). " : "") +
    (open.length
      ? open.length + " open to-do" + (open.length > 1 ? "s" : "") + ". Next up is “" + open[0].text.trim().replace(/\.$/, "") + "”. Want these as tasks in Work?"
      : "Nothing left open. This one is ready to share.")
  );
}

function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "0px";
  el.style.height = el.scrollHeight + "px";
}

export default function CanvasPage({ doc, blocks, update, onTitle }: Props) {
  const refs = useRef(new Map<string, HTMLTextAreaElement>());
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const pending = useRef<{ id: string; pos: number } | null>(null);
  const streamTimer = useRef<number | undefined>(undefined);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [slash, setSlash] = useState<null | { id: string; q: string; hot: number }>(null);
  const [streaming, setStreaming] = useState(false);

  const flush = () => {
    const p = pending.current;
    if (!p) return;
    const el = refs.current.get(p.id);
    if (!el) return;
    pending.current = null;
    el.focus();
    const pos = Math.min(p.pos, el.value.length);
    el.setSelectionRange(pos, pos);
  };
  useLayoutEffect(flush);
  useLayoutEffect(() => autosize(titleRef.current), [doc.title]);
  useEffect(() => () => window.clearInterval(streamTimer.current), []);
  useEffect(() => {
    const onResize = () => refs.current.forEach((el) => autosize(el));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const focusAt = (id: string, pos: number) => {
    pending.current = { id, pos };
    requestAnimationFrame(flush);
  };

  const setBlock = (id: string, patch: Partial<Block>) => update((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const slashItems = slash ? SLASH.filter((s) => s.label.toLowerCase().includes(slash.q.toLowerCase())) : [];

  const applyType = (id: string, type: BlockType) => {
    if (type === "divider") {
      const nb: Block = { id: uid("b"), type: "p", text: "" };
      update((bs) => {
        const i = bs.findIndex((b) => b.id === id);
        const out = bs.slice();
        out.splice(i, 1, { id, type: "divider", text: "" }, nb);
        return out;
      });
      focusAt(nb.id, 0);
    } else {
      setBlock(id, { type, text: "", checked: type === "todo" ? false : undefined });
      focusAt(id, 0);
    }
    setSlash(null);
  };

  const onChange = (b: Block, value: string) => {
    if (value.startsWith("/") && (b.text === "" || b.text.startsWith("/"))) setSlash({ id: b.id, q: value.slice(1), hot: 0 });
    else if (slash?.id === b.id) setSlash(null);
    if (value === "---") return applyType(b.id, "divider");
    for (const [re, t] of SHORTCUTS) {
      const m = re.exec(value);
      if (m && t !== b.type) {
        setBlock(b.id, { type: t, text: value.slice(m[0].length), checked: t === "todo" ? false : undefined });
        focusAt(b.id, 0);
        return;
      }
    }
    setBlock(b.id, { text: value });
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>, b: Block, i: number) => {
    if (slash && slash.id === b.id) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlash({ ...slash, hot: (slash.hot + 1) % Math.max(1, slashItems.length) }); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlash({ ...slash, hot: (slash.hot - 1 + slashItems.length) % Math.max(1, slashItems.length) }); return; }
      if (e.key === "Enter" && slashItems.length) { e.preventDefault(); applyType(b.id, slashItems[Math.min(slash.hot, slashItems.length - 1)].type); return; }
      if (e.key === "Escape") { e.preventDefault(); setSlash(null); return; }
    }
    const el = e.currentTarget;
    const pos = el.selectionStart, end = el.selectionEnd;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (LISTY.has(b.type) && b.text === "") return setBlock(b.id, { type: "p", checked: undefined });
      const nt: BlockType = LISTY.has(b.type) ? b.type : "p";
      const nb: Block = { id: uid("b"), type: nt, text: b.text.slice(end), checked: nt === "todo" ? false : undefined };
      update((bs) => {
        const idx = bs.findIndex((x) => x.id === b.id);
        const out = bs.slice();
        out[idx] = { ...out[idx], text: b.text.slice(0, pos) };
        out.splice(idx + 1, 0, nb);
        return out;
      });
      focusAt(nb.id, 0);
      return;
    }
    if (e.key === "Backspace" && pos === 0 && end === 0) {
      if (b.type !== "p") { e.preventDefault(); setBlock(b.id, { type: "p", checked: undefined }); return; }
      if (i > 0) {
        e.preventDefault();
        const prev = blocks[i - 1];
        if (prev.type === "divider") {
          update((bs) => bs.filter((x) => x.id !== prev.id));
          focusAt(b.id, 0);
          return;
        }
        const join = prev.text.length;
        update((bs) => bs.filter((x) => x.id !== b.id).map((x) => (x.id === prev.id ? { ...x, text: x.text + b.text } : x)));
        focusAt(prev.id, join);
      }
      return;
    }
    if (e.key === "ArrowUp" && pos === 0 && end === 0) {
      const prev = blocks.slice(0, i).reverse().find((x) => x.type !== "divider");
      if (prev) { e.preventDefault(); focusAt(prev.id, prev.text.length); }
      else { e.preventDefault(); titleRef.current?.focus(); }
      return;
    }
    if (e.key === "ArrowDown" && pos === b.text.length) {
      const next = blocks.slice(i + 1).find((x) => x.type !== "divider");
      if (next) { e.preventDefault(); focusAt(next.id, 0); }
    }
  };

  const addBelow = (id: string) => {
    const nb: Block = { id: uid("b"), type: "p", text: "/" };
    update((bs) => {
      const i = bs.findIndex((b) => b.id === id);
      const out = bs.slice();
      out.splice(i + 1, 0, nb);
      return out;
    });
    setSlash({ id: nb.id, q: "", hot: 0 });
    focusAt(nb.id, 1);
  };

  const tailClick = () => {
    const last = blocks[blocks.length - 1];
    if (last && last.type === "p" && !last.text) return focusAt(last.id, 0);
    const nb: Block = { id: uid("b"), type: "p", text: "" };
    update((bs) => [...bs, nb]);
    focusAt(nb.id, 0);
  };

  const draft = () => {
    if (streaming) return;
    const text = heliosText(doc, blocks);
    const nb: Block = { id: uid("b"), type: "callout", text: "" };
    update((bs) => {
      const last = bs[bs.length - 1];
      return last && last.type === "p" && !last.text ? [...bs.slice(0, -1), nb] : [...bs, nb];
    });
    setStreaming(true);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let n = 0;
    streamTimer.current = window.setInterval(() => {
      n = reduce ? text.length : Math.min(text.length, n + 3);
      update((bs) => bs.map((b) => (b.id === nb.id ? { ...b, text: text.slice(0, n) } : b)));
      if (n >= text.length) {
        window.clearInterval(streamTimer.current);
        setStreaming(false);
      }
    }, 18);
  };

  let numberRun = 0;

  return (
    <div className="cv-pagewrap">
      <div className="cv-page">
        <textarea
          ref={titleRef}
          className="cv-title"
          rows={1}
          value={doc.title}
          placeholder="Untitled"
          aria-label="Page title"
          onChange={(e) => onTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || (e.key === "ArrowDown" && e.currentTarget.selectionStart === doc.title.length)) {
              e.preventDefault();
              if (blocks[0]) focusAt(blocks[0].id, 0);
              else tailClick();
            }
          }}
        />
        <div className="cv-page-tools">
          <button className="ws-btn ws-btn-sm ws-btn-ghost" onClick={draft} disabled={streaming}>
            <Ico d="sparkle" size={13} /> {streaming ? "Charlie AI is writing" : "Draft with Charlie AI"}
          </button>
          <span className="cv-page-hint">Type <span className="ws-kbd">/</span> for headings, to-dos, callouts</span>
        </div>

        {blocks.map((b, i) => {
          numberRun = b.type === "number" ? numberRun + 1 : 0;
          if (b.type === "divider") {
            return (
              <div key={b.id} className="cv-block cv-b-divider">
                <hr className="cv-hr" />
                <div className="cv-gutter">
                  <button onClick={() => update((bs) => bs.filter((x) => x.id !== b.id))} title="Remove divider" aria-label="Remove divider">
                    <Ico d="x" size={13} />
                  </button>
                </div>
              </div>
            );
          }
          return (
            <div key={b.id} className={"cv-block cv-b-" + b.type} data-checked={b.checked ? "1" : undefined}>
              <div className="cv-gutter">
                <button onClick={() => addBelow(b.id)} title="Add a block below" aria-label="Add a block below">
                  <Ico d="plus" size={14} />
                </button>
              </div>
              {b.type === "todo" && (
                <button className="cv-check" data-on={b.checked ? "1" : undefined} onClick={() => setBlock(b.id, { checked: !b.checked })} aria-label={b.checked ? "Mark not done" : "Mark done"}>
                  <Ico d="check" size={11} sw={3} style={{ opacity: b.checked ? 1 : 0 }} />
                </button>
              )}
              {b.type === "bullet" && <span className="cv-bullet"><i /></span>}
              {b.type === "number" && <span className="cv-num">{numberRun}.</span>}
              {b.type === "quote" && <Ico d="quote" size={16} className="cv-quote-ico" />}
              {b.type === "callout" && <Ico d="sparkle" size={16} className="cv-callout-ico" />}
              <textarea
                ref={(el) => {
                  if (el) {
                    refs.current.set(b.id, el);
                    autosize(el);
                  } else refs.current.delete(b.id);
                }}
                rows={1}
                value={b.text}
                placeholder={focusId === b.id || blocks.length === 1 ? PLACEHOLDER[b.type] : b.type === "p" ? "" : PLACEHOLDER[b.type]}
                onChange={(e) => {
                  onChange(b, e.target.value);
                  autosize(e.target);
                }}
                onKeyDown={(e) => onKey(e, b, i)}
                onFocus={() => setFocusId(b.id)}
                onBlur={() => {
                  setFocusId((f) => (f === b.id ? null : f));
                  window.setTimeout(() => setSlash((s) => (s?.id === b.id ? null : s)), 150);
                }}
              />
              {slash?.id === b.id && (
                <div className="ws-menu cv-slash" role="listbox">
                  <div className="ws-menu-label">Blocks</div>
                  {slashItems.length ? (
                    slashItems.map((s, k) => (
                      <button
                        key={s.type}
                        data-hot={k === slash.hot ? "1" : undefined}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyType(b.id, s.type);
                        }}
                        onMouseEnter={() => setSlash({ ...slash, hot: k })}
                      >
                        <span className="cv-slash-ico"><Ico d={s.icon} size={14} /></span>
                        {s.label}
                        {s.hint && <span className="ws-menu-hint">{s.hint}</span>}
                      </button>
                    ))
                  ) : (
                    <div className="cv-slash-none">No block called that</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div className="cv-page-tail" onClick={tailClick} aria-hidden="true" />
      </div>
    </div>
  );
}
