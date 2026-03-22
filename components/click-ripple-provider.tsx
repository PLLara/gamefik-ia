"use client"

import { useEffect } from "react"

const TYPING_INPUT_TYPES = new Set([
  "text",
  "search",
  "email",
  "password",
  "tel",
  "url",
  "number",
  "date",
  "datetime-local",
  "month",
  "week",
  "time",
  "color",
  "",
])

const SEMANTIC_SELECTOR = [
  "button",
  "a[href]",
  '[role="button"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="link"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'input[type="range"]',
  "summary",
  "label",
].join(",")

function isDisabled(el: HTMLElement): boolean {
  if (el.matches("button[disabled], [disabled], [aria-disabled='true']")) return true
  if (el instanceof HTMLButtonElement && el.disabled) return true
  if (el instanceof HTMLInputElement && el.disabled) return true
  if (el instanceof HTMLAnchorElement && el.getAttribute("aria-disabled") === "true") return true
  return false
}

function isTypingField(el: HTMLElement): boolean {
  if (el.matches("textarea, select")) return true
  if (el.matches("input")) {
    const t = (el as HTMLInputElement).type
    return TYPING_INPUT_TYPES.has(t)
  }
  return false
}

function matchesSemantic(el: HTMLElement): boolean {
  if (isTypingField(el)) return false
  return el.matches(SEMANTIC_SELECTOR)
}

/** Resolves clicks on SVG/icon nodes to the nearest HTML ancestor (e.g. button). */
function nearestHTMLElement(target: EventTarget | null): HTMLElement | null {
  if (!target || !(target instanceof Node)) return null
  let n: Node | null = target
  while (n) {
    if (n instanceof HTMLElement) return n
    n = n.parentNode
  }
  return null
}

function findRippleHost(start: HTMLElement | null): HTMLElement | null {
  if (!start) return null
  if (start.closest("[data-no-ripple]")) return null
  if (start.closest('[contenteditable="true"]')) return null

  let el: HTMLElement | null = start
  while (el) {
    if (matchesSemantic(el) && !isDisabled(el)) return el
    el = el.parentElement
  }

  el = start
  while (el) {
    if (el.classList.contains("cursor-pointer") && !isDisabled(el) && !isTypingField(el)) {
      return el
    }
    el = el.parentElement
  }

  return null
}

function attachRipple(host: HTMLElement, clientX: number, clientY: number) {
  const rect = host.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  const size = Math.max(rect.width, rect.height) * 2.4

  const cs = getComputedStyle(host)
  const hadStaticPosition = cs.position === "static"
  if (hadStaticPosition) {
    host.style.position = "relative"
  }

  const prevOverflow = host.style.overflow
  if (cs.overflow === "visible") {
    host.style.overflow = "hidden"
  }

  const ripple = document.createElement("span")
  ripple.className = "click-ripple"
  ripple.style.left = `${x}px`
  ripple.style.top = `${y}px`
  ripple.style.width = `${size}px`
  ripple.style.height = `${size}px`

  host.appendChild(ripple)

  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    ripple.remove()
    if (hadStaticPosition) {
      host.style.position = ""
    }
    if (cs.overflow === "visible") {
      host.style.overflow = prevOverflow
    }
  }

  ripple.addEventListener("animationend", cleanup, { once: true })
  window.setTimeout(cleanup, 700)
}

export function ClickRippleProvider() {
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

      const host = findRippleHost(nearestHTMLElement(e.target))
      if (!host) return

      attachRipple(host, e.clientX, e.clientY)
    }

    document.addEventListener("pointerdown", onPointerDown, true)
    return () => document.removeEventListener("pointerdown", onPointerDown, true)
  }, [])

  return null
}
