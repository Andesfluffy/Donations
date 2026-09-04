import type { Metadata } from "next";
import Link from "next/link";

import { PolicyHeader, Prose } from "@/components/prose";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What personal data this site collects, why, who processes it, how long it is kept, and the rights you have over it.",
};

export default function PrivacyPage() {
  const { legal, processors } = siteConfig;

  return (
    <article>
      <PolicyHeader
        title="Privacy policy"
        updated={siteConfig.policyDates.privacy}
        summary="What we collect, why we collect it, who else touches it, and what you can make us do about it."
      />

      <Prose>
        <h2>Who is responsible for your data</h2>
        <p>
          {legal.entityName}, {legal.registrationAuthority} number{" "}
          {legal.registrationNumber}, of {legal.address.join(", ")}, is the data
          controller. You can reach us at{" "}
          <a href={`mailto:${legal.email}`}>{legal.email}</a>.
        </p>

        <h2>What we collect</h2>

        <h3>When you donate</h3>
        <p>
          Your name, email address, country, the amount and the appeal you
          chose, plus any message or dedication you write. If you claim UK Gift
          Aid we also record your home address, because the tax authority
          requires it.
        </p>
        <p>
          <strong>We never see or store your card number.</strong> Card details
          are entered on Stripe&rsquo;s own payment page and never touch our
          servers. We receive back only a token, the last four digits and the
          card brand.
        </p>

        <h3>When you simply read the site</h3>
        <p>
          Standard server logs, containing your IP address, the pages requested
          and your browser type. We use these to keep the site running and to
          detect abuse. We do not run advertising trackers, and we do not build
          a profile of you across other websites.
        </p>

        <h3>Rate limiting</h3>
        <p>
          Donation forms are a standing target for stolen-card testing, where an
          attacker runs thousands of small charges to find which numbers still
          work. To prevent it we keep a short-lived record of the IP addresses
          submitting donation attempts. These records expire within an hour.
        </p>

        <h2>Why we are allowed to hold it</h2>
        <ul>
          <li>
            <strong>To perform a contract</strong> — processing the donation you
            asked us to process, and sending your receipt.
          </li>
          <li>
            <strong>Legal obligation</strong> — charity accounting, tax
            reporting and anti-money-laundering requirements.
          </li>
          <li>
            <strong>Legitimate interests</strong> — keeping the site secure and
            preventing fraud against it.
          </li>
          <li>
            <strong>Consent</strong> — sending you updates about our work. You
            can withdraw this at any time and we will stop.
          </li>
        </ul>

        <h2>Who else processes it</h2>
        <p>
          We use the following providers. Each is bound by contract to process
          data only on our instructions, and none of them is permitted to use it
          for their own purposes.
        </p>
        <table>
          <caption className="sr-only">
            Third-party processors and what each is used for
          </caption>
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="py-2 pr-4 font-medium text-ink">
                Provider
              </th>
              <th scope="col" className="py-2 pr-4 font-medium text-ink">
                Purpose
              </th>
              <th scope="col" className="py-2 font-medium text-ink">
                Region
              </th>
            </tr>
          </thead>
          <tbody>
            {processors.map((processor) => (
              <tr key={processor.name} className="border-b border-line last:border-0">
                <th scope="row" className="py-2 pr-4 text-left font-normal text-ink">
                  {processor.name}
                </th>
                <td className="py-2 pr-4">{processor.purpose}</td>
                <td className="py-2">{processor.region}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Some of these providers operate outside the UK and EEA. Where data is
          transferred internationally it is covered by the UK International Data
          Transfer Agreement or the EU Standard Contractual Clauses.
        </p>

        <h2>What appears in public</h2>
        <p>
          Our{" "}
          <Link href="/transparency/ledger">published ledger</Link> shows money
          leaving us: dates, amounts, receiving organisations and purposes. It
          contains no donor names or personal details of any kind.
        </p>
        <p>
          Individual donations appear in public only as anonymous numbers in a
          total. If you asked us to publish your name alongside a gift, you can
          ask us to remove it at any time.
        </p>

        <h2>How long we keep it</h2>
        <ul>
          <li>
            <strong>Donation and Gift Aid records</strong> — seven years after
            the end of the financial year, as charity and tax law require.
          </li>
          <li>
            <strong>Marketing preferences</strong> — until you change them, plus
            a permanent suppression record so an unsubscribe is never
            accidentally undone by a later import.
          </li>
          <li>
            <strong>Server logs</strong> — 30 days.
          </li>
          <li>
            <strong>Rate-limiting records</strong> — one hour.
          </li>
        </ul>

        <h2>Cookies</h2>
        <p>
          We use no advertising or analytics cookies. The site sets a cookie
          only where one is strictly necessary — to keep an administrator signed
          in, and to remember whether you chose the light or dark theme. Your
          theme choice is stored in your own browser and never sent to us.
        </p>

        <h2>Your rights</h2>
        <p>
          Depending on where you live you may have the right to access a copy of
          your data, correct it, delete it, restrict or object to how we use it,
          receive it in a portable format, and withdraw consent. To exercise any
          of these, email{" "}
          <a href={`mailto:${legal.email}`}>{legal.email}</a>. We will respond
          within 30 days and we will not charge you.
        </p>
        <p>
          As explained in our{" "}
          <Link href="/legal/donor-privacy">donor privacy policy</Link>, the one
          thing we cannot erase is the accounting record of a donation you
          actually made, because we are legally required to keep it.
        </p>
        <p>
          If you are unhappy with how we have handled your data you can complain
          to your national data-protection regulator. In the UK that is the
          Information Commissioner&rsquo;s Office at{" "}
          <a href="https://ico.org.uk">ico.org.uk</a>.
        </p>

        <h2>Children</h2>
        <p>
          This site is not directed at children, and we do not knowingly accept
          donations from anyone under 16. If you believe a child has given us
          personal data, contact us and we will delete it.
        </p>

        <h2>Changes</h2>
        <p>
          When we change this policy we update the date at the top of this page.
          If a change materially affects how we use data you have already given
          us, we will email you before it takes effect.
        </p>
      </Prose>
    </article>
  );
}
