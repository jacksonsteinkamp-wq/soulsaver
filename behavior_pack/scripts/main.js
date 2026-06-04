import { world, system } from "@minecraft/server";
import {
  SOUL_PAPER_ID,
  DYNAMIC_PROP_SAVE_DATA,
  DYNAMIC_PROP_RECENTLY_DAMAGED,
} from "./constants.js";
import { handleSave } from "./save.js";
import { showRestorePreview } from "./restore.js";

world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  const itemStack = event.itemStack;

  if (itemStack.typeId !== SOUL_PAPER_ID) return;

  const slotIndex = player.selectedSlotIndex;

  const inventory = player.getComponent("inventory");
  if (!inventory || !inventory.container) return;

  const actualItem = inventory.container.getItem(slotIndex);
  if (!actualItem || actualItem.typeId !== SOUL_PAPER_ID) return;

  const hasData = actualItem.getDynamicProperty(DYNAMIC_PROP_SAVE_DATA);

  if (hasData) {
    showRestorePreview(player, slotIndex);
  } else {
    handleSave(player, slotIndex);
  }
});

world.afterEvents.entityHurt.subscribe((event) => {
  if (event.hurtEntity && event.hurtEntity.typeId === "minecraft:player") {
    event.hurtEntity.setDynamicProperty(
      DYNAMIC_PROP_RECENTLY_DAMAGED,
      system.currentTick
    );
  }
});
