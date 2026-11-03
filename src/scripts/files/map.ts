import { getAllowMap, updateFileControls } from "./controls";
import {
  getTiles,
  type Tile,
  SIDES_ARR,
  SIDES,
  getTile,
  OPPOSITE,
} from "./tiles";

import paperIcon from "../../assets/aseprite/mapicon-paper.png";
import folderIcon from "../../assets/aseprite/mapicon-folder.png";

const map = document.getElementById("map") as HTMLCanvasElement;
const ctx = map.getContext("2d") as CanvasRenderingContext2D;

const TILE_SIZE = 16;
ctx.strokeStyle = "white";
ctx.lineWidth = 2;
ctx.imageSmoothingEnabled = false;

const title = document.getElementById("files-title") as HTMLHeadingElement;

export let filesPlayerX = 0,
  filesPlayerY = 0;

export function updateFilesPlayerVars(x = 0, y = 0) {
  filesPlayerX += x;
  filesPlayerY += y;
}

const load = (src: string) => Object.assign(new Image(), { src });
const paperImg = load(paperIcon);
const folderImg = load(folderIcon);

function drawTileIcon(img: HTMLImageElement, x: number, y: number) {
  if (img.complete) ctx.drawImage(img, x + TILE_SIZE / 4, y + TILE_SIZE / 4);
}

export function updateFileMap() {
  if (getAllowMap() && !title.style.opacity) {
    title.style.opacity = "1";
    title.style.translate = "0";
  }

  const tiles = getTiles();
  let playerTile;

  ctx.clearRect(0, 0, map.width, map.height);

  const nextIntro = Math.min(
    ...Object.values(tiles)
      .filter((t) => t.intro)
      .map((t) => t.intro!),
  );

  const byPos = new Map<string, Tile>();
  for (const tile in tiles)
    byPos.set(`${tiles[tile].x},${tiles[tile].y}`, tiles[tile]);

  const hasWall = (tile: Tile, side: keyof typeof OPPOSITE) => {
    const v = SIDES[side];
    const n = byPos.get(`${tile.x + v.x},${tile.y - v.z}`);
    return tile.sides.includes(side) || !!n?.sides.includes(OPPOSITE[side]);
  };

  const exposed = (tile: Tile) =>
    SIDES_ARR.some((side) => {
      if (side === "down" || tile.sides.includes(side)) return false;
      const v = SIDES[side];
      return !byPos.has(`${tile.x + v.x},${tile.y - v.z}`);
    });

  for (const tile in tiles) {
    const data = tiles[tile];
    if (data.intro && data.intro !== nextIntro) continue;

    if (!map.style.visibility) map.style.visibility = "visible";

    const x =
        map.width / 2 + (data.x - filesPlayerX) * TILE_SIZE - TILE_SIZE / 2,
      y = map.height - TILE_SIZE * (data.y - filesPlayerY + 2);

    if (data.intro || (data.faded && exposed(data))) ctx.globalAlpha = 0.5;
    if (data.start || data.type == "Exit") ctx.fillStyle = "#403204";
    else ctx.fillStyle = "#1c0333";

    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    if (data.x == filesPlayerX && data.y == filesPlayerY) playerTile = data;

    switch (data.type) {
      case "Document":
        drawTileIcon(paperImg, x, y);
        break;
      case "Folder":
        if (!playerTile) drawTileIcon(folderImg, x, y);
        break;
    }

    ctx.beginPath();
    if (hasWall(data, "left")) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + TILE_SIZE);
    }
    if (hasWall(data, "right")) {
      ctx.moveTo(x + TILE_SIZE, y);
      ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
    }
    if (hasWall(data, "forward")) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + TILE_SIZE, y);
    }
    if (hasWall(data, "back")) {
      ctx.moveTo(x, y + TILE_SIZE);
      ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
    }
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  if (playerTile) {
    if (playerTile.intro || (playerTile.faded && exposed(playerTile)))
      ctx.globalAlpha = 0.5;

    ctx.beginPath();
    ctx.ellipse(
      map.width / 2,
      map.height - TILE_SIZE * 1.5,
      TILE_SIZE / 4,
      TILE_SIZE / 4,
      0,
      0,
      2 * Math.PI,
    );
    ctx.stroke();

    if (getTile(0, 0)?.canMove) updateFileControls(playerTile);

    ctx.globalAlpha = 1;
  }
}
