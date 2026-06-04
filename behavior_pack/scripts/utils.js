import { system, Player, EquipmentSlot } from "@minecraft/server";
import {
  DYNAMIC_PROP_RECENTLY_DAMAGED,
  DYNAMIC_PROP_HAS_ACTIVE_PAPER,
  DAMAGE_LOCKOUT_TICKS,
  ARMOR_SLOTS,
  ERROR_MESSAGES,
  SAVE_ID_LORE_PREFIX,
  SOUL_PAPER_ID,
  UNSUPPORTED_ITEMS,
} from "./constants.js";

export function getCooldownRemaining(player, propKey, cooldownTicks) {
  const lastTick = player.getDynamicProperty(propKey);
  if (lastTick === undefined || lastTick === null) return 0;
  const elapsed = system.currentTick - Number(lastTick);
  const remaining = cooldownTicks - elapsed;
  return remaining > 0 ? remaining : 0;
}

export function isRecentlyDamaged(player) {
  const tick = player.getDynamicProperty(DYNAMIC_PROP_RECENTLY_DAMAGED);
  if (tick === undefined || tick === null) return false;
  return system.currentTick - Number(tick) < DAMAGE_LOCKOUT_TICKS;
}

export function hasActivePaper(player) {
  return player.getDynamicProperty(DYNAMIC_PROP_HAS_ACTIVE_PAPER) === true;
}

export function hasUnsupportedItems(player) {
  const inventory = player.getComponent("inventory");
  if (!inventory || !inventory.container) return false;
  const container = inventory.container;
  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i);
    if (!item) continue;
    for (const keyword of UNSUPPORTED_ITEMS) {
      if (item.typeId.includes(keyword)) return true;
    }
  }
  return false;
}

export function isInventoryEmptyExceptPaper(player) {
  const inventory = player.getComponent("inventory");
  if (!inventory || !inventory.container) return true;
  const container = inventory.container;
  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i);
    if (item && item.typeId !== SOUL_PAPER_ID) return false;
  }
  return true;
}

export function isArmorEmpty(player) {
  const equippable = player.getComponent("equippable");
  if (!equippable) return true;
  for (const slot of ARMOR_SLOTS) {
    if (equippable.getEquipment(slot)) return false;
  }
  return true;
}

export function isOffhandEmpty(player) {
  const equippable = player.getComponent("equippable");
  if (!equippable) return true;
  return !equippable.getEquipment(EquipmentSlot.Offhand);
}

export function isPlayerAlive(player) {
  const health = player.getComponent("health");
  if (!health) return false;
  return health.currentValue > 0;
}

export function getSaveIdFromLore(lore) {
  if (!lore || lore.length === 0) return undefined;
  for (const line of lore) {
    if (line.startsWith(SAVE_ID_LORE_PREFIX)) {
      return line.slice(SAVE_ID_LORE_PREFIX.length).trim();
    }
  }
  return undefined;
}

export function canRestore(player, errorList) {
  if (!isInventoryEmptyExceptPaper(player)) {
    errorList.push(ERROR_MESSAGES.NOT_EMPTY);
  }
  if (!isArmorEmpty(player)) {
    errorList.push(ERROR_MESSAGES.ARMOR_EQUIPPED);
  }
  if (!isOffhandEmpty(player)) {
    errorList.push(ERROR_MESSAGES.OFFHAND_OCCUPIED);
  }
  if (!isPlayerAlive(player)) {
    errorList.push(ERROR_MESSAGES.NOT_ALIVE);
  }
  if (isRecentlyDamaged(player)) {
    errorList.push(ERROR_MESSAGES.RECENTLY_DAMAGED);
  }
  return errorList.length === 0;
}

export function generateSaveId() {
  const hex = "0123456789abcdef";
  let id = "";
  for (let i = 0; i < 32; i++) {
    id += hex[Math.floor(Math.random() * 16)];
  }
  return id;
}
