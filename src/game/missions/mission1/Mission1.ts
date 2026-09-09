import * as THREE from "three";
import type { SceneManager } from "../../../scene/SceneManager";
import type { InputManager } from "../../input/InputManager";
import type { GameHud } from "../../hud/GameHud";
import { PlayerController } from "../../PlayerController";
import { InteractionSystem } from "../../interaction/InteractionSystem";
import { ObjectiveSystem } from "../../objectives/ObjectiveSystem";
import { AudioManager } from "../../../systems/AudioManager";
import { SaveManager } from "../../../systems/SaveManager";
import { buildHouseScene } from "./HouseScene";
import { buildStreetScene } from "./StreetScene";
import { createYoungFrancis, createPietro, createMother, createCustomer, createVillager, createClothBundle } from "./npcs";
import type { HumanRig } from "../../character/HumanCharacter";

export interface Mission1Callbacks {
  onComplete: () => void;
  onExit: () => void;
}

export interface MissionRuntime {
  dispose(): void;
}

const HOUSE_CAMERA = { distance: 2.7, height: 1.85 };
const STREET_CAMERA = { distance: 4.6, height: 2.6 };
const GAMEPLAY_FOV = 58;

/**
 * Orchestrates Mission 1 end to end: builds the house and street sub-scenes,
 * places NPCs and interactables, and drives the objective/dialogue flow
 * described in the design (talk to father -> pick up cloth -> leave house
 * -> walk the street -> deliver to the customer). Everything mission-1
 * specific lives here; the systems it wires together (player controller,
 * character rig, interaction, dialogue, objectives, HUD) are all reusable
 * for a future Mission 2.
 */
export function startMission1(manager: SceneManager, hud: GameHud, input: InputManager, callbacks: Mission1Callbacks): MissionRuntime {
  hud.reset();
  manager.camera.fov = GAMEPLAY_FOV;
  manager.camera.updateProjectionMatrix();

  const houseScene = new THREE.Scene();
  const streetScene = new THREE.Scene();

  const francis = createYoungFrancis();
  const interaction = new InteractionSystem();
  const objectives = new ObjectiveSystem();
  const unsubscribeObjectives = objectives.onChange((text) => hud.setObjective(text));

  const controller = new PlayerController({ rig: francis, camera: manager.camera, input });

  const house = buildHouseScene(houseScene);
  const street = buildStreetScene(streetScene);

  houseScene.add(francis.object);

  const pietro = createPietro();
  pietro.object.position.copy(house.fatherPosition);
  pietro.object.rotation.y = house.fatherYaw;
  houseScene.add(pietro.object);

  const mother = createMother();
  mother.object.position.copy(house.motherPosition);
  mother.object.rotation.y = house.motherYaw;
  houseScene.add(mother.object);

  const clothOnTable = createClothBundle();
  clothOnTable.position.copy(house.clothPosition);
  clothOnTable.rotation.y = 0.3;
  houseScene.add(clothOnTable);

  let carriedCloth: THREE.Object3D | null = null;
  let hasFatherTalked = false;
  let hasCloth = false;
  let missionComplete = false;
  let currentArea: "house" | "street" = "house";

  // --- House interactables ---------------------------------------------
  interaction.register({
    id: "father",
    object: pietro.object,
    radius: 1.25,
    label: "Talk to Father",
    onInteract: () => {
      if (controller.isLocked()) return;
      controller.setLocked(true);
      pietro.playGesture("greet");
      if (!hasFatherTalked) {
        hud.showDialogue(
          [
            { speaker: "Pietro", text: "Francis! Come here a moment." },
            { speaker: "Francis", text: "Yes, Father?" },
            { speaker: "Pietro", text: "Take these cloths to our customer in town." },
            { speaker: "Francis", text: "Yes, Father." },
            { speaker: "Pietro", text: "Be careful with them. They are valuable." },
          ],
          () => {
            hasFatherTalked = true;
            controller.setLocked(false);
            objectives.set("Pick up the cloth from the table.");
            interaction.setEnabled("cloth", true);
          },
        );
      } else {
        hud.showDialogue(
          [{ speaker: "Pietro", text: hasCloth ? "Go on, our customer is waiting." : "Don't forget the cloth, Francis." }],
          () => controller.setLocked(false),
        );
      }
    },
  });

  interaction.register({
    id: "mother",
    object: mother.object,
    radius: 1.2,
    label: "Talk to Mother",
    onInteract: () => {
      if (controller.isLocked()) return;
      controller.setLocked(true);
      mother.playGesture("greet");
      hud.showDialogue([{ speaker: "Pica", text: "Go safely, my son. Mind the street — Assisi is busy today." }], () =>
        controller.setLocked(false),
      );
    },
  });

  interaction.register({
    id: "cloth",
    object: clothOnTable,
    radius: 1.1,
    label: "Pick up the cloth",
    enabled: false,
    onInteract: () => {
      if (hasCloth) return;
      hasCloth = true;
      AudioManager.playPickup();
      francis.playGesture("pickup");
      clothOnTable.visible = false;
      interaction.setEnabled("cloth", false);

      const carried = createClothBundle();
      carried.scale.setScalar(0.55);
      carried.position.set(0, -0.02, 0.04);
      carried.rotation.set(0.15, 0, 0.1);
      francis.leftHand.add(carried);
      carriedCloth = carried;

      objectives.set("Take the cloth to the customer.");
    },
  });

  interaction.register({
    id: "door",
    object: house.doorObject,
    radius: 1.6,
    label: "Open the door",
    onInteract: () => {
      if (!hasCloth) {
        controller.setLocked(true);
        hud.showDialogue([{ speaker: "Francis", text: "I should bring the cloth first." }], () => controller.setLocked(false));
        return;
      }
      interaction.setEnabled("door", false);
      AudioManager.playDoor();
      house.openDoor();
      window.setTimeout(() => goToStreet(), 750);
    },
  });

  // --- Street NPCs -------------------------------------------------------
  const customer = createCustomer();
  customer.object.position.copy(street.customerPosition);
  customer.object.rotation.y = street.customerYaw;
  streetScene.add(customer.object);

  interface Villager {
    rig: HumanRig;
    anchor: (typeof street.villagerAnchors)[number];
    t: number;
  }
  const villagers: Villager[] = street.villagerAnchors.map((anchor, i) => {
    const rig = createVillager(i);
    rig.object.position.copy(anchor.position);
    rig.object.rotation.y = anchor.yaw;
    streetScene.add(rig.object);
    return { rig, anchor, t: i * 3.3 };
  });

  interaction.register({
    id: "customer",
    object: customer.object,
    radius: 1.6,
    label: "Talk to the customer",
    onInteract: () => {
      if (missionComplete || controller.isLocked()) return;
      controller.setLocked(true);
      customer.playGesture("greet");
      hud.showDialogue(
        [
          { speaker: "Customer", text: "Ah, Bernardone's son. You have brought the cloth." },
          { speaker: "Francis", text: "Yes. Here it is." },
        ],
        () => {
          customer.playGesture("give");
          francis.playGesture("give");
          if (carriedCloth) {
            francis.leftHand.remove(carriedCloth);
            carriedCloth = null;
          }
          missionComplete = true;
          interaction.setEnabled("customer", false);
          objectives.set(null);
          SaveManager.completeMission("mission-1");
          window.setTimeout(() => {
            hud.showComplete(
              "Mission Complete",
              "Francis delivered the cloth safely to the customer in town.",
              "Return to Mission Select",
              () => callbacks.onComplete(),
            );
          }, 550);
        },
      );
    },
  });

  function goToStreet(): void {
    currentArea = "street";
    houseScene.remove(francis.object);
    streetScene.add(francis.object);
    manager.scene = streetScene;
    controller.setCameraRig(STREET_CAMERA.distance, STREET_CAMERA.height);
    controller.setColliders(street.colliders);
    controller.teleport(street.spawnPoint.x, street.spawnPoint.z, street.spawnPoint.yaw);
  }

  controller.setCameraRig(HOUSE_CAMERA.distance, HOUSE_CAMERA.height);
  controller.setColliders(house.colliders);
  controller.teleport(house.spawnPoint.x, house.spawnPoint.z, house.spawnPoint.yaw);
  manager.scene = houseScene;
  objectives.set("Talk to your father.");

  hud.onExit(() => callbacks.onExit());
  hud.onPromptActivate(() => interaction.interact());

  const removeUpdater = manager.addUpdater((dt, elapsed) => {
    if (currentArea === "street") street.update(dt, elapsed);
    pietro.update?.(dt, elapsed);
    mother.update?.(dt, elapsed);
    customer.update?.(dt, elapsed);

    for (const v of villagers) {
      v.t += dt;
      if (v.anchor.kind === "pace") {
        const speed = Math.cos(v.t * 0.5);
        v.rig.object.position.x = v.anchor.position.x + Math.sin(v.t * 0.5) * 1.6;
        v.rig.setMotion(Math.min(1, Math.abs(speed) * 1.8), false, false);
        v.rig.object.rotation.y = speed >= 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        v.rig.setMotion(0, false, false);
      }
      v.rig.update?.(dt, elapsed);
    }

    controller.update(dt, elapsed);

    const dialogueOpen = hud.isDialogueOpen();
    if (!dialogueOpen && !controller.isLocked()) {
      const nearest = interaction.update(controller.getPosition());
      if (nearest) hud.showPrompt(nearest.label);
      else hud.hidePrompt();
    } else {
      hud.hidePrompt();
    }

    if (dialogueOpen) {
      if (input.wasPressed("KeyE", "Space")) hud.requestDialogueAdvance();
    } else if (input.wasPressed("KeyE")) {
      interaction.interact();
    }

    input.endFrame();
  });

  return {
    dispose() {
      removeUpdater();
      unsubscribeObjectives();
      hud.onExit(null);
      hud.onPromptActivate(null);
      hud.reset();
      manager.camera.fov = 36;
      manager.camera.updateProjectionMatrix();
    },
  };
}
