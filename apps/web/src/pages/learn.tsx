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

      {/* Section 1 */}
      <h2>What Was HyperCard?</h2>
      <p>
        HyperCard was created by Bill Atkinson in 1987 for the Macintosh. It let anyone build
        interactive software — teachers, artists, kids, and businesses alike could create without
        needing to be professional programmers.
      </p>
      <p>
        Users built "stacks" of "cards" containing buttons, text fields, and graphics. Its scripting
        language, HyperTalk, was designed to read like natural English, making programming
        accessible to a whole generation of non-technical creators.
      </p>
      <p>
        HyperCard included paint tools right in the authoring environment, so you could draw
        directly on each card. Apple distributed it free with every Macintosh, and millions of
        people used it to build everything from educational software to business tools to games.
      </p>
      <p>
        Often called "the web before the web," HyperCard pioneered hyperlinks, multimedia, and
        interactivity years before the World Wide Web existed.
      </p>

      {/* Section 2 */}
      <h2>HyperCard Timeline</h2>
      <ul>
        <li>
          <strong>1987:</strong> Bill Atkinson creates HyperCard; Apple ships it free with every Mac
        </li>
        <li>
          <strong>1988:</strong> Myst prototyped in HyperCard by Cyan Worlds
        </li>
        <li>
          <strong>1989:</strong> HyperCard 2.0 — color support begins, scripting improvements
        </li>
        <li>
          <strong>1990:</strong> Apple starts charging for HyperCard (controversial)
        </li>
        <li>
          <strong>1992:</strong> HyperCard 2.2 — the last major version many remember
        </li>
        <li>
          <strong>1998:</strong> HyperCard 3.0 development begins internally at Apple
        </li>
        <li>
          <strong>2000:</strong> Kevin Calhoun's team working on color HyperCard 3.0
        </li>
        <li>
          <strong>2004:</strong> Apple officially discontinues HyperCard
        </li>
        <li>
          <strong>2026:</strong> WildCard brings the spirit back to the web
        </li>
      </ul>

      {/* Section 3 */}
      <h2>WildTalk Basics</h2>
      <p>
        WildTalk is WildCard's scripting language, faithful to HyperTalk's English-like syntax. Here
        is a gentle introduction with examples.
      </p>

      <p>
        <strong>Hello World</strong> — respond to a mouse click:
      </p>
      <pre class="wc-code-block">
        <code>{`-- This is a comment
on mouseUp
  answer "Hello, WildCard!"
end mouseUp`}</code>
      </pre>

      <p>
        <strong>Variables</strong> — store values with <code>put</code>:
      </p>
      <pre class="wc-code-block">
        <code>{`-- Variables
put 42 into myNumber
put "Hello" into greeting`}</code>
      </pre>

      <p>
        <strong>Navigation</strong> — move between cards:
      </p>
      <pre class="wc-code-block">
        <code>{`-- Navigation
go to next card
go to card "Menu"
go to prev card`}</code>
      </pre>

      <p>
        <strong>Conditionals</strong> — make decisions:
      </p>
      <pre class="wc-code-block">
        <code>{`-- Conditionals
if the number of cards > 1 then
  go to next card
else
  answer "This is the only card!"
end if`}</code>
      </pre>

      <p>
        <strong>Loops</strong> — repeat actions:
      </p>
      <pre class="wc-code-block">
        <code>{`-- Loops
repeat with i = 1 to 10
  put i * i into line i of field "squares"
end repeat`}</code>
      </pre>

      {/* Section 4 */}
      <h2>Building Your First Stack</h2>
      <p>Follow these steps to create your first WildCard stack:</p>
      <ol>
        <li>
          <strong>Open WildCard</strong> — you start with a blank stack
        </li>
        <li>
          <strong>Draw on the card</strong> — click the paint tools to draw directly on the card
        </li>
        <li>
          <strong>Add buttons</strong> — use the button tool to add clickable buttons
        </li>
        <li>
          <strong>Add text fields</strong> — use the field tool to add text fields
        </li>
        <li>
          <strong>Add more cards</strong> — select "New Card" from the Edit menu
        </li>
        <li>
          <strong>Write scripts</strong> — add WildTalk scripts to make things interactive
        </li>
        <li>
          <strong>Save and share</strong> — save locally or publish to the gallery to share with
          others
        </li>
      </ol>

      {/* Section 5 */}
      <h2>External Resources</h2>
      <ul>
        <li>
          <a href="https://infinitemac.org/" target="_blank" rel="noopener noreferrer">
            Infinite Mac
          </a>{" "}
          — Run real HyperCard in your browser and experience the original firsthand
        </li>
        <li>
          <a
            href="https://archive.org/details/hypercardstackoftheart"
            target="_blank"
            rel="noopener noreferrer"
          >
            The HyperCard Stack of the Art
          </a>{" "}
          — A curated collection of notable HyperCard stacks on the Internet Archive
        </li>
        <li>
          <a href="https://hypercard.org/" target="_blank" rel="noopener noreferrer">
            hypercard.org
          </a>{" "}
          — Fan site with extensive HyperCard documentation and visual material
        </li>
        <li>
          <a
            href="https://en.wikipedia.org/wiki/HyperCard"
            target="_blank"
            rel="noopener noreferrer"
          >
            HyperCard on Wikipedia
          </a>{" "}
          — Comprehensive history and technical overview
        </li>
      </ul>
      <p>
        <em>
          Note: WildCard is NOT affiliated with Apple. "HyperCard" and "HyperTalk" are trademarks of
          Apple Inc. We use them here for historical reference only.
        </em>
      </p>
    </div>
  );
}
