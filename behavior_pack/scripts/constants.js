import { EquipmentSlot } from "@minecraft/server";

export const SOUL_PAPER_ID = "soulsaver:soul_paper";

export const DYNAMIC_PROP_SAVE_DATA = "soulData";
export const DYNAMIC_PROP_LAST_SAVE = "soulLastSaveTick";
export const DYNAMIC_PROP_LAST_RESTORE = "soulLastRestoreTick";
export const DYNAMIC_PROP_RECENTLY_DAMAGED = "soulRecentlyDamaged";
export const DYNAMIC_PROP_HAS_ACTIVE_PAPER = "soulHasActivePaper";
export const DYNAMIC_PROP_PLAYER_BACKUP = "soulBackup";
export const DYNAMIC_PROP_SAVE_SERIAL = "soulSaveSerial";
export const DYNAMIC_PROP_WORLD_PREFIX = "soulSave_";
export const DYNAMIC_PROP_WORLD_SERIAL_PREFIX = "soulSerial_";

export const SAVE_COOLDOWN_TICKS = 600;
export const RESTORE_COOLDOWN_TICKS = 200;
export const DAMAGE_LOCKOUT_TICKS = 100;

export const FILLED_LORE_LINE = "§7Contains a captured state";
export const SOUND_SAVE = "random.orb";
export const SOUND_RESTORE = "beacon.power";
export const SAVE_ID_LORE_PREFIX = "§8ID: ";

export const ARMOR_SLOTS = [
  EquipmentSlot.Head,
  EquipmentSlot.Chest,
  EquipmentSlot.Legs,
  EquipmentSlot.Feet,
];

export const UNSUPPORTED_ITEMS = [
  "shulker_box",
  "bundle",
  "written_book",
  "writable_book",
];

export const POTION_IDS = [
  "minecraft:potion",
  "minecraft:splash_potion",
  "minecraft:lingering_potion",
];

export const ERROR_MESSAGES = {
  NOT_EMPTY: "§cYour inventory must be empty to restore a Recovery Note.",
  ARMOR_EQUIPPED: "§cYou must remove all armor to restore a Recovery Note.",
  OFFHAND_OCCUPIED: "§cYour offhand must be empty to restore a Recovery Note.",
  NOT_ALIVE: "§cYou must be alive to restore a Recovery Note.",
  COOLDOWN_SAVE: "§cRecovery Note is on cooldown. §e{time}s §cremaining.",
  COOLDOWN_RESTORE: "§cRecovery Note is on cooldown. §e{time}s §cremaining.",
  RECENTLY_DAMAGED: "§cYou cannot restore a Recovery Note while recently damaged.",
  ACTIVE_PAPER_EXISTS: "§cYou already have a Recovery Note in your inventory.",
  WRONG_OWNER: "§cThis Recovery Note does not belong to you.",
  CORRUPT_DATA: "§cThis Recovery Note contains corrupted data and cannot be used.",
  ALREADY_RESTORED: "§cThis recovery note has already been used.",
  NO_DATA: "§cThis Recovery Note is blank. Right-click to save your state.",
  DATA_TOO_LARGE: "§cInventory too large to save. Remove some items and try again.",
  UNSUPPORTED_ITEMS: "§cRemove shulker boxes, bundles, and books before saving.",
};
