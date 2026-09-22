/** iPadOS reports "MacIntel", which is right for us: it wants Cmd too. */
const MAC = /mac|iphone|ipad|ipod/i

/** @param {string | undefined | null} platform @returns {boolean} */
export const isMacPlatform = (platform) => MAC.test(String(platform ?? ''))
