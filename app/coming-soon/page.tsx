import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import { fredoka } from "@/lib/fonts";
import EmailSignupForm from "@/components/EmailSignupForm";
import AucklandSkylineArt from "@/components/comingSoon/AucklandSkylineArt";
import {
  CheckIcon, DumbbellIcon, FlowerIcon, MapPinIcon, PhoneIcon, SearchIcon,
  StoreIcon, SuitcaseIcon, TicketIcon, UsersIcon, UtensilsIcon, WrenchIcon,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "MegaDeal is coming to Auckland",
  description: "Local deals, local businesses and real value for Aucklanders. Join MegaDeal before launch.",
  alternates: { canonical: `${SITE_URL}/coming-soon` },
};

const categories = [
  ["Food & Drink", UtensilsIcon, "photo-1568901346375-23c9450c58cd"],
  ["Spas & Beauty", FlowerIcon, "photo-1544161515-4ab6ce6db874"],
  ["Gyms & Fitness", DumbbellIcon, "photo-1534438327276-14e5300c3a48"],
  ["Things to Do", TicketIcon, "photo-1502680390469-be75c86b636f"],
  ["Getaways & Stays", SuitcaseIcon, "photo-1566073771259-6a8506099945"],
  ["Home & Auto Services", WrenchIcon, "photo-1486262715619-67b85e0b08d3"],
] as const;

const benefits = ["No commission on sales", "Customers deal directly with you", "You control your offer and availability", "Reach new local customers", "A simple, effective way to grow your business"];

export default function ComingSoonPage() {
  return <main className="cs-page">
    <section className="cs-hero cs-shell">
      <div className="cs-hero-copy">
        <p className="cs-kicker">COMING SOON</p>
        <h1 className={fredoka.className}>Auckland, get<br/>ready for better<br/>days out.</h1>
        <span className="cs-swoop" />
        <p className="cs-intro">Local deals. Local businesses. Real value for Aucklanders.<br/>MegaDeal is launching in Auckland first — with Wellington,<br/>Christchurch, Queenstown and Hamilton to follow.</p>
        <div className="cs-audience">
          <a href="#launch-updates" className="cs-choice pink"><span className="cs-choice-icon">♥</span><h2>Love a good deal?</h2><p>Be the first to know when we launch in Auckland and get early access to amazing local offers.</p><b>Get launch updates　→</b></a>
          <Link href="/list-your-business" className="cs-choice purple"><span className="cs-choice-icon"><StoreIcon/></span><h2>Run a local business?</h2><p>Join before launch and reach new customers with <strong>up to 6 months advertising free.*</strong></p><b>List my business　→</b></Link>
        </div>
      </div>
      <div className="cs-city">
        <AucklandSkylineArt shape="fill" className="cs-city-art" />
        <p className={`${fredoka.className} cs-city-note`}>Same city.<br/>More to love.<span>♡</span></p>
        <img src="/brand/deal-hunter-elephant.svg" alt="MegaDeal elephant" />
        <p className={`${fredoka.className} cs-hand-note`}>Local deals<br/>from local<br/>businesses.<br/>For Auckland.</p>
      </div>
    </section>

    <section className="cs-trust cs-shell">
      <div>◒ <span>No vouchers<br/>to buy</span></div><div>♥ <span>Support local<br/>businesses</span></div><div><UsersIcon/><span>A fairer way<br/>for local communities</span></div><div><MapPinIcon/><span><b>Launching in Auckland first</b><br/>Then Wellington, Christchurch,<br/>Queenstown & Hamilton</span></div>
    </section>

    <section className="cs-how cs-shell">
      <div className="cs-section-heading"><h2 className={fredoka.className}>How MegaDeal will work</h2><em>Local deals made easy.</em></div>
      <div className="cs-steps">
        {[["1",SearchIcon,"Find a deal","Browse offers from local Auckland businesses."],["2",TicketIcon,"Get the deal code","No payment or voucher purchase required."],["3",PhoneIcon,"Book direct & enjoy","Contact the business, quote your code and pay them directly."]].map(([n,I,t,c]) => { const Icon=I as typeof SearchIcon; return <div className="cs-step" key={t as string}><i>{n as string}</i><span><Icon/></span><p><b>{t as string}</b><small>{c as string}</small></p></div>})}
      </div>
    </section>

    <section id="categories" className="cs-categories cs-shell">
      <h2 className={fredoka.className}>Deals across more of what you love</h2>
      <div>{categories.map(([name,Icon,id]) => <a href="#launch-updates" key={name} className="cs-category"><span style={{backgroundImage:`url(https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&q=75)`}}/><i><Icon/></i><b>{name}</b></a>)}</div>
    </section>

    <section id="launch-updates" className="cs-signup cs-shell">
      <div><h2 className={fredoka.className}>Be the first to know</h2><p>Sign up and we&apos;ll let you know when we launch in Auckland, plus early access to special offers.</p><EmailSignupForm audience="customer" source="coming-soon" buttonLabel="Keep me posted　→" accent="ember" surface="plain" /></div>
      <div className="cs-plane">✈<span className={fredoka.className}>Be part<br/>from the<br/>beginning. ♡</span></div>
    </section>

    <section className="cs-bottom cs-shell">
      <div className="cs-business">
        <p className="cs-kicker">FOR AUCKLAND BUSINESSES</p><h2 className={fredoka.className}>Fill quiet times.<br/>Get more customers.</h2><p>Turn empty tables, spare capacity and quiet periods into revenue.<br/>Join MegaDeal before launch and receive:</p>
        <div className="cs-business-grid"><strong>📣　Up to<br/><big>6 months</big><br/>　　advertising free.*</strong><ul>{benefits.map(x=><li key={x}><CheckIcon/>{x}</li>)}</ul></div>
        <div><Link href="/list-your-business">List my business　→</Link><u>Use code <b>WELCOME6</b></u></div>
      </div>
      <div className="cs-launch"><p className="cs-kicker">OUR LAUNCH PLAN</p><ol><li><b>Auckland</b><small>Launching soon</small></li>{["Wellington","Christchurch","Queenstown","Hamilton"].map(x=><li key={x}>{x}<small>Coming soon</small></li>)}</ol><p className={`${fredoka.className} cs-launch-note`}>More local<br/>deals across<br/>New Zealand<br/>coming soon.</p><div className="cs-nz">◆</div></div>
    </section>
  </main>;
}
