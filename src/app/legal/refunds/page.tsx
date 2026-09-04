import type { Metadata } from "next";
import Link from "next/link";

import { PolicyHeader, Prose } from "@/components/prose";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Refund policy",
  description:
    "When we will refund a donation, how to ask, and what happens when the money has already reached the field.",
};

export default function RefundsPage() {
  const { legal } = siteConfig;

  return (
    <article>
      <PolicyHeader
        title="Refund policy"
        updated={siteConfig.policyDates.refunds}
        summary="Donations are gifts rather than purchases, so they are not generally refundable. Mistakes are a different matter, and we would rather fix one than keep money you did not mean to give."
      />

      <Prose>
        <h2>When we will refund</h2>
        <p>We refund without argument in these cases:</p>
        <ul>
          <li>
            <strong>You entered the wrong amount.</strong> Typing 5000 instead
            of 50 is a common and easily made mistake.
          </li>
          <li>
            <strong>You were charged more than once</strong> for the same
            intended gift.
          </li>
          <li>
            <strong>The donation was not made by you</strong> — for example
            someone used your card without permission. Tell your bank as well as
            us.
          </li>
          <li>
            <strong>A recurring gift continued after you cancelled it,</strong>{" "}
            or you did not realise you were setting up a recurring gift at all.
          </li>
          <li>
            <strong>We made an error</strong> in processing your donation.
          </li>
        </ul>

        <h2>How to ask</h2>
        <p>
          Email <a href={`mailto:${legal.email}`}>{legal.email}</a> with the
          date, the amount and the receipt reference if you have it. You do not
          need to explain yourself or justify the request.
        </p>
        <p>
          We aim to reply within two working days and to process an approved
          refund within five. The money returns to the card you used; how
          quickly it appears is then up to your bank, and usually takes a
          further three to ten days.
        </p>

        <h2>Requests after 90 days</h2>
        <p>
          We will still consider a request made more than 90 days after the
          donation, but by then the funds have very often already been
          transferred to a partner and spent. Where that has happened we may not
          be able to return the money, and we will tell you honestly and
          promptly rather than leaving the request open.
        </p>

        <h2>Cancelling a recurring gift</h2>
        <p>
          You can cancel a monthly gift at any time using the link in any
          receipt email, or by emailing us. Cancellation stops all future
          payments immediately. It does not automatically refund payments
          already taken, but if you were unaware the gift was recurring, say so
          and we will refund the payments you did not intend to make.
        </p>

        <h2>What a refund does to the published ledger</h2>
        <p>
          A refunded donation stops counting towards the amount raised from the
          moment it is refunded, and our{" "}
          <Link href="/transparency">published totals</Link> drop accordingly.
        </p>
        <p>
          We do not delete the original record. The donation stays in the ledger
          marked as refunded, because quietly removing a transaction from a
          published account is exactly the kind of thing this site exists not to
          do.
        </p>

        <h2>Chargebacks</h2>
        <p>
          If you dispute a donation with your bank rather than contacting us,
          the payment will be reversed and we are charged an additional fee by
          the payment processor. We would much rather you asked us first — we
          will not make it difficult.
        </p>

        <h2>Gift Aid and tax relief</h2>
        <p>
          If a refunded donation had Gift Aid claimed on it, we repay that claim
          to the tax authority. If you have already claimed tax relief on a
          donation that is later refunded, you may need to correct your own tax
          return; we will tell you the figures you need.
        </p>

        <h2>Contact</h2>
        <p>
          {legal.entityName}
          <br />
          {legal.address.join(", ")}
          <br />
          <a href={`mailto:${legal.email}`}>{legal.email}</a>
          <br />
          {legal.phone}
        </p>
      </Prose>
    </article>
  );
}
