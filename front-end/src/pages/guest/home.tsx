import { Link } from "react-router";

import Navbar from "@/components/common/navbar";
import DestinationCard from "@/components/guest/destination-card";
import { destinations } from "@/lib/destinations";

import heroImage from "@/assets/images/hero-cordova.jpg";

function HomePage() {
  return (
    <main className="bg-[#FFFAF8]">
      {/* Hero Section */}
      <section
        id="home"
        className="relative min-h-[650px] overflow-hidden pb-20 sm:min-h-[700px]"
      >
        {/* Drone Video Background with Fallback Poster */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={heroImage}
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          >
            <source
              src="/videos/cordova-drone.mp4"
              type="video/mp4"
            />
            Your browser does not support HTML5 video.
          </video>
        </div>

        {/* Background Overlays for Readability */}
        <div className="absolute inset-0 z-1 bg-[#292929]/40" />
        <div className="absolute inset-0 z-1 bg-gradient-to-b from-[#292929]/50 via-transparent to-[#292929]/80" />

        <div className="relative z-30">
          <Navbar />
        </div>

        {/* Hero Content */}
        <div className="relative z-20 mx-auto flex min-h-[550px] max-w-7xl flex-col items-center justify-center px-6 pb-16 pt-40 text-center text-white sm:min-h-[600px]">
          <span className="rounded-full bg-[#E8A0A0]/30 border border-[#E8A0A0]/50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-[#FFF5F5] backdrop-blur-md mb-6">
            Your Local Guide to Cordova, Cebu
          </span>

          <h1 className="mt-2 max-w-5xl font-display text-5xl font-semibold leading-[1.12] sm:text-6xl lg:text-7xl text-white">
            Discover the Beauty
            <br />
            of <span className="text-[#E8A0A0]">Cordova.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-white/90 sm:text-base">
            Explore breathtaking coastal destinations, scenic bridge views, and vibrant local tourism
            experiences around Cordova, Cebu.
          </p>

          <a
            href="#featured-destinations"
            className="group mt-9 inline-flex items-center gap-4 rounded-full bg-[#E8A0A0] px-9 py-4 text-sm font-bold text-[#292929] shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-[#FFF5F5]"
          >
            Explore Destinations
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C96B6B] text-lg text-white transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </a>
        </div>
      </section>

      {/* Popular Destinations Section (Below Hero in Normal Document Flow) */}
      <section id="featured-destinations" className="bg-[#FFFAF8] px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <span className="rounded-full bg-[#FCEBEC] px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-[#C96B6B]">
              Top Rated Places
            </span>
            <h2 className="mt-3 font-display text-3xl font-semibold text-[#292929] sm:text-4xl">
              Popular Destinations
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {destinations.slice(0, 4).map((destination) => (
              <DestinationCard
                key={destination.slug}
                {...destination}
              />
            ))}
          </div>
        </div>
      </section>

      {/* More to Explore Section */}
      <section id="more-to-explore" className="bg-[#FFFAF8] px-6 pb-24 pt-8 sm:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center text-center">
            <span className="rounded-full bg-[#FCEBEC] px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-[#C96B6B]">
              Experience Cordova
            </span>

            <h2 className="mt-4 font-display text-3xl font-semibold text-[#292929] sm:text-4xl">
              More to Explore, More to Experience
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#716767] sm:text-base">
              Discover the places, coastal views, and local experiences
              that make Cordova a premier destination worth visiting.
            </p>

            <Link
              to="/destinations"
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#C96B6B] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#292929] shadow-md"
            >
              View All Destinations
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default HomePage;
