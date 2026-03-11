/**
 * Button renderer — renders all HyperCard button styles.
 *
 * Visual fidelity:
 * - roundRect (default): 1px border, rounded corners, inverts (black fill) on click
 * - rectangle: 1px border, square corners
 * - shadow: 1px border + 2px shadow offset
 * - checkbox: square checkbox + label text
 * - radioButton: circle + label text
 * - transparent: no border, just text (highlights on click)
 *
 * In classic mode: buttons invert to solid black on click.
 * In v3 mode: buttons highlight with accent color.
 */

import type { Theme } from "../theme";
import type { WildCardButton, ButtonStyle, Rect } from "@wildcard/types";

export interface ButtonRenderState {
  rect: Rect;
  style: ButtonStyle;
  label: string;
  visible: boolean;
  enabled: boolean;
  hilited: boolean;
  checked: boolean; // for checkbox/radioButton
  fillColor: string;
  textColor: string;
  borderColor: string;
  borderRadius: number;
  shadowOffset: number;
}

export class ButtonRenderer {
  private _theme: Theme;

  constructor(theme: Theme) {
    this._theme = theme;
  }

  setTheme(theme: Theme): void {
    this._theme = theme;
  }

  getRenderState(button: WildCardButton): ButtonRenderState {
    const isHilited = button.hilite;
    const isCheckable = button.style === "checkbox" || button.style === "radioButton";

    let fillColor: string;
    let textColor: string;

    if (isHilited && !isCheckable) {
      fillColor = this._theme.colors.buttonHilite;
      textColor = this._theme.colors.buttonHiliteText;
    } else {
      fillColor = button.color ?? this._theme.colors.buttonFace;
      textColor = this._theme.colors.buttonText;
    }

    let borderRadius = 0;
    if (button.style === "roundRect") {
      borderRadius = this._theme.metrics.buttonBorderRadius;
    }

    let shadowOffset = 0;
    if (button.style === "shadow") {
      shadowOffset = this._theme.metrics.shadowOffset;
    }

    let borderColor = this._theme.colors.foreground;
    if (button.style === "transparent") {
      borderColor = "transparent";
    }

    return {
      rect: button.rect,
      style: button.style,
      label: button.name,
      visible: button.visible,
      enabled: button.enabled,
      hilited: isHilited,
      checked: isCheckable && isHilited,
      fillColor,
      textColor,
      borderColor,
      borderRadius,
      shadowOffset,
    };
  }
}

/**
 * Draw a button to a canvas 2D context.
 */
export function drawButton(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  state: ButtonRenderState,
): void {
  if (!state.visible) return;

  const { rect, style } = state;

  switch (style) {
    case "roundRect":
      drawRoundRectButton(ctx, theme, state);
      break;
    case "rectangle":
      drawRectButton(ctx, theme, state);
      break;
    case "shadow":
      drawShadowButton(ctx, theme, state);
      break;
    case "checkbox":
      drawCheckbox(ctx, theme, state);
      break;
    case "radioButton":
      drawRadioButton(ctx, theme, state);
      break;
    case "transparent":
      drawTransparentButton(ctx, theme, state);
      break;
  }
}

function drawRoundRectButton(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  state: ButtonRenderState,
): void {
  const { rect, fillColor, textColor, borderColor, borderRadius } = state;

  // Fill
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, borderRadius);
  ctx.fillStyle = fillColor;
  ctx.fill();

  // Border
  roundRect(ctx, rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1, borderRadius);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Label
  drawButtonLabel(ctx, theme, state);
}

function drawRectButton(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  state: ButtonRenderState,
): void {
  const { rect, fillColor, borderColor } = state;

  ctx.fillStyle = fillColor;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1);

  drawButtonLabel(ctx, theme, state);
}

function drawShadowButton(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  state: ButtonRenderState,
): void {
  const { rect, fillColor, borderColor, shadowOffset } = state;

  // Shadow
  ctx.fillStyle = theme.colors.shadow;
  ctx.fillRect(rect.x + shadowOffset, rect.y + shadowOffset, rect.width, rect.height);

  // Button body
  ctx.fillStyle = fillColor;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1);

  drawButtonLabel(ctx, theme, state);
}

function drawCheckbox(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  state: ButtonRenderState,
): void {
  const { rect, checked, textColor } = state;
  const boxSize = 12;
  const boxY = rect.y + Math.floor((rect.height - boxSize) / 2);

  // Checkbox box
  ctx.fillStyle = theme.colors.background;
  ctx.fillRect(rect.x, boxY, boxSize, boxSize);
  ctx.strokeStyle = theme.colors.foreground;
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, boxY + 0.5, boxSize - 1, boxSize - 1);

  // Checkmark
  if (checked) {
    ctx.strokeStyle = theme.colors.foreground;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rect.x + 2, boxY + 6);
    ctx.lineTo(rect.x + 5, boxY + 9);
    ctx.lineTo(rect.x + 10, boxY + 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  // Label
  ctx.fillStyle = textColor;
  ctx.font = `${theme.fonts.systemSize}px ${theme.fonts.system}`;
  ctx.textBaseline = "middle";
  ctx.fillText(state.label, rect.x + boxSize + 6, rect.y + rect.height / 2);
}

function drawRadioButton(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  state: ButtonRenderState,
): void {
  const { rect, checked, textColor } = state;
  const radius = 6;
  const centerX = rect.x + radius;
  const centerY = rect.y + rect.height / 2;

  // Outer circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = theme.colors.background;
  ctx.fill();
  ctx.strokeStyle = theme.colors.foreground;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Inner filled circle when selected
  if (checked) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fillStyle = theme.colors.foreground;
    ctx.fill();
  }

  // Label
  ctx.fillStyle = textColor;
  ctx.font = `${theme.fonts.systemSize}px ${theme.fonts.system}`;
  ctx.textBaseline = "middle";
  ctx.fillText(state.label, rect.x + radius * 2 + 6, centerY);
}

function drawTransparentButton(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  state: ButtonRenderState,
): void {
  // In classic mode, transparent button shows label only, inverts on click
  if (state.hilited) {
    ctx.fillStyle = state.fillColor;
    ctx.fillRect(state.rect.x, state.rect.y, state.rect.width, state.rect.height);
  }
  drawButtonLabel(ctx, theme, state);
}

function drawButtonLabel(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  state: ButtonRenderState,
): void {
  ctx.fillStyle = state.enabled ? state.textColor : theme.colors.disabled;
  ctx.font = `${theme.fonts.systemSize}px ${theme.fonts.system}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(state.label, state.rect.x + state.rect.width / 2, state.rect.y + state.rect.height / 2);
  ctx.textAlign = "left";
}

/** Helper to draw a rounded rectangle path */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
