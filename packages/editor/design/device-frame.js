// A phone and a tablet drawn around a page at the device's real screen size: bezel, notch or camera, side buttons. Used by the
// prototype viewer and the gallery's device switch. Desktop has no frame.
export const DEVICES = {
    mobile: { w: 390, h: 844, bz: 14, r: 56, screenR: 44, ring: "#cdbfd8", notch: true },
    tablet: { w: 768, h: 1024, bz: 22, r: 42, screenR: 22, ring: "#d4d4d8", notch: false },
};

/**
 * The CSS of each part, at full size (the caller scales the shell, e.g. `transform: scale(k)`). Positions are inside the shell,
 * whose size is `w` by `h`; the screen is `dev.w` by `dev.h`.
 */
export function deviceParts(dev, opts = {}) {
    const w = dev.w + 2 * dev.bz, h = dev.h + 2 * dev.bz;
    return {
        w, h,
        shell: `position:absolute;left:0;top:0;width:${w}px;height:${h}px;transform-origin:0 0;background:#161618;border-radius:${dev.r}px;box-shadow:0 0 0 3px ${dev.ring},inset 0 0 0 2px #2b2b2f,${opts.shadow || "0 28px 70px rgba(0,0,0,.55)"};`,
        screen: `position:absolute;left:${dev.bz}px;top:${dev.bz}px;width:${dev.w}px;height:${dev.h}px;border-radius:${dev.screenR}px;overflow:hidden;background:#fff;`,
        frame: `position:absolute;left:0;top:0;width:${dev.w}px;height:${dev.h}px;border:0;background:#fff;`,
        notch: dev.notch ? `display:block;position:absolute;z-index:2;pointer-events:none;top:${dev.bz}px;left:${w / 2 - 63}px;width:126px;height:30px;background:#161618;border-radius:0 0 20px 20px;box-shadow:inset 0 -1px 0 #2b2b2f;` : "display:none",
        cam: dev.notch
            ? `display:block;position:absolute;z-index:3;pointer-events:none;top:${dev.bz + 9}px;left:${w / 2 + 30}px;width:11px;height:11px;border-radius:50%;background:#0b1220;box-shadow:inset 0 0 0 2px #2a3344;`
            : `display:block;position:absolute;pointer-events:none;top:${dev.bz / 2 - 3}px;left:${w / 2 - 3}px;width:6px;height:6px;border-radius:50%;background:#2a3344;`,
        // a mute switch and two volume keys on the left, power on the right (a phone only); the strip is a little wider than the shell
        side: dev.notch
            ? `display:block;position:absolute;left:-8px;right:-8px;top:0;bottom:0;pointer-events:none;background:linear-gradient(${dev.ring},${dev.ring}) 0 100px/4px 26px no-repeat,linear-gradient(${dev.ring},${dev.ring}) 0 160px/4px 52px no-repeat,linear-gradient(${dev.ring},${dev.ring}) 0 226px/4px 52px no-repeat,linear-gradient(${dev.ring},${dev.ring}) ${w + 11}px 190px/4px 88px no-repeat;`
            : "display:none",
    };
}

/** The frame as elements (`opts.shadow`: its drop shadow), for a page that is not the prototype viewer: `{ root, screen }` — put an iframe (or anything) in `screen`. */
export function buildDeviceFrame(kind, scale = 1, opts = {}) {
    const dev = DEVICES[kind], p = deviceParts(dev, opts);
    const make = (css) => { const e = document.createElement("div"); e.style.cssText = css; return e; };
    const root = make(`position:relative;width:${p.w * scale}px;height:${p.h * scale}px;margin:16px auto;`);
    const shell = make(p.shell + `transform:scale(${scale});`);
    const screen = make(p.screen);
    shell.append(screen, make(p.notch), make(p.cam), make(p.side));
    root.appendChild(shell);
    return { root, screen, dev, parts: p };
}
