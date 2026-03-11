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

      <figure class="wc-figure">
        <img
          src="/images/learn/hypercard-home-card.png"
          alt="HyperCard Home Card showing the main navigation screen with icons for Intro, Help, Address, Documents, and more — the classic 1-bit black-and-white interface"
          width="512"
        />
        <figcaption>
          The HyperCard Home Card — the starting point for every HyperCard user. Each icon
          represents a different stack.
        </figcaption>
      </figure>

      <p>
        HyperCard was created by Bill Atkinson in 1987 for the Macintosh. It let anyone build
        interactive software — teachers, artists, kids, and businesses alike could create without
        needing to be professional programmers.
      </p>

      <figure class="wc-figure wc-figure--small">
        <img
          src="/images/learn/bill-atkinson-hypercard.jpg"
          alt="Bill Atkinson announcing HyperCard at MacWorld, August 11, 1987"
          width="400"
        />
        <figcaption>
          Bill Atkinson announces HyperCard at MacWorld, August 11, 1987. Photo via Internet
          Archive.
        </figcaption>
      </figure>

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

      <figure class="wc-figure">
        <img
          src="/images/learn/hypercard-simulator.png"
          alt="HyperCard Simulator showing the classic window chrome with title bar, close box, and stack icons — a faithful web recreation of the original interface"
          width="512"
        />
        <figcaption>
          A modern HyperCard simulator showing the classic window chrome, 1-bit graphics, and stack
          navigation. Screenshot from{" "}
          <a href="https://hcsimulator.com/" target="_blank" rel="noopener noreferrer">
            hcsimulator.com
          </a>
          .
        </figcaption>
      </figure>

      <p>
        Often called "the web before the web," HyperCard pioneered hyperlinks, multimedia, and
        interactivity years before the World Wide Web existed.
      </p>

      {/* Section 2 */}
      <h2>HyperCard Through the Years</h2>

      <figure class="wc-figure wc-figure--gallery">
        <div class="wc-figure-row">
          <img
            src="/images/learn/hypercard-22-interface.jpg"
            alt="HyperCard 2.2 retail box — 'The powerful tool for creating custom software solutions' with Apple rainbow logo"
            width="300"
          />
          <img
            src="/images/learn/hypercard-23-scripting.jpg"
            alt="HyperCard 2.3 retail box showing script windows and card layouts — 'Accelerated for Power Macintosh'"
            width="300"
          />
        </div>
        <figcaption>
          HyperCard retail boxes: version 2.2 (left) and 2.3 (right). Note the HyperTalk scripts
          visible on the 2.3 box — scripting was a first-class feature.
        </figcaption>
      </figure>

      <ul>
        <li>
          <strong>1987:</strong> Bill Atkinson creates HyperCard; Apple ships it free with every Mac
        </li>
        <li>
          <strong>1988:</strong> Myst prototyped in HyperCard by Cyan Worlds
        </li>
        <li>
          <strong>1989:</strong> HyperCard 2.0 — scripting improvements and external commands
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

      <figure class="wc-figure">
        <img
          src="/images/learn/hypercard-stacks.png"
          alt="A collection of HyperCard stacks preserved on the Internet Archive, showing dozens of user-created stacks with custom icons and names"
          width="600"
        />
        <figcaption>
          Just a fraction of the thousands of HyperCard stacks created by users worldwide, preserved
          by the{" "}
          <a
            href="https://archive.org/details/hypercardstacks"
            target="_blank"
            rel="noopener noreferrer"
          >
            Internet Archive
          </a>
          .
        </figcaption>
      </figure>

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

      <figure class="wc-figure">
        <img
          src="/images/learn/hypercard-menu-bar.gif"
          alt="The HyperCard menu bar showing File, Edit, Go, Tools, and Objects menus"
          style={{ imageRendering: "pixelated" }}
        />
        <figcaption>
          The HyperCard menu bar: File, Edit, Go, Tools, Objects — WildCard recreates this exactly.
          Screenshot from{" "}
          <a
            href="https://folkstream.com/muse/teachhc/menu/menu.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Folkstream
          </a>
          .
        </figcaption>
      </figure>

      {/* Section 5 */}
      <h2>Try the Original</h2>
      <p>
        Want to experience the real thing? These resources let you run actual HyperCard software:
      </p>
      <ul>
        <li>
          <a href="https://infinitemac.org/" target="_blank" rel="noopener noreferrer">
            Infinite Mac
          </a>{" "}
          — Run real Mac OS 8 with HyperCard 2.4 right in your browser. No install needed.
        </li>
        <li>
          <a href="https://hcsimulator.com/" target="_blank" rel="noopener noreferrer">
            HyperCard Simulator
          </a>{" "}
          — Import and run classic HyperCard stacks in a web-based simulator.
        </li>
        <li>
          <a
            href="https://archive.org/details/hypercardstacks"
            target="_blank"
            rel="noopener noreferrer"
          >
            Internet Archive: HyperCard Stacks
          </a>{" "}
          — Thousands of preserved HyperCard stacks you can browse and play.
        </li>
      </ul>

      {/* Section 6 */}
      <h2>Learn More</h2>
      <ul>
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
        <li>
          <a
            href="https://archive.org/details/CC501_hypercard"
            target="_blank"
            rel="noopener noreferrer"
          >
            Computer Chronicles: HyperCard (1987)
          </a>{" "}
          — Bill Atkinson demonstrates HyperCard live on television
        </li>
        <li>
          <a href="https://folkstream.com/muse/teachhc/" target="_blank" rel="noopener noreferrer">
            Folkstream: Teach HyperCard
          </a>{" "}
          — Full tutorial with UI screenshots of every menu and tool
        </li>
      </ul>

      <p class="wc-legal-note">
        WildCard is NOT affiliated with Apple. "HyperCard" and "HyperTalk" are trademarks of Apple
        Inc. Images on this page are used for historical and educational purposes under fair use.
        Photo credits: Internet Archive, Higher Intellect Vintage Wiki, HyperCard Simulator,
        Folkstream.
      </p>
    </div>
  );
}
