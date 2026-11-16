import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import { Empty, Gradient, SectionHeader, T, cn } from "../../components/ui";
import SearchBar from "../../components/common/SearchBar";
import FilterChips from "../../components/common/FilterChips";
import SegmentedTabs from "../../components/common/SegmentedTabs";
import StatRow from "../../components/common/StatTile";
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
      color: colors.primary,
      value: available.filter((l) => l.listingType === "Pet").length,
    },
    {
      label: "Products",
      icon: "cube" as IconName,
      color: colors.purple,
      value: available.filter((l) => l.listingType === "Product").length,
    },
    {
      label: "Sellers",
      icon: "people" as IconName,
      color: colors.blue,
      value: new Set(available.map((l) => l.sellerId)).size,
    },
    {
      label: "New today",
      icon: "sparkles" as IconName,
      color: colors.green,
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
  const resetAll = () => {
    setQ("");
    setTab("All");
    setFilters(noFilters);
    setOnlySaved(false);
  };

  // category chips with live counts ("Pets · 12"); single-select on top of the shared multi-select FilterChips
  const tabOptions = useMemo(
    () =>
      TABS.filter((t) => t !== "All").map((t) => ({
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
  useEffect(() => { setShown(PAGE_SIZE); }, [q, tab, filters, sort, onlySaved]); // new search / filter / sort starts from the top
  const loadMore = useCallback(() => { if (hasMore) setShown((n) => Math.min(n + PAGE_SIZE, list.length)); }, [hasMore, list.length]);

  return (
    <View className="flex-1 bg-cream">
      <FlatList
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
            <Empty
              emoji="🔍"
              title="No listings match"
              body="Try a different search, category or filters."
            />
          )
        }
        ListHeaderComponent={
          <View className="gap-4 mb-3">
            {/* hero card */}
            <Gradient
              className="rounded-3xl p-4 overflow-hidden"
              colorsArr={["#FF6B00", "#F59E0B"]}
            >
              <View className="flex-row items-center gap-3">
                <View className="flex-1 gap-1">
                  <View className="self-start flex-row items-center gap-1.5 bg-white/25 rounded-full px-2.5 py-1">
                    <Ionicons name="storefront" size={12} color="#fff" />
                    <Text className="text-white text-[11px] font-extrabold uppercase tracking-wider">
                      WONPET Marketplace
                    </Text>
                  </View>
                  <Text className="text-white text-xl font-black mt-1">
                    Find a new best friend
                  </Text>
                  <Text className="text-white/90 text-[13px]">
                    Pets &amp; pre-loved gear from owners near you
                  </Text>
                </View>
                <View className="w-14 h-14 rounded-2xl bg-white items-center justify-center overflow-hidden">
                  <Image
                    source={require("../../assets/logo.png")}
                    style={{ width: 44, height: 44 }}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </Gradient>

            {/* quick actions */}
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

            {/* stats */}
            {!browsing && <StatRow stats={stats} />}

            {/* search + filters */}
            <SearchBar
              value={q}
              onChangeText={setQ}
              placeholder="Search pets, products, breeds…"
              trailing={{
                icon: "options-outline",
                label: "Filters",
                badge: nFilters,
                onPress: () => setFilterOpen(true),
              }}
            />

            {/* category chips */}
            <FilterChips
              options={tabOptions}
              active={tab === "All" ? [] : [tab]}
              onChange={(next) => setTab(next.length ? next[next.length - 1] : "All")}
              allCount={available.length}
            />

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
                    <SegmentedTabs
                      value={trending}
                      onChange={setTrending}
                      tabs={TRENDING.map((t) => ({ key: t, label: t }))}
                    />
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

            {/* all listings header + sort */}
            <View className="gap-3">
              <SectionHeader
                title={`${onlySaved ? "Saved" : "All"} Listings`}
                subtitle={`${list.length} listing${list.length === 1 ? "" : "s"}`}
                icon={
                  <IconBadge
                    icon={onlySaved ? "heart" : "grid"}
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
          <View>
            {list.length > 0 && <LoadMoreFooter hasMore={hasMore} total={list.length} noun="listings" />}
            {/* recently viewed sits after the last listing, so only show it once everything is loaded */}
            {!hasMore && !browsing && recents.length ? (
              <View className="mt-2">
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
      />
    </View>
  );
}