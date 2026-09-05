export const isMobile = /Mobi/i.test(navigator.userAgent);
export function isPortrait() {
  return (
    screen.orientation.type == "portrait-primary" ||
    screen.orientation.type == "portrait-secondary"
  );
}

if (isMobile) document.body.classList.add("mobile");
