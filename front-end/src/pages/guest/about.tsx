
import { Link } from "react-router";
import Navbar from "@/components/common/navbar";

function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FFFAF8]">
      <section className="relative overflow-hidden bg-[#292929] px-5 pb-24 pt-44 sm:px-8 lg:px-12 text-white">
        <Navbar />

        <div className="relative mx-auto max-w-7xl">
          <span className="rounded-full bg-[#E8A0A0]/20 border border-[#E8A0A0]/40 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.35em] text-[#FFF5F5] backdrop-blur-md">
            Discover • Explore • Experience
          </span>

          <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
            Discover the Beauty of Cordova
          </h1>

          <p className="mt-6 max-w-2xl text-sm leading-8 text-white/85 sm:text-base">
            Your premier guide to discovering coastal destinations, local
            attractions, culture, and unforgettable tourism experiences
            in the municipality of Cordova, Cebu.
          </p>

          <Link
            to="/destinations"
            className="mt-9 inline-flex rounded-full bg-[#E8A0A0] px-8 py-4 text-sm font-bold text-[#292929] transition hover:bg-[#FFF5F5] shadow-lg"
          >
            Explore Destinations
          </Link>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
        <section className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="rounded-full bg-[#FCEBEC] px-4 py-1 text-xs font-bold uppercase tracking-[0.3em] text-[#C96B6B]">
              About Us
            </span>

            <h2 className="mt-4 font-display text-3xl font-semibold text-[#292929] sm:text-4xl">
              What is Asa sa Cordova?
            </h2>

            <p className="mt-6 text-sm leading-8 text-[#716767]">
              Asa sa Cordova is a professionally designed tourism discovery platform
              created to help visitors and local residents explore remarkable spots,
              scenic resorts, and coastal experiences across Cordova, Cebu.
            </p>

            <p className="mt-4 text-sm leading-8 text-[#716767]">
              The platform integrates destination directories, interactive map routing,
              visitor reviews, and community stories into one elegant, responsive website.
            </p>
          </div>

          <div className="rounded-3xl bg-[#FCEBEC] border border-[#E8A0A0]/50 p-8 sm:p-10 shadow-sm">
            <span className="rounded-full bg-white px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C96B6B]">
              Our Purpose
            </span>

            <h3 className="mt-5 font-display text-2xl font-semibold text-[#292929]">
              Making local destination discovery seamless and inspiring.
            </h3>

            <p className="mt-4 text-sm leading-7 text-[#716767]">
              We aim to provide organized, verified information so travelers can easily
              discover places to visit, check precise map routes, and experience more
              of what Cordova has to offer.
            </p>
          </div>
        </section>

        <section className="mt-24">
          <div className="max-w-2xl">
            <span className="rounded-full bg-[#FCEBEC] px-4 py-1 text-xs font-bold uppercase tracking-[0.3em] text-[#C96B6B]">
              What You Can Discover
            </span>

            <h2 className="mt-4 font-display text-3xl font-semibold text-[#292929] sm:text-4xl">
              Explore Cordova in One Place
            </h2>

            <p className="mt-4 text-sm leading-7 text-[#716767]">
              Find useful tourist information and discover diverse coastal experiences
              throughout the municipality.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                number: "01",
                title: "Destinations",
                description:
                  "Discover resorts, beaches, restaurants, cafes, and landmarks across Cordova.",
              },
              {
                number: "02",
                title: "Interactive Mapping",
                description:
                  "Explore destination coordinates on Leaflet maps with multi-mode travel routing.",
              },
              {
                number: "03",
                title: "Visited & Favorites",
                description:
                  "Save your favorite spots and keep track of destinations you've already visited.",
              },
              {
                number: "04",
                title: "Culture & Events",
                description:
                  "Learn about local heritage, community celebrations, and upcoming events.",
              },
              {
                number: "05",
                title: "Visitor Feedback",
                description:
                  "Share your experiences and read ratings left by fellow travelers.",
              },
              {
                number: "06",
                title: "Helpful Guide Details",
                description:
                  "Find operating hours, entrance fees, contact numbers, and address notes.",
              },
            ].map((item) => (
              <article
                key={item.number}
                className="rounded-3xl border border-[#F1E5DF] bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg shadow-sm"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF5F5] text-xs font-bold text-[#C96B6B] border border-[#E8A0A0]">
                  {item.number}
                </span>

                <h3 className="mt-5 font-display text-xl font-semibold text-[#292929]">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#716767]">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-24 rounded-3xl bg-[#FCEBEC] border border-[#E8A0A0]/50 px-7 py-14 text-center sm:px-12 shadow-sm">
          <span className="rounded-full bg-white px-4 py-1 text-xs font-bold uppercase tracking-[0.3em] text-[#C96B6B] border border-[#E8A0A0]">
            Asa sa Cordova
          </span>

          <h2 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-semibold text-[#292929] sm:text-4xl">
            Your coastal journey around Cordova starts here.
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#716767]">
            Explore local destinations and discover unforgettable experiences
            waiting for you.
          </p>

          <Link
            to="/destinations"
            className="mt-8 inline-flex rounded-full bg-[#C96B6B] px-8 py-4 text-sm font-bold text-white transition hover:bg-[#292929] shadow-md"
          >
            Discover Destinations
          </Link>
        </section>
      </main>

      <footer className="bg-[#292929] px-5 py-8 text-center text-xs text-white/60">
        Asa sa Cordova · Discover • Explore • Experience
      </footer>
    </div>
  );
}

export default AboutPage;
