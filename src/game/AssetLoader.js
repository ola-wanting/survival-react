const ASSET_URLS = {
  player: new URL('../assets/image_0_player.png', import.meta.url).href,
  normalMonster: new URL('../assets/image_1_normal_monster.png', import.meta.url).href,
  fastMonster: new URL('../assets/image_2_fast_monster.png', import.meta.url).href,
  tankMonster: new URL('../assets/image_3_tank_monster.png', import.meta.url).href,
  zigzagMonster: new URL('../assets/image_4_zigzag_monster.png', import.meta.url).href,
  homingMonster: new URL('../assets/image_5_homing_monster.png', import.meta.url).href,
  splitterMonster: new URL('../assets/image_6_splitter_monster.png', import.meta.url).href,
  teleporterMonster: new URL('../assets/image_7_teleporter_monster.png', import.meta.url).href,
  explosionPowerUp: new URL('../assets/image_8_explosion_powerup.png', import.meta.url).href,
  shieldPowerUp: new URL('../assets/image_9_shield_powerup.png', import.meta.url).href,
  speedPowerUp: new URL('../assets/image_10_speed_powerup.png', import.meta.url).href,
  timeStopPowerUp: new URL('../assets/image_11_time_stop_powerup.png', import.meta.url).href,
  activeShieldIndicator: new URL('../assets/image_12_active_shield_indicator.png', import.meta.url).href,
  activeSpeedIndicator: new URL('../assets/image_13_active_speed_indicator.png', import.meta.url).href,
  activeTimeStopIndicator: new URL('../assets/image_14_active_time_stop_indicator.png', import.meta.url).href,
  background: new URL('../assets/background.png', import.meta.url).href,
};

class AssetLoader {
  constructor() {
    this.images = {};
    this.loaded = false;
  }

  async loadAll() {
    const promises = Object.entries(ASSET_URLS).map(([key, url]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.images[key] = img;
          resolve();
        };
        img.onerror = () => {
          // Silently fail — render methods will fall back to canvas/CSS drawing
          resolve();
        };
        img.src = url;
      });
    });

    await Promise.all(promises);
    this.loaded = true;
    return this.images;
  }

  get(key) {
    return this.images[key] || null;
  }

  has(key) {
    return !!this.images[key];
  }
}

export default AssetLoader;
