import rlCss from "../styles.css";
import { disposers } from "../state.js";

// UI design tokens & frosted glass style system (see styles.css)
export function injectStyles() {
    const rlStyles = (function injectPremiumStyles() {
        let style = document.getElementById("rl-premium-styles");
        if (style) return style;
        style = document.createElement("style");
        style.id = "rl-premium-styles";
        style.textContent = rlCss;
        document.head.appendChild(style);
        return style;
    })();
    disposers.push(() => rlStyles?.remove());
}
