import { Player, ItemStack, EnchantmentType } from "@minecraft/server";
import { SOUL_PAPER_ID, POTION_IDS } from "./constants.js";

export function serializePlayerState(player, saveSerial) {
  const inventory = player.getComponent("inventory");
  const equippable = player.getComponent("equippable");
  const healthComp = player.getComponent("health");
  const hungerComp = player.getComponent("hunger");

  const inventoryItems = [];
  if (inventory && inventory.container) {
    const container = inventory.container;
    for (let i = 0; i < container.size; i++) {
      const item = container.getItem(i);
      if (item && item.typeId !== SOUL_PAPER_ID) {
        inventoryItems.push({ slot: i, data: serializeItem(item) });
      }
    }
  }

  const armorItems = {};
  if (equippable) {
    for (const slot of ["Head", "Chest", "Legs", "Feet"]) {
      const item = equippable.getEquipment(slot);
      if (item) {
        armorItems[slot] = serializeItem(item);
      }
    }
  }

  let offhandItem = undefined;
  if (equippable) {
    const item = equippable.getEquipment("Offhand");
    if (item) {
      offhandItem = serializeItem(item);
    }
  }

  const effects = [];
  for (const effect of player.getEffects()) {
    effects.push({
      typeId: effect.typeId,
      duration: effect.duration,
      amplifier: effect.amplifier,
      showParticles: effect.showParticles,
    });
  }

  const health = healthComp ? healthComp.currentValue : 20;
  const hunger = hungerComp ? hungerComp.currentValue : 20;

  return JSON.stringify({
    saveSerial: saveSerial || 0,
    inventory: inventoryItems,
    armor: armorItems,
    offhand: offhandItem,
    effects,
    health,
    hunger,
    xpTotal: player.getTotalXp(),
    xpLevel: player.level,
    xpProgress: player.xpEarnedAtCurrentLevel,
    timestamp: Date.now(),
  });
}

export function deserializeAndApply(player, jsonString) {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch {
    return false;
  }

  if (!data || typeof data !== "object") return false;
  if (!Array.isArray(data.inventory)) return false;
  if (typeof data.health !== "number") return false;
  if (typeof data.hunger !== "number") return false;

  const inventory = player.getComponent("inventory");
  const equippable = player.getComponent("equippable");
  const healthComp = player.getComponent("health");
  const hungerComp = player.getComponent("hunger");

  if (inventory && inventory.container) {
    const container = inventory.container;
    for (let i = 0; i < container.size; i++) {
      container.setItem(i, undefined);
    }
    for (const entry of data.inventory) {
      const itemStack = deserializeItem(entry.data);
      if (itemStack && entry.slot >= 0 && entry.slot < container.size) {
        container.setItem(entry.slot, itemStack);
      }
    }
  }

  if (equippable) {
    for (const slot of ["Head", "Chest", "Legs", "Feet"]) {
      equippable.setEquipment(slot, undefined);
    }
    for (const [slot, itemData] of Object.entries(data.armor || {})) {
      const itemStack = deserializeItem(itemData);
      if (itemStack) {
        equippable.setEquipment(slot, itemStack);
      }
    }
  }

  if (equippable) {
    equippable.setEquipment("Offhand", undefined);
    if (data.offhand) {
      const itemStack = deserializeItem(data.offhand);
      if (itemStack) {
        equippable.setEquipment("Offhand", itemStack);
      }
    }
  }

  if (healthComp) {
    healthComp.setCurrentValue(data.health);
  }

  if (hungerComp) {
    hungerComp.setCurrentValue(data.hunger);
  }

  for (const effect of player.getEffects()) {
    player.removeEffect(effect.typeId);
  }
  for (const effectData of data.effects || []) {
    try {
      player.addEffect(effectData.typeId, effectData.duration, {
        amplifier: effectData.amplifier,
        showParticles: effectData.showParticles !== false,
      });
    } catch {}
  }

  player.resetLevel();
  if (data.xpTotal > 0) {
    player.addExperience(data.xpTotal);
  }

  return true;
}

function serializeItem(item) {
  const result = {
    id: item.typeId,
    amount: item.amount,
  };

  if (item.nameTag) {
    result.nameTag = item.nameTag;
  }

  const lore = item.getLore();
  if (lore && lore.length > 0) {
    result.lore = lore;
  }

  if (POTION_IDS.includes(item.typeId)) {
    const potion = item.getComponent("potion");
    if (potion && potion.potionEffectType) {
      result.potionEffect = potion.potionEffectType.id;
    }
  }

  const enchantable = item.getComponent("enchantable");
  if (enchantable) {
    const enchants = enchantable.getEnchantments();
    if (enchants.length > 0) {
      result.enchantments = enchants.map((e) => ({
        id: e.type.id,
        level: e.level,
      }));
    }
  }

  const durability = item.getComponent("durability");
  if (durability && durability.damage > 0) {
    result.damage = durability.damage;
  }

  return result;
}

function deserializeItem(data) {
  const itemStack = new ItemStack(data.id, data.amount || 1);

  if (data.nameTag) {
    itemStack.nameTag = data.nameTag;
  }

  if (data.lore && data.lore.length > 0) {
    itemStack.setLore(data.lore);
  }

  if (data.potionEffect) {
    try {
      const potion = itemStack.getComponent("potion");
      if (potion) {
        potion.setPotionEffectType(data.potionEffect);
      }
    } catch {}
  }

  if (data.enchantments && data.enchantments.length > 0) {
    const enchantable = itemStack.getComponent("enchantable");
    if (enchantable) {
      for (const ench of data.enchantments) {
        try {
          enchantable.addEnchantment({
            type: new EnchantmentType(ench.id),
            level: ench.level,
          });
        } catch {}
      }
    }
  }

  if (data.damage !== undefined) {
    const durability = itemStack.getComponent("durability");
    if (durability) {
      durability.damage = data.damage;
    }
  }

  return itemStack;
}
