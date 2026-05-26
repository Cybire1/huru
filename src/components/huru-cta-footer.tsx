"use client";

import Link from "next/link";
import { Icon } from "./huru-icons";
import { HuruFlame } from "./huru-flame";

export function HuruCtaMonument() {
  return (
    <section className="cta-monument" id="start">
      <div className="credit-chip"><b>100 credits</b> · free on signup</div>
      <div className="flame-mini">
        <HuruFlame size={180} drift={false} />
      </div>
      <h2>
        Inference,<br />
        <em>attested.</em>
      </h2>
      <div className="actions">
        <Link href="/dashboard" className="btn btn-primary">
          Get API key
          <span className="btn-arrow"><Icon.Arrow width={12} height={12} /></span>
        </Link>
        <Link href="/docs" className="btn btn-ghost">Read docs</Link>
      </div>
    </section>
  );
}
