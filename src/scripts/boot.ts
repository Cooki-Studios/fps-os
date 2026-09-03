const start = performance.now();
const log = document.getElementById("bootlog") as HTMLElement;
let blink: number | undefined;

let queue: Promise<void> = Promise.resolve();
export function bootFinished(): Promise<void> {
  return queue;
}

export function bootLog(msg: string, hideTime = false) {
  queue = queue.then(async () => {
    if (blink) clearTimeout(blink);
    msg += "\n_";

    const span = document.createElement("span");
    if (hideTime) span.textContent = msg;
    else
      span.textContent = `[${(performance.now() - start).toFixed(1).padStart(7)}] ${msg}`;
    if (log.lastChild && log.lastChild.textContent)
      log.lastChild.textContent = log.lastChild.textContent.slice(0, -1);

    log.appendChild(span);
    log.scrollTo({
      top: log.scrollHeight,
    });
    restartBlink();

    // https://stackoverflow.com/a/37764963
    await new Promise((f) => setTimeout(f, 0));
  });
  return queue;
}

function restartBlink() {
  blink = setTimeout(() => {
    if (!log.lastChild || !log.lastChild.textContent) return restartBlink();
    if (log.lastChild.textContent.endsWith("_"))
      log.lastChild.textContent = log.lastChild.textContent.slice(0, -1) + " ";
    else
      log.lastChild.textContent = log.lastChild.textContent.slice(0, -1) + "_";
    restartBlink();
  }, 500);
}

bootLog("Boot process started");
