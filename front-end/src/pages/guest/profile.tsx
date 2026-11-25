import { Link } from "react-router";
import { ChevronRight, Heart, Info, MapPinned } from "lucide-react";
import Navbar from "@/components/common/navbar";

function ProfilePage() {
  const username = localStorage.getItem("asc_user_name") || "Cordova Explorer";
  const userEmail = localStorage.getItem("asc_user_email") || "explorer@asasa-cordova.ph";
  const joinedDate = "November 2026";
  const role = "Registered Tourist / Explorer";

  return (
    <main className="min-h-screen bg-[#FAF6F5] pb-24">
      <Navbar />

      <div className="mx-auto max-w-4xl px-6 pt-36 sm:px-10">
        {/* Profile Header Card */}
        <div className="rounded-3xl border border-[#EBD5D3] bg-white p-8 shadow-xl sm:p-10">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#F2DCDA] text-3xl font-bold text-[#58111A] shadow-inner">
              {username.charAt(0)}
            </div>

            <div className="text-center sm:text-left flex-1">
              <span className="rounded-full bg-[#FFF0F2] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#800020]">
                {role}
              </span>
              <h1 className="mt-3 font-display text-3xl font-semibold text-[#58111A]">
                {username}
              </h1>
              <p className="mt-1 text-sm text-[#7A585B]">{userEmail}</p>
              <p className="mt-2 text-xs text-[#7A585B]">
                Member since {joinedDate} • Municipality of Cordova, Cebu
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-[#EBD5D3] pt-8">
            <Link
              to="/favorites"
              className="flex items-center justify-between rounded-2xl border border-[#EBD5D3] bg-[#FAF6F5] p-5 transition hover:border-[#800020] hover:bg-[#FFF0F2]"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF0F2] text-[#800020]">
                  <Heart size={18} strokeWidth={2} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-[#58111A]">My Favorites</h2>
                  <p className="text-xs text-[#7A585B]">View your saved destinations</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" className="text-[#800020]" />
            </Link>

            <Link
              to="/visited"
              className="flex items-center justify-between rounded-2xl border border-[#EBD5D3] bg-[#FAF6F5] p-5 transition hover:border-[#800020] hover:bg-[#FFF0F2]"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF0F2] text-[#800020]">
                  <MapPinned size={18} strokeWidth={2} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-[#58111A]">Visited Spots</h2>
                  <p className="text-xs text-[#7A585B]">View destinations you explored</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" className="text-[#800020]" />
            </Link>

            <Link
              to="/about"
              className="flex items-center justify-between rounded-2xl border border-[#EBD5D3] bg-[#FAF6F5] p-5 transition hover:border-[#800020] hover:bg-[#FFF0F2] sm:col-span-2"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF0F2] text-[#800020]">
                  <Info size={18} strokeWidth={2} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-[#58111A]">About Asa sa Cordova</h2>
                  <p className="text-xs text-[#7A585B]">Read about the platform and its contact details</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" className="text-[#800020]" />
            </Link>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("asc_token");
                localStorage.removeItem("asc_user_email");
                localStorage.removeItem("asc_user_name");
                window.location.href = "/login";
              }}
              className="rounded-full bg-[#800020] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#58111A]"
            >
              Log Out of Account
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default ProfilePage;