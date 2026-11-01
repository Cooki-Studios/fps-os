import { getAllowMap, updateFileControls } from "./controls";
import { getTiles, type Tile, SIDES_ARR, SIDES, getTile } from "./tiles";

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

async function drawTileIcon(src: string, x: number, y: number, alpha: number) {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.src = src;
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(err);
  });

  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x + TILE_SIZE / 4, y + TILE_SIZE / 4);
  ctx.globalAlpha = 1;
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

  const occupied = new Set<string>();
  for (const tile in tiles) occupied.add(`${tiles[tile].x},${tiles[tile].y}`);

  const exposed = (tile: Tile) =>
    SIDES_ARR.some((side) => {
      if (side === "down" || tile.sides.includes(side)) return false;
      const v = SIDES[side];
      return !occupied.has(`${tile.x + v.x},${tile.y - v.z}`);
    });

  for (const tile in tiles) {
    const data = tiles[tile];
    if (data.intro && data.intro !== nextIntro) continue;

    if (!map.style.visibility) map.style.visibility = "visible";

    const x =
        map.width / 2 + (data.x - filesPlayerX) * TILE_SIZE - TILE_SIZE / 2,
      y = map.height - TILE_SIZE * (data.y - filesPlayerY + 2);

    if (data.intro || (data.faded && exposed(data))) ctx.globalAlpha = 0.5;
    if (data.start) ctx.fillStyle = "#400404";
    else ctx.fillStyle = "#1c0333";

    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    if (data.x == filesPlayerX && data.y == filesPlayerY) playerTile = data;

    switch (data.type) {
      case "Document":
        drawTileIcon(paperIcon, x, y, ctx.globalAlpha);
        break;
      case "Folder":
        if (!playerTile) drawTileIcon(folderIcon, x, y, ctx.globalAlpha);
        break;
    }

    for (const side of data["sides"]) {
      ctx.beginPath();

      switch (side) {
        case "left":
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + TILE_SIZE);
          break;
        case "right":
          ctx.moveTo(x + TILE_SIZE, y);
          ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
          break;
        case "forward":
          ctx.moveTo(x, y);
          ctx.lineTo(x + TILE_SIZE, y);
          break;
        case "back":
          ctx.moveTo(x, y + TILE_SIZE);
          ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
          break;
      }

      ctx.closePath();
      ctx.stroke();
    }

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
