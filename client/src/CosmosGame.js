import { Application, Graphics, Text, Container, TextStyle } from 'pixi.js';

const WORLD_W = 2400;
const WORLD_H = 1600;
const PROXIMITY_RADIUS = 150;
const MOVE_SPEED = 12;

export class CosmosGame {
  constructor(canvasEl, options = {}) {
    this.canvasEl = canvasEl;
    this.onPositionChange = options.onPositionChange || (() => {});
    this.app = null;
    this.localPlayer = null;
    this.remoteUsers = new Map();
    this.myData = null;
    this.targetPos = null;
    this.viewport = { x: 0, y: 0 };
    this.zoom = 1;
    this.isPanning = false;
    this.lastMousePos = { x: 0, y: 0 };
    
    this.viewportContainer = null;
    this.bgLayer = null;
    this.worldLayer = null;
    
    this.lastMoveTime = 0;
    this.handleCanvasClick = this.handleCanvasClick.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.gameLoop = this.gameLoop.bind(this);
  }

  async init() {
    this.app = new Application();
    await this.app.init({
      canvas: this.canvasEl,
      resizeTo: window,
      backgroundColor: 0xf3f4f6,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.viewportContainer = new Container();
    this.app.stage.addChild(this.viewportContainer);

    this.bgLayer = new Container();
    this.worldLayer = new Container();
    this.viewportContainer.addChild(this.bgLayer);
    this.viewportContainer.addChild(this.worldLayer);

    this.drawBackground();

    this.canvasEl.addEventListener('mousedown', this.handleMouseDown);
    this.canvasEl.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.canvasEl.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());

    this.app.ticker.add(this.gameLoop);

    return this;
  }

  drawBackground() {
    const bg = new Graphics();
    bg.rect(0, 0, WORLD_W, WORLD_H).fill({ color: 0xf3f4f6 });
    this.bgLayer.addChild(bg);

    const gridG = new Graphics();
    const GRID_SIZE = 50;
    for (let gx = 0; gx < WORLD_W; gx += GRID_SIZE) {
      gridG.moveTo(gx, 0).lineTo(gx, WORLD_H).stroke({ color: 0xe5e7eb, width: 1 });
    }
    for (let gy = 0; gy < WORLD_H; gy += GRID_SIZE) {
      gridG.moveTo(0, gy).lineTo(WORLD_W, gy).stroke({ color: 0xe5e7eb, width: 1 });
    }
    this.bgLayer.addChild(gridG);

    this.drawHouse(200, 200, 'Central Hub');
    this.drawHouse(1800, 300, 'Green House');
    this.drawFarm(400, 1000, 'Solar Farm');
    this.drawFarm(1700, 1100, 'Water Treatment');
    this.drawPark(1000, 600, 'Community Center');
  }

  drawHouse(x, y, name) {
    const g = new Graphics();
    g.rect(x, y, 160, 160).fill({ color: 0xffffff }).stroke({ color: 0xd1d5db, width: 2 });
    g.moveTo(x, y).lineTo(x + 80, y - 60).lineTo(x + 160, y).fill({ color: 0x4f46e5 });
    this.bgLayer.addChild(g);
    const text = new Text({ text: name, style: { fontSize: 14, fill: 0x9ca3af, fontWeight: '700' } });
    text.x = x + 80; text.y = y + 175; text.anchor.set(0.5, 0);
    this.bgLayer.addChild(text);
  }

  drawFarm(x, y, name) {
    const g = new Graphics();
    g.rect(x, y, 200, 140).fill({ color: 0xecfdf5 }).stroke({ color: 0x10b981, width: 2, alpha: 0.3 });
    for(let i=1; i<4; i++) { g.rect(x + i*40, y + 20, 20, 100).fill({ color: 0xdcfce7 }); }
    this.bgLayer.addChild(g);
    const text = new Text({ text: name, style: { fontSize: 14, fill: 0x10b981, fontWeight: '700' } });
    text.x = x + 100; text.y = y + 155; text.anchor.set(0.5, 0);
    this.bgLayer.addChild(text);
  }

  drawPark(x, y, name) {
    const g = new Graphics();
    g.circle(x + 150, y + 150, 150).fill({ color: 0xeff6ff }).stroke({ color: 0x3b82f6, width: 2, alpha: 0.2 });
    this.bgLayer.addChild(g);
    const text = new Text({ text: name, style: { fontSize: 16, fill: 0x3b82f6, fontWeight: '800' } });
    text.x = x + 150; text.y = y + 315; text.anchor.set(0.5, 0);
    this.bgLayer.addChild(text);
  }

  handleMouseDown(e) {
    if (e.button === 2) {
      this.isPanning = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    } else if (e.button === 0) {
      this.handleCanvasClick(e);
    }
  }

  handleMouseMove(e) {
    if (this.isPanning) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;
      this.viewport.x -= dx / this.zoom;
      this.viewport.y -= dy / this.zoom;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.applyViewport();
    }
  }

  handleMouseUp(e) {
    if (e.button === 2) {
      this.isPanning = false;
    }
  }

  handleWheel(e) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(3, this.zoom * factor));
    
    // Zoom toward mouse position
    const rect = this.canvasEl.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left);
    const mouseY = (e.clientY - rect.top);
    
    const worldX = mouseX / this.zoom + this.viewport.x;
    const worldY = mouseY / this.zoom + this.viewport.y;
    
    this.zoom = newZoom;
    this.viewport.x = worldX - mouseX / this.zoom;
    this.viewport.y = worldY - mouseY / this.zoom;
    
    this.applyViewport();
  }

  handleCanvasClick(e) {
    if (!this.myData) return;
    const rect = this.canvasEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / this.zoom + this.viewport.x;
    const y = (e.clientY - rect.top) / this.zoom + this.viewport.y;
    this.targetPos = { x, y };
  }

  createPlayerSprite(userData, isLocal = false) {
    const container = new Container();
    const colorHex = parseInt(userData.color.replace('#', ''), 16);
    if (isLocal) {
      const ring = new Graphics();
      ring.circle(0, 0, PROXIMITY_RADIUS).stroke({ color: colorHex, alpha: 0.15, width: 2 });
      container.addChild(ring);
      const halo = new Graphics();
      halo.circle(0, 0, 22).fill({ color: colorHex, alpha: 0.1 });
      container.addChild(halo);
    }
    const body = new Graphics();
    body.circle(0, 0, 18).fill({ color: colorHex });
    container.addChild(body);
    const labelContainer = new Container();
    const style = new TextStyle({ fontFamily: 'Outfit', fontSize: 12, fill: 0x374151, fontWeight: '700' });
    const label = new Text({ text: userData.username, style });
    label.anchor.set(0.5, 0.5);
    const bgWidth = label.width + 12;
    const bgHeight = label.height + 6;
    const labelBg = new Graphics();
    labelBg.roundRect(-bgWidth/2, -bgHeight/2, bgWidth, bgHeight, 4).fill({ color: 0xffffff, alpha: 0.8 });
    labelContainer.addChild(labelBg);
    labelContainer.addChild(label);
    labelContainer.y = 35;
    container.addChild(labelContainer);
    container.x = userData.x;
    container.y = userData.y;
    return container;
  }

  spawnLocalPlayer(userData) {
    this.myData = userData;
    if (this.localPlayer) this.worldLayer.removeChild(this.localPlayer);
    this.localPlayer = this.createPlayerSprite(userData, true);
    this.worldLayer.addChild(this.localPlayer);
    this.centerViewport();
  }

  updateUsers(userList) {
    if (!this.myData) return;
    const currentIds = new Set(userList.map((u) => u.userId));
    for (const [uid, entry] of this.remoteUsers) {
      if (!currentIds.has(uid)) { this.worldLayer.removeChild(entry.container); this.remoteUsers.delete(uid); }
    }
    for (const user of userList) {
      if (user.userId === this.myData.userId) continue;
      if (this.remoteUsers.has(user.userId)) {
        const entry = this.remoteUsers.get(user.userId);
        entry.container.x = user.x;
        entry.container.y = user.y;
        entry.data = user;
      } else {
        const container = this.createPlayerSprite(user, false);
        this.worldLayer.addChild(container);
        this.remoteUsers.set(user.userId, { container, data: user });
      }
    }
  }

  showEmote(userId, emoji) {
    const container = userId === this.myData?.userId ? this.localPlayer : this.remoteUsers.get(userId)?.container;
    if (!container) return;
    const emote = new Text({ text: emoji, style: { fontSize: 32 } });
    emote.anchor.set(0.5, 1); emote.y = -30; emote.alpha = 0;
    container.addChild(emote);
    const ticker = (delta) => {
      emote.alpha += 0.1 * delta;
      emote.y -= 2 * delta;
      if (emote.y < -100) { emote.alpha -= 0.1 * delta; if (emote.alpha <= 0) { container.removeChild(emote); this.app.ticker.remove(ticker); } }
    };
    this.app.ticker.add(ticker);
  }

  centerViewport() {
    if (!this.myData || !this.app) return;
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;
    this.viewport.x = this.myData.x - (sw / this.zoom) / 2;
    this.viewport.y = this.myData.y - (sh / this.zoom) / 2;
  }

  applyViewport() {
    if (!this.viewportContainer) return;
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;
    
    // Constraints (optional, keep it free-form for better scrolling)
    // this.viewport.x = Math.max(0, Math.min(WORLD_W - sw/this.zoom, this.viewport.x));
    // this.viewport.y = Math.max(0, Math.min(WORLD_H - sh/this.zoom, this.viewport.y));
    
    this.viewportContainer.scale.set(this.zoom);
    this.viewportContainer.x = -this.viewport.x * this.zoom;
    this.viewportContainer.y = -this.viewport.y * this.zoom;
  }

  gameLoop() {
    if (!this.myData || !this.localPlayer) return;
    if (this.targetPos) {
      const dx = this.targetPos.x - this.myData.x;
      const dy = this.targetPos.y - this.myData.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        const angle = Math.atan2(dy, dx);
        this.myData.x += Math.cos(angle) * MOVE_SPEED;
        this.myData.y += Math.sin(angle) * MOVE_SPEED;
        this.localPlayer.x = this.myData.x;
        this.localPlayer.y = this.myData.y;
        
        if (!this.isPanning) {
          const sw = this.app.screen.width;
          const sh = this.app.screen.height;
          const targetVX = this.myData.x - (sw / this.zoom) / 2;
          const targetVY = this.myData.y - (sh / this.zoom) / 2;
          this.viewport.x += (targetVX - this.viewport.x) * 0.1;
          this.viewport.y += (targetVY - this.viewport.y) * 0.1;
        }

        const now = Date.now();
        if (now - this.lastMoveTime > 30) { 
          this.lastMoveTime = now; 
          this.onPositionChange({ x: this.myData.x, y: this.myData.y }); 
        }
      } else { this.targetPos = null; }
    }
    this.applyViewport();
  }

  getMinimapData() {
    if (!this.myData) return null;
    const allUsers = [{ ...this.myData, isLocal: true }, ...Array.from(this.remoteUsers.values()).map((e) => ({ ...e.data, isLocal: false }))];
    return { allUsers, worldW: WORLD_W, worldH: WORLD_H };
  }

  resize() { if (this.localPlayer) this.centerViewport(); }
  destroy() { 
    this.canvasEl.removeEventListener('mousedown', this.handleMouseDown); 
    this.canvasEl.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.canvasEl.removeEventListener('wheel', this.handleWheel);
    if (this.app) this.app.destroy(false, { children: true }); 
  }
}
export default CosmosGame;
