import "./styles.css";
import { createGladiatorShowcase } from "./ui/gladiatorShowcase";

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("Missing #app element");
}

// Show gladiator showcase on the main page
const disposeShowcase = createGladiatorShowcase(app);

window.addEventListener("beforeunload", () => {
  disposeShowcase();
});
