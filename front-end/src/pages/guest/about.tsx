
import { Link } from "react-router";
import { Mail, MapPin, Phone } from "lucide-react";

import Navbar from "@/components/common/navbar";

function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FAF6F5]">
      <section className="relative overflow-hidden bg-[#58111A] px-5 pb-24 pt-44 sm:px-8 lg:px-12 text-white">
        <Navbar />

        <div className="relative mx-auto max-w-7xl">
          <span className="rounded-full bg-[#800020]/40 border border-[#F2DCDA]/40 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.35em] text-[#FFF0F2] backdrop-blur-md">
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
            className="mt-9 inline-flex rounded-full bg-[#F2DCDA] px-8 py-4 text-sm font-bold text-[#58111A] transition hover:bg-[#FFF0F2] shadow-lg"
          >
            Explore Destinations
          </Link>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
        <section className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="rounded-full bg-[#FFF0F2] px-4 py-1 text-xs font-bold uppercase tracking-[0.3em] text-[#800020]">
              About Us
            </span>

            <h2 className="mt-4 font-display text-3xl font-semibold text-[#58111A] sm:text-4xl">
              What is Asa sa Cordova?
            </h2>

            <p className="mt-6 text-sm leading-8 text-[#7A585B]">
              Asa sa Cordova is a professionally designed tourism discovery platform
              created to help visitors and local residents explore remarkable spots,
              scenic resorts, and coastal experiences across Cordova, Cebu.
            </p>

            <p className="mt-4 text-sm leading-8 text-[#7A585B]">
              The platform integrates destination directories, interactive map routing,
              visitor reviews, and community stories into one elegant, responsive website.
            </p>
          </div>

          <div className="rounded-3xl bg-[#FFF0F2] border border-[#EBD5D3] p-8 sm:p-10 shadow-sm">
            <span className="rounded-full bg-white px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#800020]">
              Our Purpose
            </span>

            <h3 className="mt-5 font-display text-2xl font-semibold text-[#58111A]">
              Making local destination discovery seamless and inspiring.
            </h3>

            <p className="mt-4 text-sm leading-7 text-[#7A585B]">
              We aim to provide organized, verified information so travelers can easily
              discover places to visit, check precise map routes, and experience more
              of what Cordova has to offer.
            </p>
          </div>
        </section>

        <section className="mt-24">
          <div className="max-w-2xl">
            <span className="rounded-full bg-[#FFF0F2] px-4 py-1 text-xs font-bold uppercase tracking-[0.3em] text-[#800020]">
              What You Can Discover
            </span>

            <h2 className="mt-4 font-display text-3xl font-semibold text-[#58111A] sm:text-4xl">
              Explore Cordova in One Place
            </h2>

            <p className="mt-4 text-sm leading-7 text-[#7A585B]">
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
                className="rounded-3xl border border-[#EBD5D3] bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg shadow-sm"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF0F2] text-xs font-bold text-[#800020] border border-[#EBD5D3]">
                  {item.number}
                </span>

                <h3 className="mt-5 font-display text-xl font-semibold text-[#58111A]">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#7A585B]">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-24 rounded-3xl border border-[#EBD5D3] bg-white p-8 shadow-sm sm:p-12">
          <span className="rounded-full bg-[#FFF0F2] px-4 py-1 text-xs font-bold uppercase tracking-[0.3em] text-[#800020]">
            Contact Us
          </span>

          <h2 className="mt-4 font-display text-3xl font-semibold text-[#58111A] sm:text-4xl">
            Get in Touch
          </h2>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#7A585B]">
            Official contact details will be added after verification. The
            placeholders below are clearly labeled so no unconfirmed phone
            number, email address, or office location is presented as fact.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                label: "Email",
                value: "Placeholder — replace with official email",
                icon: Mail,
              },
              {
                label: "Phone",
                value: "Placeholder — replace with official phone",
                icon: Phone,
              },
              {
                label: "Office",
                value: "Placeholder — replace with verified office address",
                icon: MapPin,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.label}
                  className="rounded-2xl border border-[#EBD5D3] bg-[#FAF6F5] p-6"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF0F2] text-[#800020]">
                    <Icon size={18} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#800020]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#7A585B]">
                    {item.value}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-24 rounded-3xl bg-[#FFF0F2] border border-[#EBD5D3] px-7 py-14 text-center sm:px-12 shadow-sm">
          <span className="rounded-full bg-white px-4 py-1 text-xs font-bold uppercase tracking-[0.3em] text-[#800020] border border-[#EBD5D3]">
            Asa sa Cordova
          </span>

          <h2 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-semibold text-[#58111A] sm:text-4xl">
            Your coastal journey around Cordova starts here.
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#7A585B]">
            Explore local destinations and discover unforgettable experiences
            waiting for you.
          </p>

          <Link
            to="/destinations"
            className="mt-8 inline-flex rounded-full bg-[#800020] px-8 py-4 text-sm font-bold text-white transition hover:bg-[#58111A] shadow-md"
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
