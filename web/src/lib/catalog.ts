import type { ComponentType, SVGProps } from "react";
import {
  IconBolt,
  IconBookOpen,
  IconCamera,
  IconColorPalette,
  IconCube,
  IconFeather,
  IconFlame,
  IconHeart,
  IconHouse,
  IconMagicWandSparkle,
  IconPaperPlane,
  IconPin,
  IconRocket,
  IconSparkle,
  IconStar,
  IconSuitcase,
} from "nucleo-glass";

type GlassIcon = ComponentType<
  SVGProps<SVGSVGElement> & { size?: number | string; uniqueId?: string }
>;

export interface GlassIconOption {
  id: string;
  label: string;
  Icon: GlassIcon;
}

/** Nucleo glass icons — ids match server/catalog.ts and web/public/icons. */
export const GLASS_ICONS: GlassIconOption[] = [
  { id: "star", label: "Star", Icon: IconStar },
  { id: "rocket", label: "Rocket", Icon: IconRocket },
  { id: "house", label: "House", Icon: IconHouse },
  { id: "feather", label: "Feather", Icon: IconFeather },
  { id: "heart", label: "Heart", Icon: IconHeart },
  { id: "camera", label: "Camera", Icon: IconCamera },
  { id: "bolt", label: "Bolt", Icon: IconBolt },
  { id: "sparkle", label: "Sparkle", Icon: IconSparkle },
  { id: "plane", label: "Plane", Icon: IconPaperPlane },
  { id: "book", label: "Book", Icon: IconBookOpen },
  { id: "palette", label: "Palette", Icon: IconColorPalette },
  { id: "wand", label: "Wand", Icon: IconMagicWandSparkle },
  { id: "pin", label: "Pin", Icon: IconPin },
  { id: "suitcase", label: "Suitcase", Icon: IconSuitcase },
  { id: "flame", label: "Flame", Icon: IconFlame },
  { id: "cube", label: "Cube", Icon: IconCube },
];

export interface BannerOption {
  id: string;
  file: string;
  label: string;
}

/** Fixed editorial stills. Files live in web/public/banners. */
export const BANNERS: BannerOption[] = [
  { id: "mist", file: "mist.jpg", label: "Mist ridge" },
  { id: "shore", file: "shore.jpg", label: "Quiet shore" },
  { id: "dunes", file: "dunes.jpg", label: "Dune light" },
  { id: "linen", file: "linen.jpg", label: "Linen room" },
  { id: "coffee", file: "coffee.jpg", label: "Morning cup" },
  { id: "kyoto", file: "kyoto.jpg", label: "Lantern street" },
  { id: "greenhouse", file: "greenhouse.jpg", label: "Greenhouse" },
  { id: "reading", file: "reading.jpg", label: "Reading room" },
  { id: "concrete", file: "concrete.jpg", label: "Soft concrete" },
  { id: "camera", file: "camera.jpg", label: "Film still" },
  { id: "marble", file: "marble.jpg", label: "Marble wash" },
  { id: "dusk", file: "dusk.jpg", label: "City dusk" },
  { id: "ceramics", file: "ceramics.jpg", label: "Ceramic still" },
  { id: "journal", file: "journal.jpg", label: "Open journal" },
  { id: "meadow", file: "meadow.jpg", label: "Wild meadow" },
  { id: "shadow", file: "shadow.jpg", label: "Long shadow" },
];
