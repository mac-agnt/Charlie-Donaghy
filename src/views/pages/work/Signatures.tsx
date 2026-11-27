import "../../../styles/signatures.css";
import { useEffect } from "react";
import { getPersist, usePersist } from "../../../components/usePersist";
import { Ico } from "./Ico";
import { Overlay } from "./signatures/AdoptModal";
import { EnvelopeView } from "./signatures/EnvelopeView";
import { SignList } from "./signatures/SignList";
import * as M from "./signatures/model";

/* Work › Signatures: send a PDF, place fields, sign, and keep the certificate.
   Frontend only; other signers are played on timers in signatures/model.ts. */
export default function Signatures({ v }: { v: any }) {
  const [list] = usePersist<M.Envelope[]>(M.K.envs, M.seedAll);
  const [open] = usePersist<string | null>(M.K.open, null);
  const [toast, setToast] = usePersist<M.Toast>(M.K.toast, null);

  M.bindWaiting(v?.setSignWaiting);
  const waiting = M.waitingCount(list);
  useEffect(() => { M.reportWaiting(waiting); }, [waiting]);

  const env = open ? list.find((e) => e.id === open) : undefined;
  useEffect(() => { document.querySelector("[data-scroll-main]")?.scrollTo({ top: 0 }); }, [env?.id]);

  /* A file dropped anywhere on this tab must not navigate the browser away.
     On the list it starts an envelope; the drop zone handles its own drops first. */
  useEffect(() => {
    const over = (e: DragEvent) => { if (e.dataTransfer?.types.includes("Files")) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      const file = e.dataTransfer?.files?.[0];
      if (e.defaultPrevented || !file) return;
      e.preventDefault();
      if (!getPersist<string | null>(M.K.open, null)) M.fromFile(file).then((err) => { if (err) M.toast(err); });
    };
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, []);

  return (
    <div className="ws-page sg-root">
      {env ? <EnvelopeView key={env.id} env={env} v={v} /> : <SignList v={v} list={list} />}
      {toast && (
        <Overlay>
          <div className="ws-toast" role="status" key={toast.id}>
            <span>{toast.text}</span>
            <button onClick={() => setToast(null)} aria-label="Dismiss"><Ico d="x" size={12} /></button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
