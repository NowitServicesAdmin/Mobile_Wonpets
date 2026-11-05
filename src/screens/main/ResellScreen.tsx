import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import { Empty, T, cn } from "../../components/ui";
import { ListingCard } from "../../components/resell/ListingBits";
import FilterSheet, {
  Filters,
  activeFilterCount,
  noFilters,
} from "../../components/resell/FilterSheet";
import { UnreadBadge } from "../../components/chat/ChatBits";
import { Listing, SORT_OPTIONS, TABS } from "../../data/resell";
import { useResell } from "../../context/ResellContext";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";
import { ListingGridSkeleton } from "../../components/Skeletons";
import LoadMoreFooter from "../../components/LoadMoreFooter";
import { useLiveLocation } from "../../context/LocationContext";
import { useSettings } from "../../context/SettingsContext";
import { areaCity } from "../../utils/location";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const matchesTab = (l: Listing, tab: string) =>
  tab === "All" ||
  (tab === "Pets"
    ? l.listingType === "Pet"
    : tab === "More"
      ? l.listingType === "Product" &&
        !["Accessories", "Beds", "Grooming"].includes(l.category)
      : l.category === tab);
const TRENDING = ["Most Viewed", "Newest", "Near You"] as const;
const PAGE_SIZE = 10; // listings revealed per scroll batch (even, so the 2-column grid stays full)
const TAB_ICON: Record<string, IconName> = {
  All: "apps",
  Pets: "paw",
  Accessories: "bag-handle",
  Beds: "bed",
  Grooming: "cut",
  More: "ellipsis-horizontal",
};

/** Section title with a tinted icon badge. */
function SectionHeader({
  title,
  icon,
  tint = "bg-primary-soft",
  color = colors.primary,
  count,
}: {
  title: string;
  icon: IconName;
  tint?: string;
  color?: string;
  count?: number;
}) {
  return (
    <View className="flex-row items-center gap-2.5">
      <View
        className={cn("w-8 h-8 rounded-xl items-center justify-center", tint)}
      >
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text className={T.h2}>{title}</Text>
      {count !== undefined && (
        <View className="bg-white border border-line rounded-full px-2 py-0.5">
          <Text className="text-[11px] font-bold text-muted">{count}</Text>
        </View>
      )}
    </View>
  );
}

/** Square-ish action tile used for Chats / Saved / My listings. */
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
      className={cn(
        "flex-1 items-center gap-1.5 rounded-3xl py-3 border active:opacity-90",
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
        className={cn(
          "font-bold text-[12px]",
          active ? "text-white" : "text-ink",
        )}
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
  tint?: string;
  color?: string;
}) {
  // keep the rail (and its filter chips) on screen when a chip has no results, otherwise the user can't switch back
  if (!data.length && !right) return null;
  return (
    <View className="gap-3">
      <SectionHeader title={title} icon={icon} tint={tint} color={color} />
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
          contentContainerClassName="gap-3 pr-4"
        >
          {data.map((l) => (
            <ListingCard
              key={l.id}
              compact
              item={l}
              onPress={() => onOpen(l.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/** Marketplace home: browse pets & pre-owned items from other owners, or sell your own. */
export default function ResellScreen({ navigation }: any) {
  const { listings, favourites, recent, loading, refresh } = useResell();
  const { unreadByKind } = useChat();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<string>("All");
  const [filters, setFilters] = useState<Filters>(noFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] =
    useState<(typeof SORT_OPTIONS)[number]>("Newest First");
  const [trending, setTrending] =
    useState<(typeof TRENDING)[number]>("Most Viewed");
  const [onlySaved, setOnlySaved] = useState(false);
  const open = (id: string) => navigation.navigate("ListingDetail", { id });

  const available = useMemo(
    () => listings.filter((l) => l.status === "Available" && l.isActive),
    [listings],
  );
  const stats = [
    {
      label: "Pets",
      icon: "paw" as IconName,
      value: available.filter((l) => l.listingType === "Pet").length,
    },
    {
      label: "Products",
      icon: "cube" as IconName,
      value: available.filter((l) => l.listingType === "Product").length,
    },
    {
      label: "Sellers",
      icon: "people" as IconName,
      value: new Set(available.map((l) => l.sellerId)).size,
    },
    {
      label: "New today",
      icon: "sparkles" as IconName,
      value: available.filter(
        (l) => Date.now() - new Date(l.createdAt).getTime() < 86400000,
      ).length,
    },
  ];

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const out = available.filter(
      (l) =>
        matchesTab(l, tab) &&
        (!onlySaved || favourites.includes(l.id)) &&
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
        (filters.type === "All" || l.listingType === filters.type),
    );
    const by: Record<string, (a: Listing, b: Listing) => number> = {
      "Newest First": (a, b) => b.createdAt.localeCompare(a.createdAt),
      "Price: Low to High": (a, b) => a.price - b.price,
      "Price: High to Low": (a, b) => b.price - a.price,
      "Most Viewed": (a, b) => b.views - a.views,
    };
    return out.sort(by[sort]);
  }, [available, q, tab, filters, sort, onlySaved, favourites]);

  // "Near You": rank listings by how closely their location text matches where the user is (area > city > district)
  const { place: live } = useLiveLocation();
  const { info } = useSettings();
  const nearTokens = useMemo(() => {
    const t = (v?: string) => (v || "").trim().toLowerCase();
    const saved =
      t(info?.city) || t((user?.location ?? "").split(",").slice(-3, -2)[0]);
    return {
      area: t(live?.area),
      city: t(live?.city) || saved,
      district: t(live?.district) || t(info?.district),
    };
  }, [live, info, user?.location]);
  const nearLabel = areaCity(live) || [info?.city].filter(Boolean).join("");
  const nearScore = (l: Listing) => {
    const loc = l.location.toLowerCase();
    const { area, city, district } = nearTokens;
    return (
      (area && loc.includes(area) ? 3 : 0) +
      (city && loc.includes(city) ? 2 : 0) +
      (district && loc.includes(district) ? 1 : 0)
    );
  };
  const trendingList = useMemo(() => {
    const base =
      trending === "Newest"
        ? [...available].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : trending === "Near You"
          ? available
              .map((l) => ({ l, s: nearScore(l) }))
              .filter((x) => x.s > 0)
              .sort((a, b) => b.s - a.s || b.l.views - a.l.views)
              .map((x) => x.l)
          : [...available].sort((a, b) => b.views - a.views);
    return base.slice(0, 8);
  }, [available, trending, nearTokens]);
  const featured = available.filter((l) => l.isFeatured);
  const recents = recent
    .map((id) => listings.find((l) => l.id === id))
    .filter(Boolean) as Listing[];
  const nFilters = activeFilterCount(filters);
  const browsing = !!q || tab !== "All" || nFilters > 0 || onlySaved;

  // infinite scroll: reveal PAGE_SIZE more listings as the user nears the end of the grid
  const [shown, setShown] = useState(PAGE_SIZE);
  const pageItems = useMemo(() => list.slice(0, shown), [list, shown]);
  const hasMore = shown < list.length;
  useEffect(() => { setShown(PAGE_SIZE); }, [q, tab, filters, sort, onlySaved]); // new search / filter / sort starts from the top
  const loadMore = useCallback(() => { if (hasMore) setShown((n) => Math.min(n + PAGE_SIZE, list.length)); }, [hasMore, list.length]);

  return (
    <View className="flex-1 bg-cream">
      <FlatList
        data={pageItems}
        keyExtractor={(l) => l.id}
        numColumns={2}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshing={loading}
        onRefresh={refresh}
        columnWrapperClassName="gap-3 px-4"
        contentContainerClassName="pb-28"
        ListEmptyComponent={
          loading && !listings.length ? (
            <View className="px-4">
              <ListingGridSkeleton count={6} />
            </View>
          ) : (
            <Empty
              emoji="🔍"
              title="No listings match"
              body="Try a different search, category or filters."
            />
          )
        }
        ListHeaderComponent={
          <View className="gap-5 mb-4">
            {/* Hero: title + search */}
            <LinearGradient
              colors={["#FF8A2B", "#FF6B00", "#E85D00"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="px-4 pt-5 pb-6 rounded-b-[32px] gap-4"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-white text-2xl font-black">
                    Marketplace
                  </Text>
                  <Text className="text-white/85 text-[13px] mt-0.5">
                    Find a new best friend or pre-loved pet gear
                  </Text>
                </View>
                <View className="w-12 h-12 rounded-2xl bg-white items-center justify-center overflow-hidden">
                  <Image
                    source={require("../../assets/logo.png")}
                    style={{ width: 40, height: 40 }}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <View className="flex-row items-center gap-2.5">
                <View className="flex-1 flex-row items-center gap-2 bg-white rounded-2xl px-3.5 shadow-sm">
                  <Ionicons name="search" size={18} color={colors.primary} />
                  <TextInput
                    value={q}
                    onChangeText={setQ}
                    placeholder="Search pets, products, breeds…"
                    placeholderTextColor="#B8AEA5"
                    className="flex-1 py-3.5"
                  />
                  {!!q && (
                    <Pressable hitSlop={8} onPress={() => setQ("")}>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={colors.muted}
                      />
                    </Pressable>
                  )}
                </View>
                <Pressable
                  onPress={() => setFilterOpen(true)}
                  className={cn(
                    "w-[50px] h-[50px] rounded-2xl items-center justify-center shadow-sm",
                    nFilters > 0 ? "bg-ink" : "bg-white",
                  )}
                >
                  <Ionicons
                    name="options"
                    size={20}
                    color={nFilters > 0 ? "#fff" : colors.primary}
                  />
                  {nFilters > 0 && (
                    <View className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-yellow border-2 border-white items-center justify-center">
                      <Text className="text-white text-[10px] font-extrabold">
                        {nFilters}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </LinearGradient>

            <View className="px-4 gap-5">
              {/* Quick actions */}
              <View className="flex-row gap-3">
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

              {/* Stats */}
              {!browsing && (
                <View className="flex-row bg-white border border-line rounded-3xl py-3.5">
                  {stats.map((s, i) => (
                    <View
                      key={s.label}
                      className={cn(
                        "flex-1 items-center gap-0.5",
                        i > 0 && "border-l border-line",
                      )}
                    >
                      <Ionicons
                        name={s.icon}
                        size={14}
                        color={colors.primary}
                      />
                      <Text className="text-lg font-black text-ink">
                        {s.value}
                      </Text>
                      <Text className="text-[10px] text-muted font-semibold">
                        {s.label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Category tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2 pr-4"
                className="-mx-4 px-4 grow-0"
              >
                {TABS.map((t) => {
                  const on = tab === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setTab(t)}
                      className={cn(
                        "flex-row items-center gap-1.5 pl-2.5 pr-4 py-2 rounded-full border",
                        on
                          ? "bg-primary border-primary"
                          : "bg-white border-line",
                      )}
                      style={
                        on
                          ? {
                              elevation: 3,
                              shadowColor: "#C2410C",
                              shadowOpacity: 0.2,
                              shadowRadius: 6,
                              shadowOffset: { width: 0, height: 2 },
                            }
                          : undefined
                      }
                    >
                      <View
                        className={cn(
                          "w-6 h-6 rounded-full items-center justify-center",
                          on ? "bg-white/25" : "bg-primary-soft",
                        )}
                      >
                        <Ionicons
                          name={TAB_ICON[t] ?? "ellipse"}
                          size={13}
                          color={on ? "#fff" : colors.primary}
                        />
                      </View>
                      <Text
                        className={cn(
                          "font-bold text-xs",
                          on ? "text-white" : "text-ink",
                        )}
                      >
                        {t}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {!browsing && (
                <>
                  <Rail
                    title="Trending This Week"
                    icon="flame"
                    tint="bg-red-soft"
                    color={colors.red}
                    data={trendingList}
                    onOpen={open}
                    emptyText={
                      trending === "Near You"
                        ? nearLabel
                          ? `No listings near ${nearLabel} yet. Try Most Viewed or Newest.`
                          : "Turn on location access (or save your location in Settings) to see listings near you."
                        : undefined
                    }
                    right={
                      <View className="flex-row bg-primary-soft rounded-2xl p-1">
                        {TRENDING.map((t) => (
                          <Pressable
                            key={t}
                            onPress={() => setTrending(t)}
                            className={cn(
                              "flex-1 items-center py-2 rounded-xl",
                              trending === t ? "bg-white" : "bg-transparent",
                            )}
                            style={
                              trending === t
                                ? {
                                    elevation: 2,
                                    shadowColor: "#000",
                                    shadowOpacity: 0.08,
                                    shadowRadius: 4,
                                    shadowOffset: { width: 0, height: 1 },
                                  }
                                : undefined
                            }
                          >
                            <Text
                              className={cn(
                                "text-xs font-bold",
                                trending === t
                                  ? "text-primary-dark"
                                  : "text-muted",
                              )}
                            >
                              {t}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    }
                  />
                  <Rail
                    title="Featured Listings"
                    icon="star"
                    tint="bg-yellow-soft"
                    color={colors.yellow}
                    data={featured}
                    onOpen={open}
                  />
                </>
              )}

              {/* All listings header + sort */}
              <View className="gap-3">
                <SectionHeader
                  title={`${onlySaved ? "Saved" : "All"} Listings`}
                  icon={onlySaved ? "heart" : "grid"}
                  tint={onlySaved ? "bg-red-soft" : "bg-primary-soft"}
                  color={onlySaved ? colors.red : colors.primary}
                  count={list.length}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2 pr-4 items-center"
                  className="-mx-4 px-4 grow-0"
                >
                  <Ionicons
                    name="swap-vertical"
                    size={16}
                    color={colors.muted}
                  />
                  {SORT_OPTIONS.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setSort(s)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full border",
                        sort === s
                          ? "bg-ink border-ink"
                          : "bg-white border-line",
                      )}
                    >
                      <Text
                        className={cn(
                          "text-xs font-bold",
                          sort === s ? "text-white" : "text-muted",
                        )}
                      >
                        {s}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        }
        ListFooterComponent={
          <View>
            {list.length > 0 && <LoadMoreFooter hasMore={hasMore} total={list.length} noun="listings" />}
            {/* recently viewed sits after the last listing, so only show it once everything is loaded */}
            {!hasMore && !browsing && recents.length ? (
              <View className="mt-2 px-4">
                <Rail
                  title="Recently Viewed"
                  icon="time"
                  tint="bg-blue-soft"
                  color={colors.blue}
                  data={recents}
                  onOpen={open}
                />
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <ListingCard item={item} onPress={() => open(item.id)} />
        )}
      />

      <Pressable
        onPress={() => navigation.navigate("CreateListing")}
        className="absolute right-4 bottom-6 flex-row items-center gap-2 bg-ink rounded-full pl-3 pr-5 py-3 shadow-xl shadow-black/30 active:opacity-90"
      >
        <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
          <Ionicons name="add" size={20} color="#fff" />
        </View>
        <Text className="text-white font-extrabold">Sell</Text>
      </Pressable>
      <FilterSheet
        visible={filterOpen}
        value={filters}
        onClose={() => setFilterOpen(false)}
        onApply={setFilters}
      />
    </View>
  );
}