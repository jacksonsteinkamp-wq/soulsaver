import { system, world } from "@minecraft/server";
import {
  SOUL_PAPER_ID,
  DYNAMIC_PROP_SAVE_DATA,
  DYNAMIC_PROP_LAST_SAVE,
  DYNAMIC_PROP_HAS_ACTIVE_PAPER,
  DYNAMIC_PROP_PLAYER_BACKUP,
  DYNAMIC_PROP_SAVE_SERIAL,
  DYNAMIC_PROP_WORLD_PREFIX,
  DYNAMIC_PROP_WORLD_SERIAL_PREFIX,
  SAVE_COOLDOWN_TICKS,
  FILLED_LORE_LINE,
  ARMOR_SLOTS,
  ERROR_MESSAGES,
  SOUND_SAVE,
} from "./constants.js";
import { serializePlayerState } from "./serialize.js";
import { getCooldownRemaining, hasUnsupportedItems, generateSaveId, isRecentlyDamaged } from "./utils.js";

export function handleSave(player, slotIndex) {
  const saveCooldown = getCooldownRemaining(player, DYNAMIC_PROP_LAST_SAVE, SAVE_COOLDOWN_TICKS);
  if (saveCooldown > 0) {
    player.sendMessage(ERROR_MESSAGES.COOLDOWN_SAVE.replace("{time}", Math.ceil(saveCooldown / 20)));
    return;
  }

  if (isRecentlyDamaged(player)) {
    player.sendMessage(ERROR_MESSAGES.RECENTLY_DAMAGED);
    return;
  }

  if (hasUnsupportedItems(player)) {
    player.sendMessage(ERROR_MESSAGES.UNSUPPORTED_ITEMS);
    return;
  }

  const inventory = player.getComponent("inventory");
  if (!inventory || !inventory.container) {
    player.sendMessage("§cFailed to access inventory.");
    return;
  }

  const container = inventory.container;
  const paperItem = container.getItem(slotIndex);
  if (!paperItem || paperItem.typeId !== SOUL_PAPER_ID) return;

  const saveId = generateSaveId();
  const serialKey = DYNAMIC_PROP_WORLD_SERIAL_PREFIX + saveId;
  const currentSerial = world.getDynamicProperty(serialKey) || 0;
  const saveSerial = Number(currentSerial) + 1;
  world.setDynamicProperty(serialKey, saveSerial);
  const serialized = serializePlayerState(player, saveSerial);

  const worldKey = DYNAMIC_PROP_WORLD_PREFIX + saveId;
  world.setDynamicProperty(worldKey, serialized);

  const filledPaper = paperItem.clone();
  filledPaper.setDynamicProperty(DYNAMIC_PROP_SAVE_DATA, saveId);
  filledPaper.setLore([FILLED_LORE_LINE, "§8ID: " + saveId]);

  container.setItem(slotIndex, filledPaper);

  for (let i = 0; i < container.size; i++) {
    const existing = container.getItem(i);
    if (existing && existing.typeId !== SOUL_PAPER_ID) {
      container.setItem(i, undefined);
    }
  }

  const equippable = player.getComponent("equippable");
  if (equippable) {
    for (const slot of ARMOR_SLOTS) {
      equippable.setEquipment(slot, undefined);
    }
    equippable.setEquipment("Offhand", undefined);
  }

  player.resetLevel();
  for (const effect of player.getEffects()) {
    player.removeEffect(effect.typeId);
  }

  player.setDynamicProperty(DYNAMIC_PROP_LAST_SAVE, system.currentTick);
  player.setDynamicProperty(DYNAMIC_PROP_HAS_ACTIVE_PAPER, true);
  player.setDynamicProperty(DYNAMIC_PROP_PLAYER_BACKUP, serialized);

  player.playSound(SOUND_SAVE);
  player.sendMessage("§aYour state has been saved to the Recovery Note.");
}
