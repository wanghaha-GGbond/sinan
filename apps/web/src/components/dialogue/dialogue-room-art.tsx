import styles from "./dialogue-design.module.css"

/** Original vector artwork: no guest likenesses, external images or fonts. */
export function DialogueRoomArt({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  if (compact) return <svg className={styles.roomArt + " " + className} viewBox="0 0 480 360" fill="none" aria-hidden="true" focusable="false" data-dialogue-art="dialogue-marks"><ellipse className={styles.artGround} cx="240" cy="301" rx="130" ry="15" /><path className={styles.artArch} d="M106 256V142a134 134 0 0 1 268 0v114Z" /><path className={styles.artFrame} d="M128 102h116a42 42 0 0 1 42 42v66a42 42 0 0 1-42 42h-57l-40 25 6-25h-25a42 42 0 0 1-42-42v-66a42 42 0 0 1 42-42Z" /><path className={styles.artSeatLight} d="M272 164h71a35 35 0 0 1 35 35v43a35 35 0 0 1-35 35h-7l-6 24-30-24h-28a35 35 0 0 1-35-35v-43a35 35 0 0 1 35-35Z" /><path className={styles.artArch} d="M142 154h25v25h-13v18h-14v-21Zm44 0h25v25h-13v18h-14v-21Z" /><path className={styles.artSeatShadow} d="M269 207h61v4h-61Zm0 14h43v4h-43Z" /><path className={styles.artLine} d="M106 290h270M380 116h14m-7-7v14M67 178h10m-5-5v10" /></svg>
  return <svg className={`${styles.roomArt} ${className}`} viewBox="0 0 480 360" fill="none" aria-hidden="true" focusable="false" data-dialogue-art="two-chairs">
    <path className={styles.artArch} d="M126 261V152a114 114 0 0 1 228 0v109Z" />
    <path className={styles.artLine} d="M106 263V151a134 134 0 0 1 268 0v112M144 261V154a96 96 0 0 1 192 0v107M240 39v69" />
    <circle className={styles.artSun} cx="240" cy="96" r="29" /><path className={styles.artArch} d="M211 96h58v34h-58Z" />
    <ellipse className={styles.artFloor} cx="240" cy="278" rx="196" ry="61" />
    <path className={styles.artLine} d="M58 278h364M80 307h320M98 251h284M240 220v119M180 224l-38 107M300 224l38 107M134 233l-74 65M346 233l74 65" />
    <ellipse className={styles.artGround} cx="145" cy="289" rx="58" ry="13" /><ellipse className={styles.artGround} cx="335" cy="289" rx="58" ry="13" />
    <path className={styles.artFrame} d="m111 238-9 49 7 2 16-48Zm63-2 10 48-7 3-17-46Z" />
    <path className={styles.artSeatShadow} d="M103 177c0-18 13-31 31-31h25c17 0 28 12 28 28v56h-76Z" />
    <path className={styles.artSeat} d="M110 177c0-16 11-27 27-27h19c16 0 27 11 27 27v48h-73Z" />
    <path className={styles.artSeatLight} d="M103 219c0-8 7-14 16-14h54c12 0 21 6 21 15v12c0 9-8 15-20 15h-53c-10 0-18-7-18-16Z" />
    <path className={styles.artSeatShadow} d="M104 229c3 8 10 12 21 12h47c10 0 17-3 22-10v6c0 8-8 14-20 14h-53c-10 0-17-7-17-15Z" />
    <path className={styles.artFrame} d="m369 238 9 49-7 2-16-48Zm-63-2-10 48 7 3 17-46Z" />
    <path className={styles.artSeatShadow} d="M377 177c0-18-13-31-31-31h-25c-17 0-28 12-28 28v56h76Z" />
    <path className={styles.artSeat} d="M370 177c0-16-11-27-27-27h-19c-16 0-27 11-27 27v48h73Z" />
    <path className={styles.artSeatLight} d="M377 219c0-8-7-14-16-14h-54c-12 0-21 6-21 15v12c0 9 8 15 20 15h53c10 0 18-7 18-16Z" />
    <path className={styles.artSeatShadow} d="M376 229c-3 8-10 12-21 12h-47c-10 0-17-3-22-10v6c0 8 8 14 20 14h53c10 0 17-7 17-15Z" />
    <path className={styles.artFrame} d="M236 234h8v50h-8Z" /><ellipse className={styles.artFrame} cx="240" cy="285" rx="24" ry="5" />
    <ellipse className={styles.artSeatShadow} cx="240" cy="231" rx="35" ry="11" /><ellipse className={styles.artSeatLight} cx="240" cy="227" rx="35" ry="11" />
    <path className={styles.artFrame} d="M228 214h11v10c0 4-11 4-11 0Zm23 1h10v9c0 4-10 4-10 0Z" />
    <ellipse className={styles.artArch} cx="233.5" cy="214" rx="5.5" ry="2" /><ellipse className={styles.artArch} cx="256" cy="215" rx="5" ry="2" />
    <path className={styles.artBubble} d="M98 96c-17 0-29 10-29 24s12 24 29 24h4l12 9-1-13c9-4 15-11 15-20 0-14-13-24-30-24Z" />
    <path className={styles.artFrame} d="M87 114h8v8h-5v5h-4v-6Zm15 0h8v8h-5v5h-4v-6Z" />
    <path className={styles.artBubble} d="M373 89c16 0 28 10 28 23s-12 23-28 23h-3l-12 9 1-13c-9-4-14-10-14-19 0-13 12-23 28-23Z" />
    <path className={styles.artLine} strokeWidth="2" d="M360 108h25m-25 8h18" />
    <path className={styles.artLine} strokeDasharray="3 6" d="M129 105c40-34 72-39 100-35m33 0c34 0 60 7 83 24" />
    <path className={styles.artFrame} d="M407 235c-9-17-10-30-2-41 9 13 9 27 2 41m2-6c7-18 17-26 28-24-2 14-11 22-28 24Z" />
    <path className={styles.artSeatShadow} d="m396 235 3 27h18l4-27Z" /><path className={styles.artLine} d="M78 181h12m-6-6v12M388 62h10m-5-5v10" />
  </svg>
}
