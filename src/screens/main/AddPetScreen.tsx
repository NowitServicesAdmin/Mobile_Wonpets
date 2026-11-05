import React, { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../../theme";
import { Button, cn } from "../../components/ui";
import { Avatar } from "../../components/Avatar";
import CustomDropdown from "../../components/CustomDropdown";
import DateFields from "../../components/DateFields";
import { toast } from "../../components/WonPetsAlert";
import { animalTypes, breedsByType, speciesEmoji } from "../../data/animals";
import { petsService } from "../../services/pets.service";
import { usePets } from "../../context/PetsContext";
import { formatAgeFromDob, getPetAgeLabel, todayInputValue } from "../../utils/petAge";

type IconName = keyof typeof Ionicons.glyphMap;

/** White card with a small icon + title. */
function Section({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <View className="bg-white rounded-3xl border border-orange-100 p-4 gap-4">
      <View className="flex-row items-center gap-2.5">
        <View className="w-8 h-8 rounded-xl bg-primary-soft items-center justify-center"><Ionicons name={icon} size={17} color={colors.primary} /></View>
        <Text className="text-[16px] font-extrabold text-ink">{title}</Text>
      </View>
      {children}
    </View>
  );
}

/** Label with a red * and an optional error line under the control. */
function Labeled({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="font-bold text-ink mb-1.5">{label} <Text className="text-red">*</Text></Text>
      {children}
      {!!error && <Text className="text-xs text-red mt-1">{error}</Text>}
    </View>
  );
}

/** Add New Pet - and edit mode when opened with { id } (the pencil on a pet card). */
export default function AddPetScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { pets, addPet, updatePet } = usePets();
  const editing = pets.find((p) => p.id === route?.params?.id);

  const [name, setName] = useState(editing?.name ?? "");
  const [dob, setDob] = useState(editing?.dob ?? "");
  const [gender, setGender] = useState<"Male" | "Female" | "">((editing?.gender as any) ?? "");
  const [animalType, setAnimalType] = useState(editing?.animalType ?? "");
  const [breed, setBreed] = useState(editing?.breed ?? "");
  const [weight, setWeight] = useState(editing ? editing.weight.replace(/[^\d.]/g, "") : "");
  const [image, setImage] = useState<string | undefined>(editing?.image);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false); // shows the red "required" hints after the first Add / Save tap
  const [apiBreeds, setApiBreeds] = useState<string[]>([]);
  const [customBreeds, setCustomBreeds] = useState<Record<string, string[]>>({});

  useEffect(() => {
    navigation.setOptions({ title: editing ? `Edit ${editing.name}` : "Add New Pet" });
  }, [editing, navigation]);

  // breeds the server already knows (incl. ones other users added) are merged with the built-in list
  useEffect(() => {
    if (!animalType) { setApiBreeds([]); return; }
    let live = true;
    petsService.breeds(animalType).then((b) => live && setApiBreeds(b), () => live && setApiBreeds([]));
    return () => { live = false; };
  }, [animalType]);

  const breedOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    const add = (b: string) => { const k = b.trim().toLowerCase(); if (k && !seen.has(k)) { seen.add(k); list.push(b.trim()); } };
    (breedsByType[animalType] ?? []).forEach(add);
    apiBreeds.forEach(add);
    (customBreeds[animalType] ?? []).forEach(add);
    if (breed) add(breed);
    return list.map((b) => ({ label: b, value: b }));
  }, [animalType, customBreeds, breed, apiBreeds]);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!res.canceled) setImage(res.assets[0].uri);
  };

  const err = {
    name: tried && !name.trim() ? "Please enter your pet's name." : "",
    dob: tried && !dob ? "Please enter a valid date of birth." : "",
    gender: tried && !gender ? "Please choose a gender." : "",
    animal: tried && !animalType ? "Please choose an animal." : "",
    breed: tried && animalType && !breed ? "Please choose a breed." : "",
    weight: tried && !(Number(weight) > 0) ? "Please enter a valid weight." : "",
  };

  const save = () => {
    setTried(true);
    if (!name.trim() || !dob || !gender || !animalType || !breed || !weight) { toast.error("Please fill all required fields."); return; }
    if (dob > todayInputValue()) { toast.error("Date of birth can't be in the future."); return; }
    const w = Number(weight);
    if (!w || w <= 0) { toast.error("Enter a valid weight."); return; }
    if (saving) return;
    setSaving(true);
    // only upload the photo when a new one was picked (a remote url means it is unchanged)
    const imageUri = image && !/^https?:/i.test(image) ? image : undefined;
    const data = { name: name.trim(), breed, gender, dob, animalType, weight: String(w) };
    (async () => {
      const ok = editing ? await updatePet(editing.id, { ...data, imageUri }) : !!(await addPet({ ...data, imageUri }));
      setSaving(false);
      if (!ok) return; // the context already showed the error
      toast.success(editing ? "Pet updated successfully!" : "Pet added successfully!");
      navigation.goBack();
    })();
  };

  const emoji = speciesEmoji[animalType] ?? "🐾";
  const boxBase = "border-[1.5px] rounded-2xl bg-white";

  return (
    <View className="flex-1 bg-cream">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerClassName="p-4 gap-3.5 pb-6" keyboardShouldPersistTaps="handled">
          {/* hero: photo + live preview of who you are adding */}
          <View className="items-center bg-white rounded-3xl border border-orange-100 pt-5 pb-4 px-4 gap-1">
            <Pressable onPress={pickImage} accessibilityRole="button" accessibilityLabel="Choose pet photo">
              <View className="rounded-full p-0.5 bg-orange-300">
                <View className="rounded-full bg-white p-0.5"><Avatar image={image} emoji={emoji} size={104} /></View>
              </View>
              <View className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary items-center justify-center border-[3px] border-white"><Ionicons name="camera" size={16} color="#fff" /></View>
            </Pressable>
            <Text numberOfLines={1} className="text-[19px] font-black text-ink mt-2">{name.trim() || (editing ? "Your pet" : "Your new pet")}</Text>
            <Text numberOfLines={1} className="text-[13px] text-muted">{[animalType, breed].filter(Boolean).join(" · ") || "Tell us about your pet"}</Text>
            <Text className="text-[12px] text-primary font-semibold mt-1">{image ? "Tap the photo to change it" : "Tap to add a photo"}</Text>
          </View>

          {/* basics */}
          <Section icon="paw-outline" title="Basic info">
            <Labeled label="Pet Name" error={err.name}>
              <TextInput
                value={name} onChangeText={setName} placeholder="Enter pet name" placeholderTextColor={colors.muted} maxLength={40}
                className={cn(boxBase, "px-4 py-3.5 text-[15px] text-ink", err.name ? "border-red" : "border-line")}
              />
            </Labeled>
            <View>
              <Text className="font-bold text-ink mb-1.5">Date of Birth <Text className="text-red">*</Text></Text>
              <DateFields value={dob} onChange={setDob} max={todayInputValue()} />
              {!!dob && !!formatAgeFromDob(dob) && (
                <View className="self-start flex-row items-center gap-1.5 mt-2 bg-primary-soft rounded-full px-3 py-1">
                  <Ionicons name="gift-outline" size={13} color={colors.primaryDark} />
                  <Text className="text-[12px] font-bold text-primary-dark">Age: {getPetAgeLabel({ dob })}</Text>
                </View>
              )}
              {!!err.dob && <Text className="text-xs text-red mt-1">{err.dob}</Text>}
            </View>
            <Labeled label="Gender" error={err.gender}>
              <View className="flex-row gap-3">
                {(["Male", "Female"] as const).map((g) => {
                  const on = gender === g;
                  return (
                    <Pressable key={g} onPress={() => setGender(g)} accessibilityRole="button" accessibilityState={{ selected: on }} className={cn("flex-1 flex-row items-center justify-center gap-2 h-[50px] rounded-2xl border-[1.5px]", on ? "border-primary bg-primary-soft" : err.gender ? "border-red bg-white" : "border-line bg-white")}>
                      <Ionicons name={g === "Male" ? "male" : "female"} size={19} color={on ? colors.primary : colors.muted} />
                      <Text className={cn("text-[14px] font-bold", on ? "text-primary" : "text-muted")}>{g}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Labeled>
          </Section>

          {/* animal + breed */}
          <Section icon="sparkles-outline" title="About your pet">
            <Labeled label="Animal Type" error={err.animal}>
              <View className="flex-row flex-wrap gap-2">
                {animalTypes.map((a) => {
                  const on = animalType === a;
                  return (
                    <Pressable
                      key={a}
                      onPress={() => { if (a !== animalType) { setAnimalType(a); setBreed(""); } }}
                      accessibilityRole="button" accessibilityLabel={a} accessibilityState={{ selected: on }}
                      className={cn("w-[23.5%] items-center gap-1 py-2.5 rounded-2xl border-[1.5px]", on ? "border-primary bg-primary-soft" : err.animal ? "border-red bg-white" : "border-line bg-white")}
                    >
                      <Text className="text-[26px]">{speciesEmoji[a] ?? "🐾"}</Text>
                      <Text numberOfLines={1} maxFontSizeMultiplier={1.1} className={cn("text-[11px] font-bold", on ? "text-primary-dark" : "text-muted")}>{a}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Labeled>

            <Labeled label="Breed" error={err.breed}>
              <CustomDropdown
                value={breed}
                disabled={!animalType}
                title={animalType ? `${animalType} breeds` : "Breed"}
                placeholder={animalType ? `Select ${animalType} breed` : "Choose an animal first"}
                options={breedOptions}
                onChange={setBreed}
                createLabel="Add breed"
                onCreate={(l) => {
                  petsService.addBreed(animalType, l).catch(() => {});
                  setCustomBreeds((m) => ({ ...m, [animalType]: [...(m[animalType] ?? []), l] }));
                  setBreed(l);
                }}
              />
              {!!animalType && <Text className="text-xs text-muted mt-1">Can't find it? Type the breed in the search box and tap "Add breed".</Text>}
            </Labeled>

            <Labeled label="Weight" error={err.weight}>
              <View className={cn("flex-row items-center", boxBase, err.weight ? "border-red" : "border-line")}>
                <Ionicons name="scale-outline" size={18} color={colors.muted} style={{ marginLeft: 14 }} />
                <TextInput
                  value={weight}
                  onChangeText={(t) => setWeight(t.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))}
                  keyboardType="decimal-pad" placeholder="Enter weight" placeholderTextColor={colors.muted} maxLength={6}
                  className="flex-1 px-3 py-3.5 text-[15px] text-ink"
                />
                <View className="px-4 py-2 mr-2 rounded-xl bg-primary-soft"><Text className="text-[13px] font-extrabold text-primary-dark">kg</Text></View>
              </View>
            </Labeled>
          </Section>
        </ScrollView>

        {/* action bar stays visible while scrolling */}
        <View style={{ paddingBottom: Math.max(insets.bottom, 12) }} className="flex-row gap-3 px-4 pt-3 bg-white border-t border-line">
          <Button className="flex-1" variant="neutral" title="Cancel" onPress={() => navigation.goBack()} />
          <Button className="flex-1" title={saving ? "Saving…" : editing ? "Save Changes" : "Add Pet"} disabled={saving} icon={saving ? undefined : <Ionicons name={editing ? "checkmark-circle-outline" : "add-circle-outline"} size={19} color="#fff" />} onPress={save} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}