import { system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import {
  SOUL_PAPER_ID,
  DYNAMIC_PROP_SAVE_DATA,
  DYNAMIC_PROP_LAST_RESTORE,
  DYNAMIC_PROP_HAS_ACTIVE_PAPER,
  DYNAMIC_PROP_PLAYER_BACKUP,
  DYNAMIC_PROP_WORLD_PREFIX,
  DYNAMIC_PROP_WORLD_SERIAL_PREFIX,
  RESTORE_COOLDOWN_TICKS,
  ERROR_MESSAGES,
  SOUND_RESTORE,
} from "./constants.js";
import { deserializeAndApply } from "./serialize.js";
import { canRestore, getCooldownRemaining } from "./utils.js";

export function handleRestore(player, slotIndex) {
  const inventory = player.getComponent("inventory");
  if (!inventory || !inventory.container) {
    player.sendMessage("§cFailed to access inventory.");
    return;
  }

  const container = inventory.container;
  const paperItem = container.getItem(slotIndex);
  if (!paperItem || paperItem.typeId !== SOUL_PAPER_ID) return;

  let saveId = paperItem.getDynamicProperty(DYNAMIC_PROP_SAVE_DATA);

  if (!saveId || typeof saveId !== "string") {
    const backup = player.getDynamicProperty(DYNAMIC_PROP_PLAYER_BACKUP);
    if (typeof backup === "string") {
      const success = restoreFromJson(player, backup, slotIndex);
      if (success) return;
    }
    player.sendMessage(ERROR_MESSAGES.NO_DATA);
    return;
  }

  const worldKey = DYNAMIC_PROP_WORLD_PREFIX + saveId;
  let saveData = world.getDynamicProperty(worldKey);

  if (saveData && typeof saveData === "string") {
    const success = restoreFromJson(player, saveData, slotIndex, saveId);
    if (success) {
      world.setDynamicProperty(worldKey, undefined);
    }
    return;
  }

  const backup = player.getDynamicProperty(DYNAMIC_PROP_PLAYER_BACKUP);
  if (typeof backup === "string") {
    player.sendMessage("§eWorld save not found. Recovering from backup.");
    const success = restoreFromJson(player, backup, slotIndex);
    if (success) return;
  }

  player.sendMessage(ERROR_MESSAGES.CORRUPT_DATA);
}

function restoreFromJson(player, jsonData, slotIndex, saveId) {
  let parsedData;
  try {
    parsedData = JSON.parse(jsonData);
  } catch {
    return false;
  }

  if (saveId && parsedData.saveSerial !== undefined) {
    const serialKey = DYNAMIC_PROP_WORLD_SERIAL_PREFIX + saveId;
    const expectedSerial = world.getDynamicProperty(serialKey);
    if (expectedSerial === undefined || expectedSerial === null) {
      player.sendMessage(ERROR_MESSAGES.ALREADY_RESTORED);
      return false;
    }
    if (Number(parsedData.saveSerial) !== Number(expectedSerial)) {
      player.sendMessage(ERROR_MESSAGES.ALREADY_RESTORED);
      return false;
    }
  }

  const restoreCooldown = getCooldownRemaining(player, DYNAMIC_PROP_LAST_RESTORE, RESTORE_COOLDOWN_TICKS);
  if (restoreCooldown > 0) {
    player.sendMessage(ERROR_MESSAGES.COOLDOWN_RESTORE.replace("{time}", Math.ceil(restoreCooldown / 20)));
    return false;
  }

  const errors = [];
  if (!canRestore(player, errors)) {
    player.sendMessage(errors.join("\n"));
    return false;
  }

  const success = deserializeAndApply(player, jsonData);
  if (!success) {
    player.sendMessage(ERROR_MESSAGES.CORRUPT_DATA);
    player.setDynamicProperty(DYNAMIC_PROP_PLAYER_BACKUP, undefined);
    return false;
  }

  if (saveId) {
    const serialKey = DYNAMIC_PROP_WORLD_SERIAL_PREFIX + saveId;
    world.setDynamicProperty(serialKey, undefined);
  }

  const container = player.getComponent("inventory").container;
  container.setItem(slotIndex, undefined);

  player.setDynamicProperty(DYNAMIC_PROP_LAST_RESTORE, system.currentTick);
  player.setDynamicProperty(DYNAMIC_PROP_HAS_ACTIVE_PAPER, undefined);
  player.setDynamicProperty(DYNAMIC_PROP_PLAYER_BACKUP, undefined);

  player.playSound(SOUND_RESTORE);
  player.sendMessage("§aYour state has been restored.");
  return true;
}

export function showRestorePreview(player, slotIndex) {
  const inventory = player.getComponent("inventory");
  if (!inventory || !inventory.container) return;

  const container = inventory.container;
  const paperItem = container.getItem(slotIndex);
  if (!paperItem || paperItem.typeId !== SOUL_PAPER_ID) return;

  const saveId = paperItem.getDynamicProperty(DYNAMIC_PROP_SAVE_DATA);
  if (!saveId || typeof saveId !== "string") {
    handleRestore(player, slotIndex);
    return;
  }

  const worldKey = DYNAMIC_PROP_WORLD_PREFIX + saveId;
  let saveData = world.getDynamicProperty(worldKey);
  if (!saveData || typeof saveData !== "string") {
    const backup = player.getDynamicProperty(DYNAMIC_PROP_PLAYER_BACKUP);
    if (typeof backup === "string") {
      saveData = backup;
    } else {
      player.sendMessage(ERROR_MESSAGES.CORRUPT_DATA);
      return;
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(saveData);
  } catch {
    player.sendMessage(ERROR_MESSAGES.CORRUPT_DATA);
    return;
  }

  const itemCount = (parsed.inventory || []).length;
  const armorCount = Object.keys(parsed.armor || {}).length;
  const hasOffhand = parsed.offhand ? 1 : 0;
  const totalItems = itemCount + armorCount + hasOffhand;
  const health = typeof parsed.health === "number" ? parsed.health.toFixed(1) : "?";
  const hunger = typeof parsed.hunger === "number" ? parsed.hunger.toFixed(1) : "?";
  const xpLevel = typeof parsed.xpLevel === "number" ? parsed.xpLevel : "?";
  const effectsCount = Array.isArray(parsed.effects) ? parsed.effects.length : 0;

  const form = new ActionFormData()
    .title("§lRecovery Note")
    .body(
      `§7Health: §f${health} §7| §7Hunger: §f${hunger}\n` +
      `§7Items: §f${totalItems}\n` +
      `§7XP Level: §f${xpLevel}\n` +
      (effectsCount > 0 ? `§7Effects: §f${effectsCount}\n` : "")
    )
    .button("§aRestore")
    .button("§cCancel");

  form.show(player).then((response) => {
    if (response.canceled || response.selection === 1) return;
    handleRestore(player, slotIndex);
  });
}
