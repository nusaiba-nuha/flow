/**
 * Written out in full, not composed as `text-node-${accent}`: Tailwind scans for
 * complete class strings. Named by what the node is, so a palette change does not
 * leave an entry called "rose" that is no longer rose.
 *
 * @type {Readonly<Record<string, { icon: string, ring: string, bar: string }>>}
 */
export const ACCENT = Object.freeze({
  trigger: { icon: 'text-node-trigger', ring: 'ring-node-trigger-soft', bar: 'bg-node-trigger' },
  hours: { icon: 'text-node-hours', ring: 'ring-node-hours-soft', bar: 'bg-node-hours' },
  message: { icon: 'text-node-message', ring: 'ring-node-message-soft', bar: 'bg-node-message' },
  comment: { icon: 'text-node-comment', ring: 'ring-node-comment-soft', bar: 'bg-node-comment' },
  branch: { icon: 'text-node-branch', ring: 'ring-node-branch-soft', bar: 'bg-node-branch' },
  unknown: { icon: 'text-node-unknown', ring: 'ring-node-unknown-soft', bar: 'bg-node-unknown' },
})

/** @param {string} accent */
export const accentClasses = (accent) => ACCENT[accent] ?? ACCENT.unknown
