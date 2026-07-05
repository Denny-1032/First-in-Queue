"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Booking, BookingStatus, BookingType } from "@/types";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  Bell,
  Loader2,
  CalendarX,
} from "lucide-react";

const STATUS_FILTERS: Array<{ value: BookingStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
  no_show: "bg-red-50 text-red-700 border-red-200",
  rescheduled: "bg-purple-50 text-purple-700 border-purple-200",
};

const BOOKING_TYPES: BookingType[] = [
  "appointment",
  "reservation",
  "viewing",
  "consultation",
  "tour",
  "callback",
  "service",
  "custom",
];

const EMPTY_FORM = {
  customer_phone: "",
  customer_name: "",
  booking_type: "appointment" as BookingType,
  scheduled_date: "",
  scheduled_time: "",
  duration_minutes: "",
  location: "",
  notes: "",
};

function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00`);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BookingsPage() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchBookings = useCallback(async () => {
    try {
      const params = statusFilter === "all" ? "" : `?status=${statusFilter}`;
      const res = await fetch(`/api/bookings${params}`);
      if (res.ok) setBookings(await res.json());
    } catch {
      /* keep existing list */
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const today = new Date().toISOString().split("T")[0];
  const stats = {
    today: bookings.filter((b) => b.scheduled_date === today && !["cancelled", "no_show"].includes(b.status)).length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    total: bookings.length,
  };

  const updateStatus = async (booking: Booking, status: BookingStatus) => {
    setUpdatingId(booking.id);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast(`Booking ${status.replace("_", " ")}`, "success");
        await fetchBookings();
      } else {
        toast("Failed to update booking", "error");
      }
    } catch {
      toast("Failed to update booking", "error");
    }
    setUpdatingId(null);
  };

  const createBooking = async () => {
    if (!form.customer_phone.trim() || !form.scheduled_date) {
      toast("Customer phone and date are required", "warning");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_phone: form.customer_phone.trim(),
          customer_name: form.customer_name.trim() || undefined,
          booking_type: form.booking_type,
          scheduled_date: form.scheduled_date,
          scheduled_time: form.scheduled_time || undefined,
          duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : undefined,
          location: form.location.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast("Booking created", "success");
        setForm(EMPTY_FORM);
        setShowCreate(false);
        await fetchBookings();
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to create booking", "error");
      }
    } catch {
      toast("Failed to create booking", "error");
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 mt-1 text-sm">Appointments and reservations collected by your AI assistant</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          New Booking
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{loading ? "—" : stats.today}</p>
            <p className="text-xs text-gray-500">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{loading ? "—" : stats.pending}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{loading ? "—" : stats.confirmed}</p>
            <p className="text-xs text-gray-500">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{loading ? "—" : stats.total}</p>
            <p className="text-xs text-gray-500">Total Shown</p>
          </CardContent>
        </Card>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setLoading(true); setStatusFilter(f.value); }}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
              statusFilter === f.value
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "bg-white border-gray-200 text-gray-600 hover:border-emerald-300"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Booking list */}
      {loading ? (
        <Card>
          <CardContent className="p-10 flex items-center justify-center text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </CardContent>
        </Card>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <CalendarX className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">No bookings{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}</p>
            <p className="text-xs text-gray-500 mt-1">
              Bookings made through your WhatsApp assistant will show up here, or create one manually.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">
                        {booking.customer_name || booking.customer_phone}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 capitalize">
                        {booking.booking_type}
                      </span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize", STATUS_STYLES[booking.status])}>
                        {booking.status.replace("_", " ")}
                      </span>
                      {booking.reminder_sent && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Bell className="h-3 w-3" /> Reminded
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> {formatDate(booking.scheduled_date)}
                      </span>
                      {booking.scheduled_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {booking.scheduled_time}
                          {booking.duration_minutes ? ` (${booking.duration_minutes} min)` : ""}
                        </span>
                      )}
                      {booking.customer_name && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {booking.customer_phone}
                        </span>
                      )}
                      {booking.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {booking.location}
                        </span>
                      )}
                    </div>
                    {booking.notes && <p className="text-xs text-gray-400 truncate">{booking.notes}</p>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {updatingId === booking.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : (
                      <>
                        {booking.status === "pending" && (
                          <Button size="sm" onClick={() => updateStatus(booking, "confirmed")} className="gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                          </Button>
                        )}
                        {booking.status === "confirmed" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => updateStatus(booking, "completed")} className="gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateStatus(booking, "no_show")} className="gap-1.5 text-red-600 hover:text-red-700">
                              No-show
                            </Button>
                          </>
                        )}
                        {["pending", "confirmed"].includes(booking.status) && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(booking, "cancelled")} className="gap-1.5 text-gray-500 hover:text-red-600">
                            <XCircle className="h-3.5 w-3.5" /> Cancel
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create booking modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => !creating && setShowCreate(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">New Booking</h2>
              <button onClick={() => !creating && setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-medium text-gray-600">Customer phone *</label>
                  <input
                    type="tel"
                    value={form.customer_phone}
                    onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                    placeholder="260971234567"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-medium text-gray-600">Customer name</label>
                  <input
                    type="text"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    placeholder="Jane Banda"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Type</label>
                  <select
                    value={form.booking_type}
                    onChange={(e) => setForm({ ...form, booking_type: e.target.value as BookingType })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm capitalize focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {BOOKING_TYPES.map((t) => (
                      <option key={t} value={t} className="capitalize">{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Duration (min)</label>
                  <input
                    type="number"
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                    placeholder="30"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Date *</label>
                  <input
                    type="date"
                    value={form.scheduled_date}
                    onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Time</label>
                  <input
                    type="time"
                    value={form.scheduled_time}
                    onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Main branch, Cairo Road"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    placeholder="Anything the team should know"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button onClick={createBooking} disabled={creating} className="gap-2">
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Booking
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
