import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Appointment, DailyTask, OwnerTask, Pet } from "../data/mock";
import { timeToMinutes, todayDDMM } from "../utils/schedule";
import { todayInputValue } from "../utils/petAge";
import { toast } from "../components/WonPetsAlert";
import { useAuth } from "./AuthContext";
import { errorMessage } from "../services/api";
import { petsService, PetInput, scheduleService, RawSchedule } from "../services/pets.service";
import { appointmentsService } from "../services/appointments.service";
import { to12h } from "../services/mappers";

export type ItemType = "daily" | "custom-task" | "schedule" | "medicine" | "appointment";
export type ScheduleItem = {
  id: string;
  petId: string;
  time: string;
  title: string;
  description: string;
  itemType: ItemType;
  status: "completed" | "upcoming";
  /** custom-task only: the recurring task this occurrence belongs to */
  taskId?: string;
  apptStatus?: string;
  /** medicine only: what the backend needs to mark a dose as given */
  prescriptionId?: string;
  medicineIndex?: number;
  rawTime?: string;
};
export type NewOwnerTask = {
  petId: string;
  title: string;
  description: string;
  time: string;
  startDate: string;
  endDate: string | null;
};
export type DailyTaskRow = DailyTask & { enabled: boolean };
/** What the Add / Edit pet screen sends. `imageUri` is only set when the photo was changed. */
export type PetPatch = Partial<Pick<Pet, "name" | "breed" | "gender" | "dob" | "animalType" | "isMissing" | "missingSince">> & {
  weight?: string;
  imageUri?: string;
};

type Ctx = {
  pets: Pet[];
  appointments: Appointment[];
  /** Every daily task template (union across pets). Use dailyTasksFor(petId) for one pet. */
  dailyTasks: DailyTask[];
  ownerTasks: OwnerTask[];
  loading: boolean;
  /** True once the first load (pets + appointments + schedule) has finished - screens show a skeleton until then. */
  loaded: boolean;
  refreshAll: () => Promise<void>;
  refreshAppointments: () => Promise<void>;
  refreshSchedule: () => Promise<void>;
  /** Silent re-fetch of pets + appointments + schedule (no spinner, no error toast) - used by live sync. */
  syncQuiet: () => Promise<void>;
  loadDailyTasks: (petId: string) => Promise<void>;
  dailyTasksFor: (petId: string) => DailyTaskRow[];
  addPet: (p: PetInput) => Promise<Pet | null>;
  updatePet: (id: string, patch: PetPatch) => Promise<boolean>;
  deletePet: (id: string) => Promise<boolean>;
  toggleFavorite: (id: string) => void;
  /** Insert / replace an appointment returned by the API (after booking). */
  upsertAppointment: (a: Appointment) => void;
  rescheduleAppointment: (id: string, patch: { isoDate: string; time: string }) => Promise<boolean>;
  cancelAppointment: (id: string) => Promise<boolean>;
  /** Today's merged schedule for one pet (daily plan + own tasks + one-offs + medicine + appointments). */
  scheduleFor: (petId: string) => ScheduleItem[];
  completeTask: (item: ScheduleItem) => void;
  isDailyEnabled: (petId: string, taskId: string) => boolean;
  setDailyEnabled: (petId: string, taskId: string, enabled: boolean) => void;
  createOwnerTask: (t: NewOwnerTask) => Promise<boolean>;
  updateOwnerTask: (id: string, patch: Partial<OwnerTask>) => Promise<boolean>;
  deleteOwnerTask: (id: string) => Promise<boolean>;
  createSchedule: (s: { petId: string; title: string; description: string; date: string; time: string }) => Promise<boolean>;
};

const PetsContext = createContext<Ctx>({} as Ctx);
export const usePets = () => useContext(PetsContext);

const label12 = (t?: string) => {
  const s = to12h(t || "");
  const m = /^(\d{1,2}):(\d{2})\s*([ap]m)$/i.exec(s);
  return m ? `${m[1].padStart(2, "0")}:${m[2]} ${m[3].toUpperCase()}` : s;
};
const idOf = (v: any) => String(v && typeof v === "object" ? v._id : v);

const mapOwnerTask = (t: any): OwnerTask => ({
  id: String(t._id),
  petId: idOf(t.petId),
  title: t.title,
  description: t.description || "",
  time: label12(t.time),
  startDate: t.startDate,
  endDate: t.endDate || null,
  status: t.status === "Paused" ? "Paused" : "Active",
});

function mapScheduleItem(s: RawSchedule): ScheduleItem {
  const petId = idOf(s.petId);
  const done = s.status === "completed";
  const base = { petId, time: label12(s.time), title: s.title, description: s.description || "", status: (done ? "completed" : "upcoming") as ScheduleItem["status"] };
  if (s.itemType === "daily-task") return { ...base, id: String(s.templateId || s._id), itemType: "daily" };
  if (s.itemType === "custom-task") return { ...base, id: String(s.taskId || s._id), taskId: String(s.taskId || s._id), itemType: "custom-task" };
  if (s.itemType === "medicine") return { ...base, id: String(s._id), itemType: "medicine", prescriptionId: String(s.prescriptionId), medicineIndex: s.medicineIndex, rawTime: s.time };
  return { ...base, id: String(s._id), itemType: "schedule" };
}

export function PetsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [ownerTasks, setOwnerTasks] = useState<OwnerTask[]>([]);
  const [today, setToday] = useState<ScheduleItem[]>([]);
  const [dailyByPet, setDailyByPet] = useState<Record<string, DailyTaskRow[]>>({});
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const loadedFor = useRef<string | null>(null);

  const refreshAppointments = useCallback(async () => {
    try {
      setAppointments(await appointmentsService.list());
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);
  const refreshSchedule = useCallback(async () => {
    try {
      const [sched, tasks] = await Promise.all([scheduleService.today(), scheduleService.ownerTasks()]);
      setToday(sched.map(mapScheduleItem));
      setOwnerTasks(tasks.map(mapOwnerTask));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);
  const refreshPets = useCallback(async () => {
    try {
      setPets(await petsService.list());
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  const syncQuiet = useCallback(async () => {
    const safe = <T,>(p: Promise<T>) => p.catch(() => null);
    const [pl, ap, sc, ot] = await Promise.all([safe(petsService.list()), safe(appointmentsService.list()), safe(scheduleService.today()), safe(scheduleService.ownerTasks())]);
    if (pl) setPets(pl);
    if (ap) setAppointments(ap);
    if (sc) setToday(sc.map(mapScheduleItem));
    if (ot) setOwnerTasks(ot.map(mapOwnerTask));
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([refreshPets(), refreshAppointments(), refreshSchedule()]);
    setLoading(false);
    setLoaded(true);
  }, [refreshPets, refreshAppointments, refreshSchedule]);

  // load after login, clear after logout
  useEffect(() => {
    if (!user) {
      loadedFor.current = null;
      setLoaded(false);
      setPets([]);
      setAppointments([]);
      setOwnerTasks([]);
      setToday([]);
      setDailyByPet({});
      return;
    }
    if (loadedFor.current === user.id) return;
    loadedFor.current = user.id;
    refreshAll();
  }, [user, refreshAll]);

  /* --------------------------------- pets --------------------------------- */
  const addPet: Ctx["addPet"] = async (p) => {
    try {
      const pet = await petsService.create(p);
      setPets((x) => [pet, ...x]);
      refreshSchedule(); // the new pet gets its daily tasks
      return pet;
    } catch (e) {
      toast.error(errorMessage(e, "Could not add the pet."));
      return null;
    }
  };

  const updatePet: Ctx["updatePet"] = async (id, patch) => {
    try {
      let updated: Pet;
      if ("isMissing" in patch) {
        const r = await petsService.toggleMissing(id);
        updated = { ...(pets.find((x) => x.id === id) as Pet), isMissing: r.isMissing, missingSince: r.missingSince || undefined };
      } else {
        updated = await petsService.update(id, {
          name: patch.name,
          animalType: patch.animalType,
          breed: patch.breed,
          gender: patch.gender === "Other" ? "others" : patch.gender,
          dob: patch.dob,
          weight: patch.weight?.replace(/[^\d.]/g, ""),
          imageUri: patch.imageUri,
        });
      }
      setPets((x) => x.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      return true;
    } catch (e) {
      toast.error(errorMessage(e, "Could not update the pet."));
      return false;
    }
  };

  const deletePet: Ctx["deletePet"] = async (id) => {
    try {
      await petsService.remove(id);
      setPets((x) => x.filter((p) => p.id !== id));
      setOwnerTasks((x) => x.filter((t) => t.petId !== id));
      setToday((x) => x.filter((t) => t.petId !== id));
      return true;
    } catch (e) {
      toast.error(errorMessage(e, "Could not delete the pet."));
      return false;
    }
  };

  const toggleFavorite = (id: string) => {
    setPets((x) => x.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p))); // optimistic
    petsService.toggleFavorite(id).then(
      (fav) => setPets((x) => x.map((p) => (p.id === id ? { ...p, favorite: fav } : p))),
      (e) => {
        setPets((x) => x.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)));
        toast.error(errorMessage(e));
      },
    );
  };

  /* ----------------------------- appointments ----------------------------- */
  const upsertAppointment = (a: Appointment) =>
    setAppointments((x) => (x.some((y) => y.id === a.id) ? x.map((y) => (y.id === a.id ? a : y)) : [a, ...x]));

  // the vet has to confirm the new time again (the backend sets the status back to Pending)
  const rescheduleAppointment: Ctx["rescheduleAppointment"] = async (id, { isoDate, time }) => {
    try {
      const updated = await appointmentsService.reschedule(id, isoDate, time);
      // the reschedule response is not populated - keep the pet / doctor details we already have
      setAppointments((x) => x.map((a) => (a.id === id ? { ...a, date: updated.date, isoDate: updated.isoDate, time: updated.time, time24: updated.time24, status: updated.status } : a)));
      return true;
    } catch (e) {
      toast.error(errorMessage(e, "Could not reschedule."));
      return false;
    }
  };

  const cancelAppointment: Ctx["cancelAppointment"] = async (id) => {
    try {
      await appointmentsService.cancel(id);
      setAppointments((x) => x.map((a) => (a.id === id ? { ...a, status: "Cancelled" } : a)));
      return true;
    } catch (e) {
      toast.error(errorMessage(e, "Could not cancel the appointment."));
      return false;
    }
  };

  /* ------------------------------- schedule ------------------------------- */
  const scheduleFor: Ctx["scheduleFor"] = (petId) => {
    const pet = pets.find((p) => p.id === petId);
    const appts: ScheduleItem[] = appointments
      .filter((a) => (a.petId ? a.petId === petId : pet && a.pet === pet.name) && a.date === todayDDMM() && a.status !== "Cancelled")
      .map((a) => ({
        id: a.id,
        petId,
        time: a.time,
        title: a.mode === "Clinic Visit" ? "Vet Appointment" : `${a.mode} Appointment`,
        description: `${a.mode}${a.doctor ? ` · ${a.doctor}` : ""}`,
        itemType: "appointment" as const,
        status: (a.status === "Completed" ? "completed" : "upcoming") as "completed" | "upcoming",
        apptStatus: a.status,
      }));
    return [...today.filter((t) => t.petId === petId), ...appts].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  };

  const completeTask: Ctx["completeTask"] = (item) => {
    if (item.itemType === "appointment") return;
    const mark = (status: ScheduleItem["status"]) =>
      setToday((x) => x.map((t) => (t.id === item.id && t.petId === item.petId && t.itemType === item.itemType && t.time === item.time ? { ...t, status } : t)));
    mark("completed"); // optimistic
    const call =
      item.itemType === "daily"
        ? scheduleService.completeDaily(item.id, item.petId)
        : item.itemType === "custom-task"
          ? scheduleService.completeOwnerTask(item.taskId || item.id, item.petId)
          : item.itemType === "medicine"
            ? scheduleService.completeMedicine(item.prescriptionId!, item.medicineIndex!, item.petId, item.rawTime || item.time)
            : scheduleService.completeOneOff(item.id);
    call.catch((e) => {
      mark("upcoming");
      toast.error(errorMessage(e, "Could not mark the task as completed."));
    });
  };

  /* ----------------------- daily tasks (set by WonPet) --------------------- */
  const loadDailyTasks: Ctx["loadDailyTasks"] = async (petId) => {
    try {
      const rows = await scheduleService.dailyTasks(petId);
      setDailyByPet((m) => ({ ...m, [petId]: rows.map((r) => ({ id: String(r._id), title: r.title, description: r.description, time: label12(r.time), enabled: r.enabled })) }));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const dailyTasksFor: Ctx["dailyTasksFor"] = (petId) => dailyByPet[petId] || [];
  const dailyTasks: DailyTask[] = Object.values(dailyByPet)
    .flat()
    .filter((t, i, all) => all.findIndex((x) => x.id === t.id) === i);

  const isDailyEnabled: Ctx["isDailyEnabled"] = (petId, taskId) => dailyByPet[petId]?.find((t) => t.id === taskId)?.enabled ?? true;
  const setDailyEnabled: Ctx["setDailyEnabled"] = (petId, taskId, enabled) => {
    const patch = (on: boolean) => setDailyByPet((m) => ({ ...m, [petId]: (m[petId] || []).map((t) => (t.id === taskId ? { ...t, enabled: on } : t)) }));
    patch(enabled);
    scheduleService.setDailyEnabled(taskId, petId, enabled).then(refreshSchedule, (e) => {
      patch(!enabled);
      toast.error(errorMessage(e));
    });
  };

  /* ---------------------------- the owner's own tasks ---------------------- */
  const createOwnerTask: Ctx["createOwnerTask"] = async (t) => {
    try {
      await scheduleService.createOwnerTask(t);
      await refreshSchedule();
      return true;
    } catch (e) {
      toast.error(errorMessage(e, "Could not create the task."));
      return false;
    }
  };
  const updateOwnerTask: Ctx["updateOwnerTask"] = async (id, patch) => {
    try {
      await scheduleService.updateOwnerTask(id, patch);
      await refreshSchedule();
      return true;
    } catch (e) {
      toast.error(errorMessage(e, "Could not update the task."));
      return false;
    }
  };
  const deleteOwnerTask: Ctx["deleteOwnerTask"] = async (id) => {
    try {
      await scheduleService.deleteOwnerTask(id);
      setOwnerTasks((x) => x.filter((t) => t.id !== id));
      setToday((x) => x.filter((t) => t.taskId !== id));
      return true;
    } catch (e) {
      toast.error(errorMessage(e, "Could not delete the task."));
      return false;
    }
  };
  const createSchedule: Ctx["createSchedule"] = async (s) => {
    try {
      await scheduleService.createOneOff(s);
      if (s.date === todayInputValue()) await refreshSchedule();
      return true;
    } catch (e) {
      toast.error(errorMessage(e, "Could not create the schedule."));
      return false;
    }
  };

  return (
    <PetsContext.Provider
      value={{
        pets, appointments, dailyTasks, ownerTasks, loading, loaded,
        refreshAll, refreshAppointments, refreshSchedule, syncQuiet, loadDailyTasks, dailyTasksFor,
        addPet, updatePet, deletePet, toggleFavorite,
        upsertAppointment, rescheduleAppointment, cancelAppointment,
        scheduleFor, completeTask, isDailyEnabled, setDailyEnabled,
        createOwnerTask, updateOwnerTask, deleteOwnerTask, createSchedule,
      }}
    >
      {children}
    </PetsContext.Provider>
  );
}
