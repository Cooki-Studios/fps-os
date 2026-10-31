import { playAudio, setAudioVolume } from "../system/audio";
import dialogueJson from "./dialogue.json" with { type: "json" };

import whoImg from "../../assets/aseprite/dialogue-who.png";
import tskmgrImg from "../../assets/aseprite/dialogue-tskmgr.png";
import { showFileCtrl } from "./controls";

const dialogue = document.getElementById("files-dialogue") as HTMLDivElement,
  diaTitle = dialogue.querySelector("#files-text h1") as HTMLHeadingElement,
  text = dialogue.querySelector("#files-text p") as HTMLParagraphElement,
  diaImg = dialogue.querySelector("img") as HTMLImageElement;

export function introDialogue() {
  setTimeout(() => {
    setAudioVolume("global", "music/NIVIRO - The Riot [NCS Release]", 0.15);

    dialogue.style.visibility = "visible";

    playAudio("global", "files/intro", 0, 0, 1);
    readDialogue("intro1");

    setTimeout(() => {
      readDialogue("intro2", "Task Manager");
    }, 4500);

    setTimeout(() => {
      setAudioVolume("global", "music/NIVIRO - The Riot [NCS Release]", 0.25);
      showFileCtrl();
    }, 9600);
  }, 2200);
}

let dialogueTimeout: number;

export function readDialogue(
  name: keyof typeof dialogueJson,
  who: "???" | "Task Manager" = "???",
  speed = 1,
) {
  text.textContent = "";
  diaTitle.textContent = who;

  switch (who) {
    case "Task Manager":
      diaImg.src = tskmgrImg;
      break;
    default:
      diaImg.src = whoImg;
      break;
  }

  clearTimeout(dialogueTimeout);
  dialogue.style.visibility = "visible";

  const dText = dialogueJson[name] as string;
  dText.split("").forEach((letter, index) => {
    setTimeout(
      () => {
        text.textContent += letter;
        if (text.textContent == dText)
          dialogueTimeout = setTimeout(
            () => (dialogue.style.visibility = "hidden"),
            1000,
          );
      },
      index * (90 / speed),
    );
  });
}
