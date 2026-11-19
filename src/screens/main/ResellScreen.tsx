import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, LayoutChangeEvent, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import { Empty, Gradient, SectionHeader, T, cn } from "../../components/ui";
import SearchBar from "../../components/common/SearchBar";
import FilterChips from "../../components/common/FilterChips";
import { ListingCard } from "../../components/resell/ListingBits";
import FilterSheet, {
  Filters,
  activeFilterCount,
  noFilters,
} from "../../components/resell/FilterSheet";
import { UnreadBadge } from "../../components/chat/ChatBits";
import { Listing, PET_SUBTABS, SAFETY_TIPS, SORT_OPTIONS, TABS, withinDistance } from "../../data/resell";
import { useResell } from "../../context/ResellContext";
import { useChat } from "../../context/ChatContext";
import { ListingGridSkeleton } from "../../components/Skeletons";
import LoadMoreFooter from "../../components/LoadMoreFooter";
import { useLiveLocation } from "../../context/LocationContext";
import { toast } from "../../components/WonPetsAlert";
import { areaCity } from "../../utils/location";
import { searchByPhoto } from "../../utils/imageSearch";
import PhotoItemChips from "../../components/common/PhotoItemChips";
import { VisualSearchItem } from "../../services/shared.service";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const matchesTab = (l: Listing, tab: string) =>
  tab === "All" ||
  (tab === "Pets"
    ? l.listingType === "Pet"
    : tab === "More"
      ? l.listingType === "Product" &&
        !["Accessories", "Beds", "Grooming"].includes(l.category)
      : l.category === tab);
const WEEK = 7 * 86400000; // "Recently Added" = listed in the last 7 days (same as the web)
const PAGE_SIZE = 10; // listings revealed per scroll batch (even, so the 2-column grid stays full)

/** Round tinted icon used in front of every section title (same as the Dashboard sections). */
function IconBadge({ icon, tint, color }: { icon: IconName; tint: string; color: string }) {
  return (
    <View className={cn("w-9 h-9 rounded-full items-center justify-center", tint)}>
      <Ionicons name={icon} size={17} color={color} />
    </View>
  );
}

/** Tinted icon tile + label used for Chats / Saved / My listings. */
function QuickAction({
  icon,
  label,
  onPress,
  active,
  badge,
  iconColor = colors.primary,
  tint = "bg-primary-soft",
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  badge?: React.ReactNode;
  iconColor?: string;
  tint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={cn(
        "flex-1 items-center gap-1.5 rounded-2xl py-2.5 border active:opacity-90",
        active ? "bg-primary border-primary" : "bg-white border-line",
      )}
    >
      <View
        className={cn(
          "w-10 h-10 rounded-2xl items-center justify-center",
          active ? "bg-white/20" : tint,
        )}
      >
        <Ionicons name={icon} size={20} color={active ? "#fff" : iconColor} />
        {badge && <View className="absolute -top-1.5 -right-1.5">{badge}</View>}
      </View>
      <Text
        className={cn("font-bold text-[12px]", active ? "text-white" : "text-ink")}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Rail({
  title,
  icon,
  data,
  onOpen,
  right,
  emptyText,
  tint,
  color,
}: {
  title: string;
  icon: IconName;
  data: Listing[];
  onOpen: (id: string) => void;
  right?: React.ReactNode;
  emptyText?: string;
  tint: string;
  color: string;
}) {
  // keep the rail (and its switcher) on screen when a tab has no results, otherwise the user can't switch back
  if (!data.length && !right) return null;
  return (
    <View className="gap-3">
      <SectionHeader title={title} icon={<IconBadge icon={icon} tint={tint} color={color} />} />
      {right}
      {!data.length ? (
        <View className="bg-white border border-dashed border-line rounded-3xl p-5 items-center">
          <Text className={cn(T.body, "text-center")}>
            {emptyText ?? "Nothing here yet."}
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-4 grow-0"
          contentContainerClassName="gap-3 px-4 pb-1"
        >
          {data.map((l) => (
            <ListingCard key={l.id} compact item={l} onPress={() => onOpen(l.id)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/** Quick-filter pill (Nearby / Under ₹1,000 / Like New / Recently Added) - same four as the web. */
function QuickChip({ icon, label, on, onPress }: { icon: IconName; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      className={cn("flex-row items-center gap-1.5 px-3.5 py-2 rounded-full border", on ? "bg-primary-soft border-primary" : "bg-white border-line")}
    >
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text className={cn("font-bold text-[13px]", on ? "text-primary" : "text-ink")}>{label}</Text>
    </Pressable>
  );
}

/** "Meet safely" card from the web's side panel. */
function SafetyCard() {
  const [more, setMore] = useState(false);
  const tips = more ? SAFETY_TIPS : SAFETY_TIPS.slice(0, 3);
  return (
    <View className="bg-orange-50 border border-line rounded-3xl p-4 gap-3">
      <View className="flex-row items-center gap-2">
        <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
        <Text className={T.h2}>Meet safely</Text>
      </View>
      {tips.map((t) => (
        <View key={t} className="flex-row items-start gap-2">
          <Ionicons name="checkmark-circle" size={16} color={colors.green} style={{ marginTop: 2 }} />
          <Text className="flex-1 text-sm text-ink leading-5">{t}</Text>
        </View>
      ))}
      <Pressable onPress={() => setMore((v) => !v)} hitSlop={8} className="flex-row items-center gap-1 self-start">
        <Text className="text-primary font-bold text-[13px]">{more ? "Show less" : "Learn more"}</Text>
        <Ionicons name={more ? "chevron-up" : "chevron-down"} size={14} color={colors.primary} />
      </Pressable>
    </View>
  );
}

/** Marketplace home - mirrors the web Resell page: hero, quick filters, "Popular near you" grid (nearest first), safety tips, recently viewed. */
export default function ResellScreen({ navigation }: any) {
  const { listings, favourites, recent, loading, refresh } = useResell();
  const { unreadByKind } = useChat();
  const { place: live } = useLiveLocation();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<string>("All");
  const [subTab, setSubTab] = useState<string>("All"); // Dogs / Cats / ... under the Pets tab
  const [filters, setFilters] = useState<Filters>(noFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]>("Recommended");
  const [recentOnly, setRecentOnly] = useState(false);
  const [onlySaved, setOnlySaved] = useState(false);
  const [scanning, setScanning] = useState(false); // "search by photo" in progress
  const [photo, setPhoto] = useState<{ term: string; items: VisualSearchItem[] } | null>(null); // everything spotted in the last photo
  const open = (id: string) => navigation.navigate("ListingDetail", { id });

  const listRef = useRef<FlatList<Listing>>(null);
  const gridY = useRef(0); // where the listings section starts inside the header ("Explore listings" scrolls here)
  const hasViewer = !!live;
  const viewerLabel = areaCity(live);

  const available = useMemo(
    () => listings.filter((l) => l.status === "Available" && l.isActive),
    [listings],
  );

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const weekAgo = Date.now() - WEEK;
    const out = available.filter(
      (l) =>
        matchesTab(l, tab) &&
        (tab !== "Pets" || subTab === "All" || l.category === PET_SUBTABS[subTab]) &&
        (!onlySaved || favourites.includes(l.id)) &&
        (!recentOnly || new Date(l.createdAt).getTime() >= weekAgo) &&
        (!kw ||
          `${l.title} ${l.breed ?? ""} ${l.category} ${l.brand ?? ""} ${l.description}`
            .toLowerCase()
            .includes(kw)) &&
        (!filters.location.trim() ||
          l.location
            .toLowerCase()
            .includes(filters.location.trim().toLowerCase())) &&
        (filters.condition === "All" || l.condition === filters.condition) &&
        (!filters.min || l.price >= Number(filters.min)) &&
        (!filters.max || l.price <= Number(filters.max)) &&
        (filters.category === "All" || l.category === filters.category) &&
        (filters.type === "All" || l.listingType === filters.type) &&
        withinDistance(l, filters.distance),
    );
    const newest = (a: Listing, b: Listing) => b.createdAt.localeCompare(a.createdAt);
    const by: Record<string, (a: Listing, b: Listing) => number> = {
      // nearest first; listings without a location (or when the buyer's location is unknown) fall back to newest
      Recommended: (a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9) || newest(a, b),
      "Price: Low to High": (a, b) => a.price - b.price,
      "Price: High to Low": (a, b) => b.price - a.price,
      "Most Viewed": (a, b) => b.views - a.views,
    };
    return out.sort(by[sort]);
  }, [available, q, tab, subTab, filters, sort, onlySaved, recentOnly, favourites]);

  const featured = available.filter((l) => l.isFeatured);
  const recents = recent
    .map((id) => listings.find((l) => l.id === id))
    .filter(Boolean) as Listing[];
  const nFilters = activeFilterCount(filters);
  const browsing = !!q || tab !== "All" || nFilters > 0 || onlySaved || recentOnly;
  const resetAll = () => {
    setQ("");
    setTab("All");
    setSubTab("All");
    setFilters(noFilters);
    setOnlySaved(false);
    setRecentOnly(false);
    setSort("Recommended");
    setPhoto(null);
  };

  // quick filters write into the same Filters object as the sheet, so the two always agree
  const toggleNearby = () => {
    if (!hasViewer) {
      toast.error("We couldn't detect your location yet.");
      return;
    }
    setFilters((f) => ({ ...f, distance: f.distance === "10" ? "any" : "10" })); // "Nearby" = within 10 km
  };
  const toggleUnder = () => setFilters((f) => ({ ...f, max: f.max === "1000" ? "" : "1000" }));
  const toggleLikeNew = () => setFilters((f) => ({ ...f, condition: f.condition === "Like New" ? "All" : "Like New" }));

  const pickTab = (next: string) => {
    setTab(next);
    setSubTab("All");
  };

  // camera icon: take / pick a photo, the backend returns a term that really exists in the listings
  const photoSearch = async () => {
    if (scanning) return;
    setScanning(true);
    const r = await searchByPhoto("resell");
    setScanning(false);
    if (!r) return;
    // clear anything that would hide the match; a pet photo only looks at pets, a product photo at products
    pickTab("All");
    setOnlySaved(false);
    setRecentOnly(false);
    setFilters({ ...noFilters, type: r.listingType === "Pets" ? "Pet" : "Product" });
    setQ(r.searchTerm);
    setPhoto({ term: r.searchTerm, items: r.items ?? [] });
  };

  // tap another item that was in the photo
  const pickPhotoItem = (it: VisualSearchItem) => {
    pickTab("All");
    setOnlySaved(false);
    setRecentOnly(false);
    setFilters({ ...noFilters, type: it.listingType === "Pets" ? "Pet" : "Product" });
    setQ(it.searchTerm);
    setPhoto((p) => (p ? { ...p, term: it.searchTerm } : p));
  };

  // category chips with live counts ("Pets · 12"). "More" is left out, like the web's category bar.
  const tabOptions = useMemo(
    () =>
      TABS.filter((t) => t !== "All" && t !== "More").map((t) => ({
        key: t as string,
        label: t as string,
        count: available.filter((l) => matchesTab(l, t)).length,
      })),
    [available],
  );

  // infinite scroll: reveal PAGE_SIZE more listings as the user nears the end of the grid
  const [shown, setShown] = useState(PAGE_SIZE);
  const pageItems = useMemo(() => list.slice(0, shown), [list, shown]);
  const hasMore = shown < list.length;
  useEffect(() => { setShown(PAGE_SIZE); }, [q, tab, subTab, filters, sort, onlySaved, recentOnly]); // new search / filter / sort starts from the top
  const loadMore = useCallback(() => { if (hasMore) setShown((n) => Math.min(n + PAGE_SIZE, list.length)); }, [hasMore, list.length]);

  const explore = () => listRef.current?.scrollToOffset({ offset: gridY.current + 16, animated: true });
  const onGridLayout = (e: LayoutChangeEvent) => { gridY.current = e.nativeEvent.layout.y; };
  const farFilter = filters.distance !== "any";

  return (
    <View className="flex-1 bg-cream">
      <FlatList
        ref={listRef}
        className="flex-1"
        data={pageItems}
        keyExtractor={(l) => l.id}
        numColumns={2}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshing={loading}
        onRefresh={refresh}
        columnWrapperClassName="gap-3"
        contentContainerClassName="p-4 pb-28"
        ListEmptyComponent={
          loading && !listings.length ? (
            <ListingGridSkeleton count={6} />
          ) : (
            <View className="items-center">
              <Empty
                emoji="🔍"
                title={farFilter ? "No listings in this distance range" : "No listings match"}
                body={farFilter ? "Try a bigger distance, or look at listings from anywhere." : "Try widening your search, or clear your filters."}
              />
              <Pressable
                onPress={farFilter ? () => setFilters((f) => ({ ...f, distance: "any" })) : resetAll}
                className="bg-primary rounded-full px-5 py-2.5 active:opacity-90"
              >
                <Text className="text-white font-bold text-[14px]">{farFilter ? "Any distance" : "Clear filters"}</Text>
              </Pressable>
            </View>
          )
        }
        ListHeaderComponent={
          <View className="gap-4 mb-3">
            {/* hero card - soft cream/peach like the web hero, dark text with an orange accent */}
            <Gradient
              className="rounded-3xl overflow-hidden border border-[#F1E2CF]"
              colorsArr={["#FFF6ED", "#FFE4CC"]}
            >
              <View className="p-5">
                {/* quiet decoration (same paw + heart touches as the web) */}
                <View pointerEvents="none" style={{ position: "absolute", right: -10, bottom: -14, transform: [{ rotate: "-14deg" }] }}>
                  <Ionicons name="paw" size={104} color="#FFB877" style={{ opacity: 0.35 }} />
                </View>
                <View pointerEvents="none" style={{ position: "absolute", right: 70, top: 14, transform: [{ rotate: "-12deg" }] }}>
                  <Ionicons name="heart-outline" size={22} color={colors.primary} style={{ opacity: 0.6 }} />
                </View>

                <View className="flex-row items-start gap-3">
                  <View className="flex-1 gap-1.5">
                    <View className="self-start flex-row items-center gap-1.5 bg-white/80 border border-[#F1E2CF] rounded-full px-2.5 py-1">
                      <Ionicons name="storefront" size={12} color={colors.primary} />
                      <Text className="text-primary text-[11px] font-extrabold uppercase tracking-wider">
                        WONPET Marketplace
                      </Text>
                    </View>
                    <Text className="text-ink text-[22px] font-black leading-7 mt-1">
                      Give pre-loved pet essentials <Text className="text-primary">a new home</Text>
                    </Text>
                    <Text className="text-muted text-[13px] leading-5 pr-4">
                      Quality, affordable and sustainable pet finds from pet lovers like you.
                    </Text>
                    <Pressable
                      onPress={explore}
                      accessibilityRole="button"
                      accessibilityLabel="Explore listings"
                      className="self-start mt-2 rounded-full overflow-hidden shadow-md shadow-orange-300 active:opacity-90"
                    >
                      <Gradient className="flex-row items-center gap-2 px-5 py-3" colorsArr={["#FF8A1F", "#FF5A00"]}>
                        <Text className="text-white font-extrabold text-[14px]">Explore listings</Text>
                        <Ionicons name="arrow-forward" size={15} color="#fff" />
                      </Gradient>
                    </Pressable>
                  </View>
                  <View className="w-14 h-14 rounded-2xl bg-white border border-[#F1E2CF] items-center justify-center overflow-hidden">
                    <Image
                      source={require("../../assets/logo.png")}
                      style={{ width: 44, height: 44 }}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              </View>
            </Gradient>

            {/* quick actions (mobile keeps Chats + Saved here; the web has them in its header) */}
            <View className="flex-row gap-2">
              <QuickAction
                icon="chatbubble-ellipses"
                label="Chats"
                onPress={() => navigation.navigate("Chat", { tab: "resell" })}
                badge={
                  <UnreadBadge
                    count={unreadByKind.resell}
                    className="bg-red"
                  />
                }
              />
              <QuickAction
                icon={onlySaved ? "heart" : "heart-outline"}
                label={`Saved (${favourites.length})`}
                active={onlySaved}
                onPress={() => setOnlySaved((v) => !v)}
                iconColor={colors.red}
                tint="bg-red-soft"
              />
              <QuickAction
                icon="pricetags"
                label="My listings"
                onPress={() => navigation.navigate("MyListings")}
                iconColor={colors.purple}
                tint="bg-purple-soft"
              />
            </View>

            {/* search + filters */}
            <SearchBar
              value={q}
              onChangeText={setQ}
              onCamera={photoSearch}
              scanning={scanning}
              placeholder="Search pets, products, breeds…"
              trailing={{
                icon: "options-outline",
                label: "Filters",
                badge: nFilters,
                onPress: () => setFilterOpen(true),
              }}
            />
            {photo && <PhotoItemChips items={photo.items} activeTerm={photo.term} query={q} onPick={pickPhotoItem} />}

            {/* category chips */}
            <FilterChips
              options={tabOptions}
              active={tab === "All" ? [] : [tab]}
              onChange={(next) => pickTab(next.length ? next[next.length - 1] : "All")}
              allCount={available.length}
            />

            {/* Pets -> Dogs / Cats / Birds ... */}
            {tab === "Pets" && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="-mx-4 grow-0"
                contentContainerClassName="gap-2 px-4"
              >
                {Object.keys(PET_SUBTABS).map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => setSubTab(k)}
                    className={cn("px-3.5 py-1.5 rounded-full", subTab === k ? "bg-primary" : "bg-neutral-100")}
                  >
                    <Text className={cn("text-xs font-bold", subTab === k ? "text-white" : "text-muted")}>{k}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {/* quick filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-4 grow-0"
              contentContainerClassName="gap-2 px-4 items-center"
            >
              <Text className="text-[13px] font-extrabold text-ink mr-1">Quick Filters</Text>
              <QuickChip icon="location" label="Nearby" on={filters.distance === "10"} onPress={toggleNearby} />
              <QuickChip icon="pricetag" label="Under ₹1,000" on={filters.max === "1000"} onPress={toggleUnder} />
              <QuickChip icon="sparkles" label="Like New" on={filters.condition === "Like New"} onPress={toggleLikeNew} />
              <QuickChip icon="calendar" label="Recently Added" on={recentOnly} onPress={() => setRecentOnly((v) => !v)} />
            </ScrollView>

            {!browsing && (
              <Rail
                title="Featured Listings"
                icon="star"
                tint="bg-yellow-soft"
                color={colors.yellow}
                data={featured}
                onOpen={open}
              />
            )}

            {/* all listings header + sort */}
            <View className="gap-3" onLayout={onGridLayout}>
              <SectionHeader
                title={onlySaved ? "Saved Listings" : hasViewer ? "Popular near you" : "All Listings"}
                subtitle={`${list.length} listing${list.length === 1 ? "" : "s"}${hasViewer && viewerLabel && !onlySaved ? ` · from ${viewerLabel}` : ""}`}
                icon={
                  <IconBadge
                    icon={onlySaved ? "heart" : hasViewer ? "flame" : "grid"}
                    tint={onlySaved ? "bg-red-soft" : "bg-primary-soft"}
                    color={onlySaved ? colors.red : colors.primary}
                  />
                }
                right={
                  browsing ? (
                    <Pressable hitSlop={8} onPress={resetAll}>
                      <Text className="text-primary font-bold text-[13px]">Reset filters</Text>
                    </Pressable>
                  ) : undefined
                }
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="-mx-4 grow-0"
                contentContainerClassName="gap-2 px-4 items-center"
              >
                <Ionicons name="swap-vertical" size={16} color={colors.muted} />
                {SORT_OPTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setSort(s)}
                    className={cn(
                      "px-3.5 py-2 rounded-full border",
                      sort === s ? "bg-ink border-ink" : "bg-white border-line",
                    )}
                  >
                    <Text
                      className={cn(
                        "font-bold text-[13px]",
                        sort === s ? "text-white" : "text-ink",
                      )}
                    >
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        }
        ListFooterComponent={
          <View className="gap-4">
            {list.length > 0 && <LoadMoreFooter hasMore={hasMore} total={list.length} noun="listings" />}
            {/* these sit after the last listing, so only show them once everything is loaded */}
            {!hasMore && <SafetyCard />}
            {!hasMore && !browsing && recents.length ? (
              <Rail
                title="Recently Viewed"
                icon="time"
                tint="bg-blue-soft"
                color={colors.blue}
                data={recents}
                onOpen={open}
              />
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <ListingCard item={item} onPress={() => open(item.id)} />
        )}
      />

      <Pressable
        onPress={() => navigation.navigate("CreateListing")}
        accessibilityRole="button"
        accessibilityLabel="Sell an item"
        className="absolute bottom-5 right-4 flex-row items-center gap-2 bg-primary rounded-full pl-4 pr-5 py-3.5 shadow-lg shadow-orange-900/30 active:opacity-90"
      >
        <Ionicons name="add-circle" size={22} color="#fff" />
        <Text className="text-white font-extrabold text-[15px]">Sell</Text>
      </Pressable>
      <FilterSheet
        visible={filterOpen}
        value={filters}
        onClose={() => setFilterOpen(false)}
        onApply={setFilters}
        hasViewer={hasViewer}
        viewerLabel={viewerLabel}
      />
    </View>
  );
}