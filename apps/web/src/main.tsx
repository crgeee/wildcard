import { render } from "preact";
import { App } from "./app";
import { registerServiceWorker } from "./register-sw";
import "./styles.css";

const root = document.getElementById("app");
if (root) {
  render(<App />, root);
}

registerServiceWorker();
