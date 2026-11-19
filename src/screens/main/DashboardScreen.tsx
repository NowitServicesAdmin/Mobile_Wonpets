import React, { useMemo, useState } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { colors } from "../../theme";
import PetHeroBanner, { ApptStats } from "../../components/dashboard/PetHeroBanner";
// import NextAppointmentCard from "../../components/dashboard/NextAppointmentCard";
import PlanEndedBanner from "../../components/settings/PlanEndedBanner";
import QuickActions from "../../components/dashboard/QuickActions";
import MyPetsSection from "../../components/dashboard/MyPetsSection";
import TodaysSchedule from "../../components/dashboard/TodaysSchedule";
import PetHealthOverview from "../../components/dashboard/PetHealthOverview";
import OrdersOverview from "../../components/dashboard/OrdersOverview";
import AnimalFactCard from "../../components/dashboard/AnimalFactCard";
import { WonPetsAlert, toast } from "../../components/WonPetsAlert";
import { facts } from "../../data/mock";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { ScheduleItem, usePets } from "../../context/PetsContext";
import type { Appointment } from "../../data/mock";

import { DashboardSkeleton } from "../../components/Skeletons";

const orderCounts = (orders: { status: string }[]) => ({
  Pending: orders.filter((o) => o.status === "Pending").length,
  // shipped orders are still "in progress" on the dashboard
  Processing: orders.filter((o) => o.status === "Processing" || o.status === "Shipped").length,
  Delivered: orders.filter((o) => o.status === "Delivered").length,
  Cancelled: orders.filter((o) => o.status === "Cancelled").length,
});

const isCancelled = (st: string) => /cancel|reject|declin/i.test(st);

/** Counts for the hero tiles - same buckets as the web dashboard. */
const apptStats = (list: Appointment[]): ApptStats => {
  const r = { upcoming: 0, inProgress: 0, completed: 0, cancelled: 0 };
  list.forEach((a) => {
    const st = (a.status || "").toLowerCase();
    if (isCancelled(st)) r.cancelled++;
    else if (st === "completed") r.completed++;
    else if (st.replace(/[\s_-]/g, "") === "inprogress" || st === "ongoing") r.inProgress++;
    else r.upcoming++;
  });
  return r;
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Soonest appointment from today onward that is not cancelled / completed. */
const pickNext = (list: Appointment[]): Appointment | null => {
  const today = todayIso();
  return (
    list
      .filter((a) => a.isoDate && a.isoDate.slice(0, 10) >= today && !isCancelled(a.status || "") && a.status !== "Completed")
      .sort((a, b) => (a.isoDate!.slice(0, 10)).localeCompare(b.isoDate!.slice(0, 10)) || String(a.time24 || "").localeCompare(String(b.time24 || "")))[0] || null
  );
};

export default function DashboardScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { orders, refreshOrders } = useCart();
  const {
    pets,
    appointments,
    toggleFavorite,
    deletePet,
    scheduleFor,
    completeTask,
    refreshAll,
    loading,
    loaded,
    updateOwnerTask,
    deleteOwnerTask,
  } = usePets();
  const [fact, setFact] = useState(0);
  const stats = useMemo(() => apptStats(appointments), [appointments]);
  const nextAppointment = useMemo(() => pickNext(appointments), [appointments]);

  const openPet = (id: string) => navigation.navigate("PetProfile", { id });

  const handleDeletePet = async (pet: { id: string; name: string }) => {
    const res = await WonPetsAlert.delete(
      `Delete ${pet.name}?`,
      `${pet.name}'s profile will be removed and its QR code will stop working. Past appointments and medical records are kept for your vets.`,
      { confirmText: "Yes, delete" },
    );
    if (!res.isConfirmed) return;
    if (await deletePet(pet.id)) toast.success(`${pet.name} was deleted`);
  };

  const handleDeleteTask = async (task: ScheduleItem) => {
    const res = await WonPetsAlert.delete(
      "Delete task?",
      `"${task.title}" will be removed as a recurring task for this pet.`,
      { confirmText: "Yes, delete" },
    );
    if (!res.isConfirmed || !task.taskId) return;
    if (await deleteOwnerTask(task.taskId)) toast.success("Task deleted");
  };

  const handlePauseTask = (task: ScheduleItem) => {
    if (!task.taskId) return;
    updateOwnerTask(task.taskId, { status: "Paused" }).then((ok) => ok && toast.success("Task paused"));
  };

  const handleComplete = (task: ScheduleItem) => {
    completeTask(task);
    toast.success("Task marked as completed!");
  };

  if (!loaded) return <DashboardSkeleton />;

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerClassName="p-3.5 gap-3 pb-8"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={async () => { await Promise.all([refreshAll(), refreshOrders()]); }} tintColor={colors.primary} />}
    >
      <PlanEndedBanner onRenew={() => navigation.navigate('Settings', { open: 'subscription', at: Date.now() })} />

      <PetHeroBanner userName={user?.name} pets={pets} stats={stats} />

      {/* main shortcuts sit right under the hero so they are visible without scrolling */}
      <QuickActions
        onGo={(screen) => navigation.navigate(screen)}
        onSupport={() => navigation.navigate("Settings", { open: "support", at: Date.now() })}
      />

      <MyPetsSection
        pets={pets}
        onOpen={(p) => openPet(p.id)}
        onEdit={(p) => navigation.navigate("AddPet", { id: p.id })}
        onDelete={handleDeletePet}
        onFavorite={(p) => {
          toggleFavorite(p.id);
          toast.success("Favorite updated.");
        }}
        onAdd={() => navigation.navigate("AddPet")}
      />

      <TodaysSchedule
        pets={pets}
        scheduleFor={scheduleFor}
        completeTask={handleComplete}
        onDeleteTask={handleDeleteTask}
        onPauseTask={handlePauseTask}
        onAddSchedule={() => navigation.navigate("ManageTasks")}
        onOpenPet={(p) => openPet(p.id)}
        initialPetId={route?.params?.petId}
      />

      {/* <NextAppointmentCard
        appointment={nextAppointment}
        onOpen={() => navigation.navigate("Appointments")}
        onBook={() => navigation.navigate("BookAppointment")}
      /> */}

      <PetHealthOverview
        pets={pets}
        appointments={appointments}
        onOpenPet={(p) => openPet(p.id)}
      />

      <OrdersOverview
        counts={orderCounts(orders)}
        onOpen={(filter) =>
          navigation.navigate("Orders", filter ? { filter } : undefined)
        }
      />

      <AnimalFactCard
        facts={facts}
        index={fact}
        onNext={() => setFact((fact + 1) % facts.length)}
      />
    </ScrollView>
  );
}