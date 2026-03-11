export interface WildCardStack {
  version: "1.0";
  name: string;
  id: string;
  width: number;
  height: number;
  cards: WildCardCard[];
  backgrounds: WildCardBackground[];
  script: string;
  createdAt: string;
  modifiedAt: string;
}

export interface WildCardCard {
  id: string;
  name: string;
  backgroundId: string;
  objects: WildCardObject[];
  script: string;
  paintData: string | null;
}

export interface WildCardBackground {
  id: string;
  name: string;
  objects: WildCardObject[];
  script: string;
  paintData: string | null;
}

export type WildCardObject = WildCardButton | WildCardField;

export interface WildCardButton {
  type: "button";
  id: string;
  name: string;
  rect: Rect;
  style: ButtonStyle;
  script: string;
  visible: boolean;
  enabled: boolean;
  hilite: boolean;
  color: string | null; // null = inherit (B&W in classic mode)
}

export interface WildCardField {
  type: "field";
  id: string;
  name: string;
  rect: Rect;
  style: FieldStyle;
  content: string;
  script: string;
  visible: boolean;
  lockText: boolean;
  color: string | null;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ButtonStyle =
  | "rectangle"
  | "roundRect"
  | "checkbox"
  | "radioButton"
  | "transparent"
  | "shadow";
export type FieldStyle = "rectangle" | "scrolling" | "transparent" | "shadow";
