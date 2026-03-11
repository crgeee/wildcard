/**
 * Learn page — tutorials and educational content about WildCard and HyperCard.
 */
export function LearnPage() {
  return (
    <div class="wc-learn">
      <h1>Learn WildCard</h1>

      <p>
        WildCard is an open-source, web-based reimagining of Apple's HyperCard (1987-2004) — the
        pioneering tool that let everyday people build interactive software using cards, buttons,
        fields, and an English-like scripting language.
      </p>

      <h2>What Was HyperCard?</h2>
      <p>
        HyperCard was created by Bill Atkinson and released by Apple in 1987. It came free with
        every Macintosh and let anyone — not just programmers — create interactive "stacks" of
        cards. You could add buttons that navigated between cards, text fields that stored data, and
        paint graphics directly on each card.
      </p>
      <p>
        Its scripting language, HyperTalk, was designed to read like English. A script as simple as{" "}
        <code>on mouseUp / go to next card / end mouseUp</code> could make a button work. This
        approachability made HyperCard the first programming experience for an entire generation.
      </p>

      <h2>What Is WildCard?</h2>
      <p>
        WildCard brings that experience to the modern web. It uses the original name Bill Atkinson
        chose during development (before Apple renamed it to HyperCard). WildCard features:
      </p>
      <ul>
        <li>A pixel-perfect retro Mac interface rendered entirely on canvas</li>
        <li>
          <strong>WildTalk</strong> — a scripting language faithful to HyperTalk's English-like
          syntax
        </li>
        <li>
          Two rendering modes: <strong>Classic</strong> (1-bit black and white) and{" "}
          <strong>3.0</strong> (the color version Apple never shipped)
        </li>
        <li>No account required to create and edit stacks</li>
        <li>Export your creations as standalone HTML files</li>
      </ul>

      <h2>Tutorials</h2>
      <p>Tutorials are coming soon. They will cover:</p>
      <ul>
        <li>Getting started: your first stack</li>
        <li>Adding buttons and navigation</li>
        <li>Working with text fields</li>
        <li>Introduction to WildTalk scripting</li>
        <li>Using paint tools</li>
        <li>Building a quiz game</li>
        <li>Advanced WildTalk: variables, loops, and conditionals</li>
      </ul>

      <h2>Resources</h2>
      <ul>
        <li>
          <a href="https://infinitemac.org/" target="_blank" rel="noopener noreferrer">
            Infinite Mac
          </a>{" "}
          — Run real HyperCard in your browser
        </li>
        <li>
          <a href="https://hypercard.org/" target="_blank" rel="noopener noreferrer">
            hypercard.org
          </a>{" "}
          — Fan site with extensive visual material
        </li>
        <li>
          <a
            href="https://en.wikipedia.org/wiki/HyperCard"
            target="_blank"
            rel="noopener noreferrer"
          >
            HyperCard on Wikipedia
          </a>
        </li>
      </ul>
    </div>
  );
}
