import React, { useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import { Button, Card, SectionHeader, T, cn } from "../../components/ui";
import PetHeroBanner from "../../components/dashboard/PetHeroBanner";
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

import { DashboardSkeleton } from "../../components/Skeletons";
// const quick = [
//   {
//     label: "Book Appointment",
//     icon: "calendar-outline",
//     box: "bg-orange-200",
//     fg: colors.primaryDark,
//     text: "text-primary-dark",
//     go: "BookAppointment",
//   },
//   {
//     label: "Buy Products",
//     icon: "bag-handle-outline",
//     box: "bg-purple-soft",
//     fg: colors.purple,
//     text: "text-purple",
//     go: "Store",
//   },
//   {
//     label: "Resell Items",
//     icon: "pricetag-outline",
//     box: "bg-pink-soft",
//     fg: colors.pink,
//     text: "text-pink",
//     go: "Resell",
//   },
//   {
//     label: "Chat with Vet",
//     icon: "chatbubble-outline",
//     box: "bg-green-soft",
//     fg: colors.green,
//     text: "text-green",
//     go: "Chat",
//   },
// ] as const;

const orderCounts = (orders: { status: string }[]) => ({
  Pending: orders.filter((o) => o.status === "Pending").length,
  // shipped orders are still "in progress" on the dashboard
  Processing: orders.filter((o) => o.status === "Processing" || o.status === "Shipped").length,
  Delivered: orders.filter((o) => o.status === "Delivered").length,
  Cancelled: orders.filter((o) => o.status === "Cancelled").length,
});

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
      contentContainerClassName="p-4 gap-[18px] pb-10"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => Promise.all([refreshAll(), refreshOrders()])} tintColor={colors.primary} />}
    >
      <PetHeroBanner
        userName={user?.name}
        pets={pets}
        daysWithApp={
          user?.createdAt ? Math.max(1, Math.ceil((Date.now() - new Date(user.createdAt).getTime()) / 86400000)) : 1
        }
      />

      {/* Quick actions */}
      {/* <Card className="border-amber-200">
        <SectionHeader
          title="Quick Actions"
          icon={
            <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center">
              <Ionicons name="paw" size={18} color={colors.primary} />
            </View>
          }
        />
        <View className="flex-row flex-wrap gap-3">
          {quick.map((q) => (
            <Pressable
              key={q.label}
              className={cn(
                "w-[47.5%] rounded-2xl p-4 items-center gap-2 active:opacity-80",
                q.box,
              )}
              onPress={() => navigation.navigate(q.go)}
            >
              <View className="w-11 h-11 rounded-[14px] bg-white items-center justify-center">
                <Ionicons name={q.icon} size={22} color={q.fg} />
              </View>
              <Text className={cn("font-bold text-[13px] text-center", q.text)}>
                {q.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => toast.info("Support is coming soon.")}
          className="flex-row items-center justify-between mt-4 pt-3.5 border-t border-line"
        >
          <Text className="text-muted font-medium text-sm">Need help?</Text>
          <Text className="text-primary font-bold text-sm">
            Contact Support
          </Text>
        </Pressable>
      </Card> */}
            {/* Quick actions */}
      <QuickActions onGo={(screen) => navigation.navigate(screen)} onSupport={() => navigation.navigate("Settings", { open: "support", at: Date.now() })} />

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

            {/* Animal fact */}
      <AnimalFactCard
        facts={facts}
        index={fact}
        onNext={() => setFact((fact + 1) % facts.length)}
      />
    </ScrollView>
  );
}
