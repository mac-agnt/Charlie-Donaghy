/* Prints one document element on its own, using the app's styles, through a
   hidden iframe so the drawer and the rest of the page never print. */
export function printElement(el: HTMLElement | null, title: string) {
  if (!el) return;
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  const styles = Array.from(document.querySelectorAll("style,link[rel=stylesheet]")).map((n) => n.outerHTML).join("");
  doc.open();
  doc.write(
    "<!doctype html><html><head><meta charset='utf-8'><title>" + title + "</title>" + styles +
      "<style>@page{margin:14mm}html,body{background:#fff!important;margin:0}.fm-doc{box-shadow:none!important;max-width:none!important;padding:0!important}</style></head><body>" +
      el.outerHTML + "</body></html>"
  );
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1500);
  }, 350);
}
