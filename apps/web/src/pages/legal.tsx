/**
 * Legal page — required disclaimers, trademark acknowledgments, and policies.
 */
export function LegalPage() {
  return (
    <div class="wc-legal">
      <h1>Legal</h1>

      <h2>Trademark Disclaimer</h2>
      <p>
        WildCard is an independent open-source project. It is{" "}
        <strong>not affiliated with, endorsed by, or sponsored by Apple Inc.</strong>
      </p>
      <p>
        "HyperCard" and "HyperTalk" are trademarks of Apple Inc. All Apple trademarks are the
        property of Apple Inc., registered in the U.S. and other countries.
      </p>
      <p>
        WildCard is inspired by Apple's HyperCard (1987-2004) and uses "WildTalk" as its scripting
        language. The name "WildCard" is a reference to Bill Atkinson's original working name for
        the project that became HyperCard.
      </p>

      <h2>Open Source License</h2>
      <p>
        WildCard is released under the <strong>MIT License</strong>. You are free to use, modify,
        and distribute the software in accordance with the terms of the license.
      </p>
      <p>The full license text is available in the project repository.</p>

      <h2>Legal Basis</h2>
      <ul>
        <li>
          Programming language syntax is not copyrightable (
          <em>Google LLC v. Oracle America, Inc.</em>, 2021).
        </li>
        <li>Referencing HyperCard as inspiration constitutes nominative fair use.</li>
        <li>No Apple logos, icons, or verbatim documentation are used in this project.</li>
      </ul>

      <h2>Privacy Policy</h2>
      <p>
        WildCard respects your privacy. When you use the editor without an account, all data is
        stored locally in your browser (localStorage). No personal information is collected or
        transmitted.
      </p>
      <p>
        When account features are available, this section will be updated with full details on data
        collection, storage, and your rights under applicable privacy laws.
      </p>

      <h2>Content Moderation Policy</h2>
      <p>
        When the community gallery launches, published stacks will be subject to content moderation.
        This includes:
      </p>
      <ul>
        <li>Automated scanning of text and images before publication</li>
        <li>User reporting for inappropriate content</li>
        <li>Manual review queue for flagged content</li>
        <li>DMCA takedown process for copyrighted material</li>
      </ul>
      <p>
        Prohibited content includes but is not limited to: hate speech, harassment, illegal content,
        malware, and content that infringes on intellectual property rights.
      </p>

      <h2>Gallery Terms of Service</h2>
      <p>
        Terms of service for the community gallery will be published when the feature becomes
        available. They will cover content ownership, user responsibilities, and prohibited content
        policies.
      </p>

      <h2>Contact</h2>
      <p>
        For legal inquiries, please open an issue on the project's GitHub repository or contact the
        maintainers directly.
      </p>
    </div>
  );
}
