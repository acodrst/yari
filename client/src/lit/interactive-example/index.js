import { html, LitElement } from "lit";
import { ref, createRef } from "lit/directives/ref.js";
import { decode } from "he";

import "../play/editor.js";
import "../play/controller.js";
import "../play/console.js";
import "../play/runner.js";
import { GleanMixin } from "../glean-mixin.js";
import "./tabs.js";

import styles from "./index.scss?css" with { type: "css" };

import exampleJs from "./example.js?raw";
import exampleStyle from "./example.css?raw";

/**
 * @import { Ref } from 'lit/directives/ref.js';
 * @import { PlayController } from "../play/controller.js";
 * @import { PlayRunner } from "../play/runner.js";
 */

const LANGUAGE_CLASSES = ["html", "js", "css"];
const GLEAN_EVENT_TYPES = ["focus", "copy", "cut", "paste", "click"];

export class InteractiveExample extends GleanMixin(LitElement) {
  static properties = {
    name: { type: String },
  };

  static styles = styles;

  constructor() {
    super();
    this.name = "";
    /** @type {string[]} */
    this._languages = [];
    /** @type {Record<string, string>} */
    this._code = {};
  }

  /** @type {Ref<PlayController>} */
  _controller = createRef();
  /** @type {Ref<PlayRunner>} */
  _runner = createRef();

  _run() {
    this._controller.value?.run();
  }

  _reset() {
    this._controller.value?.reset();
  }

  _initialCode() {
    const exampleNodes = this.closest("section")?.querySelectorAll(
      ".code-example pre[class*=interactive-example]"
    );
    const code = Array.from(exampleNodes || []).reduce((acc, pre) => {
      const language = Array.from(pre.classList).find((c) =>
        LANGUAGE_CLASSES.includes(c)
      );
      return language && pre.textContent
        ? {
            ...acc,
            [language]: acc[language]
              ? `${acc[language]}\n${pre.textContent}`
              : pre.textContent,
          }
        : acc;
    }, /** @type {Object<string, string>} */ ({}));
    this._languages = Object.keys(code);
    this._template =
      this._languages.length === 1 && this._languages[0] === "js"
        ? "javascript"
        : "tabbed";
    if (this._template === "tabbed") {
      code["js-hidden"] = exampleJs;
      code["css-hidden"] = exampleStyle;
    }
    return code;
  }

  /** @param {string} lang */
  _langName(lang) {
    switch (lang) {
      case "html":
        return "HTML";
      case "css":
        return "CSS";
      case "js":
        return "JavaScript";
      default:
        return lang;
    }
  }

  /** @param {Event} ev  */
  _telemetryHandler(ev) {
    let action = ev.type;
    if (
      ev.type === "click" &&
      ev.target instanceof HTMLElement &&
      ev.target.id
    ) {
      action = `click@${ev.target.id}`;
    }
    this._gleanClick(`interactive-examples-lit: ${action}`);
  }

  connectedCallback() {
    super.connectedCallback();
    this._telemetryHandler = this._telemetryHandler.bind(this);
    GLEAN_EVENT_TYPES.forEach((type) => {
      this.renderRoot.addEventListener(type, this._telemetryHandler);
    });
    this._code = this._initialCode();
  }

  _renderJavascript() {
    return html`
      <play-controller ${ref(this._controller)}>
        <div class="template-javascript">
          <header>
            <h4>${decode(this.name)}</h4>
          </header>
          <play-editor id="editor" language="js"></play-editor>
          <div class="buttons">
            <button id="execute" @click=${this._run}>Run</button>
            <button id="reset" @click=${this._reset}>Reset</button>
          </div>
          <play-console id="console"></play-console>
          <play-runner></play-runner>
        </div>
      </play-controller>
    `;
  }

  _renderTabbed() {
    return html`
      <play-controller ${ref(this._controller)} run-on-start run-on-change>
        <div class="template-tabbed">
          <header>
            <h4>${decode(this.name)}</h4>
            <button id="reset" @click=${this._reset}>Reset</button>
          </header>
          <ix-tab-wrapper>
            ${this._languages.map(
              (lang) => html`
                <ix-tab id=${lang}>${this._langName(lang)}</ix-tab>
                <ix-tab-panel id=${`${lang}-panel`}>
                  <play-editor language=${lang}></play-editor>
                </ix-tab-panel>
              `
            )}
          </ix-tab-wrapper>
          <div class="output-wrapper">
            <h4>Output</h4>
            <play-runner
              ${ref(this._runner)}
              sandbox="allow-top-navigation-by-user-activation"
            ></play-runner>
          </div>
        </div>
      </play-controller>
    `;
  }

  render() {
    return this._template === "javascript"
      ? this._renderJavascript()
      : this._renderTabbed();
  }

  firstUpdated() {
    if (this._controller.value) {
      this._controller.value.code = this._code;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    GLEAN_EVENT_TYPES.forEach((type) => {
      this.renderRoot.removeEventListener(type, this._telemetryHandler);
    });
  }
}

customElements.define("interactive-example", InteractiveExample);
