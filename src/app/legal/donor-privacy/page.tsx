import type { Metadata } from "next";
import Link from "next/link";

import { PolicyHeader, Prose } from "@/components/prose";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Donor privacy",
  description:
    "We do not sell, rent, trade or share donor information with anyone, for any purpose. This page says so in terms you can hold us to.",
};

export default function DonorPrivacyPage() {
  const { legal } = siteConfig;

  return (
    <article>
      <PolicyHeader
        title="Donor privacy"
        updated={siteConfig.policyDates.donorPrivacy}
        summary="A separate, shorter promise about donor data specifically — because the most common thing charities do with it is the thing donors least expect."
      />

      <Prose>
        <h2>We do not sell your data. Ever.</h2>
        <p>
          <strong>
            {siteConfig.name} does not sell, rent, trade, swap or otherwise
            disclose your name, address, email address or giving history to any
            other organisation, for any purpose, in exchange for money or
            anything else.
          </strong>{" "}
          This includes other charities, list brokers, data co-operatives,
          advertising networks and political organisations.
        </p>
        <p>
          Exchanging donor lists is a normal and legal practice in the charity
          sector. We do not do it. If you gave to us and then started receiving
          post from an organisation you have never heard of, it did not come
          from us.
        </p>

        <h2>What we do with your details</h2>
        <p>We use your information only to:</p>
        <ul>
          <li>process your donation and send you a receipt;</li>
          <li>
            administer a recurring gift, including telling you before a payment
            method expires;
          </li>
          <li>
            issue the tax documentation you are entitled to in your country;
          </li>
          <li>
            tell you what happened as a result of the appeal you gave to, if you
            have asked to hear about it;
          </li>
          <li>meet our own legal, accounting and audit obligations.</li>
        </ul>

        <h2>Choosing to be anonymous</h2>
        <p>
          You can give anonymously. An anonymous gift still appears in our
          published totals and still funds the appeal you chose, but your name
          is not attached to it anywhere a member of the public can see.
        </p>
        <p>
          We never publish a donor&rsquo;s name without an explicit opt-in. There
          is no public donor wall that you have to remember to remove yourself
          from.
        </p>

        <h2>How often we will contact you</h2>
        <p>
          Every email we send that is not a receipt or a payment notice has a
          one-click unsubscribe link, and unsubscribing takes effect
          immediately rather than within some number of working days. You can
          also ask us to contact you only when there is a genuine emergency
          appeal, and not otherwise.
        </p>

        <h2>Gifts in memory or in honour of someone</h2>
        <p>
          If you make a gift in memory of a person, we will not contact their
          family unless you have told us they want to hear from us and you have
          given us their details for that purpose.
        </p>

        <h2>Seeing or deleting what we hold</h2>
        <p>
          You can ask us for a copy of everything we hold about you, ask us to
          correct it, or ask us to delete it. Write to{" "}
          <a href={`mailto:${legal.email}`}>{legal.email}</a> and we will
          respond within 30 days.
        </p>
        <p>
          One limit worth being straight about: we cannot delete the accounting
          record of a donation you actually made. Charity and tax law require us
          to keep it, and our published ledger depends on it. What we can do is
          remove your personal details from everything except that record, and
          stop contacting you entirely.
        </p>

        <h2>The wider policy</h2>
        <p>
          This page covers donor data specifically. Our full{" "}
          <Link href="/legal/privacy">privacy policy</Link> covers everyone who
          uses the site, including the processors we rely on and your rights
          under data-protection law.
        </p>

        <h2>Contact</h2>
        <p>
          {legal.entityName}
          <br />
          {legal.address.join(", ")}
          <br />
          <a href={`mailto:${legal.email}`}>{legal.email}</a>
        </p>
      </Prose>
    </article>
  );
}
