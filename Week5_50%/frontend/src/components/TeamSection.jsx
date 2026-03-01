import { useState } from "react";
import {
  Search,
  MapPin,
  Star,
  Clock,
  Phone,
  ArrowRight,
  Filter,
  UserRound,
} from "lucide-react";

/* ─── doctor data ─── */
const doctors = [
  {
    name: "Dr. Sarah Mitchell",
    role: "Neurologist",
    specialty: "neurology",
    location: "New York, NY",
    rating: 4.9,
    reviews: 127,
    available: true,
    nextSlot: "Today, 3:00 PM",
    experience: "15+ yrs",
  },
  {
    name: "Dr. James Okoro",
    role: "Geriatric Psychiatrist",
    specialty: "psychiatry",
    location: "Chicago, IL",
    rating: 4.8,
    reviews: 98,
    available: true,
    nextSlot: "Tomorrow, 10:00 AM",
    experience: "12+ yrs",
  },
  {
    name: "Dr. Priya Sharma",
    role: "Clinical Psychologist",
    specialty: "psychology",
    location: "San Francisco, CA",
    rating: 4.7,
    reviews: 84,
    available: false,
    nextSlot: "Mar 5, 9:00 AM",
    experience: "10+ yrs",
  },
  {
    name: "Dr. Emily Chen",
    role: "Neurologist",
    specialty: "neurology",
    location: "Boston, MA",
    rating: 4.9,
    reviews: 203,
    available: true,
    nextSlot: "Today, 5:30 PM",
    experience: "20+ yrs",
  },
  {
    name: "Dr. Michael Torres",
    role: "Geriatrician",
    specialty: "geriatrics",
    location: "Los Angeles, CA",
    rating: 4.6,
    reviews: 61,
    available: true,
    nextSlot: "Tomorrow, 2:00 PM",
    experience: "8+ yrs",
  },
  {
    name: "Dr. Aisha Patel",
    role: "Cognitive Behavioral Therapist",
    specialty: "psychology",
    location: "Houston, TX",
    rating: 4.8,
    reviews: 112,
    available: false,
    nextSlot: "Mar 6, 11:00 AM",
    experience: "14+ yrs",
  },
];

const specialties = [
  { label: "All", value: "all" },
  { label: "Neurology", value: "neurology" },
  { label: "Psychiatry", value: "psychiatry" },
  { label: "Psychology", value: "psychology" },
  { label: "Geriatrics", value: "geriatrics" },
];

/* ─── component ─── */
export default function TeamSection() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = doctors.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.role.toLowerCase().includes(search.toLowerCase()) ||
      d.location.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      activeFilter === "all" || d.specialty === activeFilter;
    return matchesSearch && matchesFilter;
  });

  /* avatar colour from name */
  const avatarColor = (name) => {
    const colors = [
      "bg-green-primary",
      "bg-emerald-600",
      "bg-teal-600",
      "bg-cyan-700",
      "bg-green-dark",
      "bg-green-accent",
    ];
    let hash = 0;
    for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <section id="specialists" className="py-16 md:py-24 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Find Your{" "}
            <span className="font-serif italic text-green-primary">
              Specialist
            </span>
          </h2>
          <p className="mt-4 text-gray-600 leading-relaxed">
            Connect with certified professionals who specialise in cognitive
            health, dementia care, and neurological wellness.
          </p>
        </div>

        {/* ── Search & Filters ── */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* search bar */}
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, role, or location…"
              className="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-green-primary"
            />
          </div>

          {/* specialty pills */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400 mr-1 hidden sm:block" />
            {specialties.map((s) => (
              <button
                key={s.value}
                onClick={() => setActiveFilter(s.value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  activeFilter === s.value
                    ? "bg-green-primary text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-green-primary hover:text-green-primary"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Doctor Cards ── */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500">
              No doctors found matching your criteria.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((doc) => (
              <div
                key={doc.name}
                className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white p-6 transition-shadow hover:shadow-xl"
              >
                {/* availability badge */}
                <span
                  className={`absolute top-4 right-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    doc.available
                      ? "bg-green-light text-green-primary"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      doc.available ? "bg-green-primary" : "bg-gray-400"
                    }`}
                  />
                  {doc.available ? "Available" : "Unavailable"}
                </span>

                {/* avatar + info */}
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${avatarColor(doc.name)} text-white`}
                  >
                    <UserRound className="h-7 w-7" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 text-base truncate">
                      {doc.name}
                    </h3>
                    <p className="text-green-primary text-sm font-medium">
                      {doc.role}
                    </p>
                  </div>
                </div>

                {/* meta chips */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-cream px-2.5 py-1.5 text-xs text-gray-600">
                    <MapPin className="h-3 w-3" />
                    {doc.location}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-cream px-2.5 py-1.5 text-xs text-gray-600">
                    <Star className="h-3 w-3 text-amber-500" />
                    {doc.rating}{" "}
                    <span className="text-gray-400">({doc.reviews})</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-cream px-2.5 py-1.5 text-xs text-gray-600">
                    {doc.experience}
                  </span>
                </div>

                {/* next slot */}
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Next available:{" "}
                    <span className="font-semibold text-gray-700">
                      {doc.nextSlot}
                    </span>
                  </span>
                </div>

                {/* separator */}
                <hr className="my-5 border-gray-100" />

                {/* actions */}
                <div className="flex items-center gap-3 mt-auto">
                  <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-green-primary px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-green-dark">
                    Book Appointment
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-colors hover:border-green-primary hover:text-green-primary">
                    <Phone className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── footer CTA ── */}
        <div className="mt-12 text-center">
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-full border-2 border-green-primary px-6 py-3 text-sm font-semibold text-green-primary transition-colors hover:bg-green-primary hover:text-white"
          >
            View All Doctors
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
