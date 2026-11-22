import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

import Navbar from "@/components/common/navbar";
import DestinationCard from "@/components/guest/destination-card";
import { useDestinations } from "@/lib/use-destinations";

import heroImage from "@/assets/images/hero-cordova.jpg";

function HomePage() {
  // Home shows published API destinations, not a hard-coded list.
  const { destinations, loading } = useDestinations();
  // A failed video request switches the hero to the existing Cordova image.
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <main className="bg-[#FAF6F5]">
      {/* Hero Section */}
      <section
        id="home"
        className="relative min-h-[650px] overflow-hidden pb-20 sm:min-h-[700px]"
      >
        {/* Silent drone video replaces the poster; an image appears if playback fails. */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {videoFailed ? (
            <img
              src={heroImage}
              alt="Aerial view of Cordova"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              onError={() => setVideoFailed(true)}
              className="absolute inset-0 h-full w-full object-cover pointer-events-none"
            >
              <source
                src="/videos/cordova-drone.mp4"
                type="video/mp4"
                onError={() => setVideoFailed(true)}
              />
              Your browser does not support HTML5 video.
            </video>
          )}
        </div>

        {/* Background Overlays for Readability */}
        <div className="absolute inset-0 z-1 bg-[#292929]/40" />
        <div className="absolute inset-0 z-1 bg-gradient-to-b from-[#292929]/50 via-transparent to-[#292929]/80" />

        <div className="relative z-30">
          <Navbar />
        </div>

        {/* Hero Content */}
        <div className="relative z-20 mx-auto flex min-h-[550px] max-w-7xl flex-col items-center justify-center px-6 pb-16 pt-40 text-center text-white sm:min-h-[600px]">
          <span className="rounded-full bg-[#800020]/40 border border-[#F2DCDA]/50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-[#FFF0F2] backdrop-blur-md mb-6">
            Your Local Guide to Cordova, Cebu
          </span>

          <h1 className="mt-2 max-w-5xl font-display text-5xl font-semibold leading-[1.12] sm:text-6xl lg:text-7xl text-white">
            Discover the Beauty
            <br />
            of <span className="text-[#F2DCDA]">Cordova.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-white/90 sm:text-base">
            Explore breathtaking coastal destinations, scenic bridge views, and vibrant local tourism
            experiences around Cordova, Cebu.
          </p>

          <a
            href="#featured-destinations"
            className="group mt-9 inline-flex items-center gap-4 rounded-full bg-[#F2DCDA] px-9 py-4 text-sm font-bold text-[#58111A] shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-[#FFF0F2]"
          >
            Explore Destinations
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#800020] text-white transition-transform duration-300 group-hover:translate-x-1">
              <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
            </span>
          </a>
        </div>
      </section>

      {/* Popular Destinations Section */}
      <section id="featured-destinations" className="bg-[#FAF6F5] px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <span className="rounded-full bg-[#FFF0F2] px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-[#800020]">
              Top Rated Places
            </span>
            <h2 className="mt-3 font-display text-3xl font-semibold text-[#58111A] sm:text-4xl">
              Popular Destinations
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Four placeholders match the four featured cards below. */}
            {loading
              ? Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className="h-[380px] animate-pulse rounded-3xl border border-[#EBD5D3] bg-white/70"
                  />
                ))
              : destinations.slice(0, 4).map((destination) => (
                  <DestinationCard
                    key={destination.slug}
                    {...destination}
                  />
                ))}
          </div>
        </div>
      </section>

      {/* More to Explore Section */}
      <section id="more-to-explore" className="bg-[#FAF6F5] px-6 pb-24 pt-8 sm:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center text-center">
            <span className="rounded-full bg-[#FFF0F2] px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-[#800020]">
              Experience Cordova
            </span>

            <h2 className="mt-4 font-display text-3xl font-semibold text-[#58111A] sm:text-4xl">
              More to Explore, More to Experience
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#7A585B] sm:text-base">
              Discover the places, coastal views, and local experiences
              that make Cordova a premier destination worth visiting.
            </p>

            <Link
              to="/destinations"
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#800020] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#58111A] shadow-md"
            >
              View All Destinations
              <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default HomePage;
