import type { Metadata } from "next";
import Link from "next/link";

import { PolicyHeader, Prose } from "@/components/prose";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The terms on which this site is provided and donations are accepted, including what happens to funds when an appeal is overfunded.",
};

export default function TermsPage() {
  const { legal } = siteConfig;

  return (
    <article>
      <PolicyHeader
        title="Terms"
        updated={siteConfig.policyDates.terms}
        summary="The terms on which we provide this site and accept donations through it."
      />

      <Prose>
        <h2>Who you are dealing with</h2>
        <p>
          This site is operated by {legal.entityName},{" "}
          {legal.registrationAuthority} number {legal.registrationNumber},
          registered at {legal.address.join(", ")}.
        </p>

        <h2>Donations are gifts</h2>
        <p>
          A donation is a gift, not a purchase. You receive no goods, services
          or other benefit in return, which is what allows it to be treated as
          charitable giving for tax purposes.
        </p>
        <p>
          By donating you confirm that the funds are yours to give, that you are
          using a payment method you are authorised to use, and that you are at
          least 16 years old.
        </p>

        <h2>Choosing an appeal, and what happens if it is overfunded</h2>
        <p>
          When you give to a named appeal we apply your donation to that appeal.
          This is the most important clause on this page, so it is worth stating
          plainly:
        </p>
        <p>
          <strong>
            If an appeal reaches its goal, is closed, or circumstances make the
            planned work impossible or unwise, we will apply surplus funds to
            other emergency work of a similar character.
          </strong>{" "}
          Our trustees hold this power, it is standard for emergency appeals,
          and without it money can end up frozen against work that can no longer
          be done.
        </p>
        <p>
          When we exercise it, we say so publicly on the appeal page and record
          the redirection in the{" "}
          <Link href="/transparency/ledger">ledger</Link> rather than moving the
          money quietly. If you would prefer your gift not be redirected, tell
          us when you give and we will either honour that or return the funds.
        </p>

        <h2>What our published figures mean</h2>
        <p>
          The financial figures on this site are computed directly from our
          donation and disbursement records, and we publish the method on the{" "}
          <Link href="/transparency">transparency page</Link>.
        </p>
        <p>
          They are management information, updated continuously, and they are
          not a substitute for our audited annual accounts. Where the two differ,
          the audited accounts are authoritative. If you find a discrepancy we
          want to hear about it.
        </p>

        <h2>Our partners</h2>
        <p>
          We fund independent organisations to deliver aid. We vet them and
          require them to account for what they spend, but they are separate
          legal entities and we are not liable for their acts or omissions
          beyond our own duties in selecting and monitoring them.
        </p>

        <h2>Using the site</h2>
        <p>You agree not to:</p>
        <ul>
          <li>
            submit donations using payment details you are not authorised to
            use, or use the donation form to test stolen card numbers;
          </li>
          <li>
            attempt to gain unauthorised access to any part of the site or its
            infrastructure;
          </li>
          <li>
            interfere with the site&rsquo;s operation, including by automated
            requests at a volume that degrades it for others;
          </li>
          <li>
            submit content — prayer intentions, dedications, messages — that is
            unlawful, abusive, or discloses another person&rsquo;s private
            information without their consent.
          </li>
        </ul>
        <p>
          Prayer intentions and dedications are reviewed before publication and
          we may decline or remove any of them.
        </p>

        <h2>Content you submit</h2>
        <p>
          You keep ownership of anything you write. By submitting it for
          publication you give us permission to display it on this site. Ask us
          and we will remove it.
        </p>

        <h2>Our content</h2>
        <p>
          Text and images on this site belong to us or our partners and are
          protected by copyright. The data in our published ledger is a
          different matter: you may freely download, republish and analyse it,
          with attribution. Independent scrutiny is the entire point of
          publishing it.
        </p>

        <h2>Availability</h2>
        <p>
          We work to keep the site available and accurate but we do not warrant
          that it will be uninterrupted or error-free. We may suspend it for
          maintenance. Nothing in these terms limits our liability for death or
          personal injury caused by negligence, for fraud, or for anything else
          that cannot lawfully be limited.
        </p>

        <h2>Governing law</h2>
        <p>
          These terms are governed by the law of{" "}
          {legal.address[legal.address.length - 1]}, and disputes are subject to
          the exclusive jurisdiction of its courts.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms and will change the date at the top of the
          page when we do. The terms that apply to your donation are those
          published at the time you made it.
        </p>

        <h2>Contact</h2>
        <p>
          <a href={`mailto:${legal.email}`}>{legal.email}</a>
          <br />
          {legal.phone}
        </p>
      </Prose>
    </article>
  );
}
