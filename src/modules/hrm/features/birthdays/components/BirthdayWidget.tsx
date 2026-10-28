import { Cake, Gift, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useBirthdaysToday, useUpcomingBirthdays } from "../hooks/useBirthdays";
import { Card } from "@shared/components/ui";
import { RefreshButton } from "@/components/ui/RefreshButton";

export function BirthdayWidget() {
  const todayQuery = useBirthdaysToday();
  const upcomingQuery = useUpcomingBirthdays(7);
  const { data: todayBirthdays = [], isLoading: loadingToday } = todayQuery;
  const { data: upcomingBirthdays = [], isLoading: loadingUpcoming } = upcomingQuery;
  const refreshing =
    (todayQuery.isFetching || upcomingQuery.isFetching) && !loadingToday && !loadingUpcoming;

  if (loadingToday && loadingUpcoming) {
    return (
      <Card padding="md">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="h-10 w-10 rounded-xl bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-1/3 bg-muted rounded" />
            <div className="h-3 w-1/2 bg-muted rounded" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Today's Birthdays Celebration Popup / Banner */}
      {todayBirthdays.length > 0 && (
        <div
          className={`relative overflow-hidden rounded-2xl border border-pink-500/40 bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-amber-500/15 p-5 shadow-lg backdrop-blur-md transition-opacity ${
            refreshing ? "opacity-60" : ""
          }`}
        >
          {/* Floating Balloons, Stars, and Emojis Background Animation */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <span className="absolute bottom-1 left-8 text-2xl anim-balloon-rise" style={{ animationDelay: "0s" }}>🎈</span>
            <span className="absolute bottom-2 left-24 text-xl anim-balloon-rise" style={{ animationDelay: "0.8s" }}>🎈</span>
            <span className="absolute bottom-1 right-16 text-2xl anim-balloon-rise" style={{ animationDelay: "1.5s" }}>🎈</span>
            <span className="absolute bottom-3 right-32 text-xl anim-balloon-rise" style={{ animationDelay: "0.4s" }}>🎈</span>
            
            <span className="absolute top-2 left-16 text-lg anim-star-sparkle" style={{ animationDelay: "0.2s" }}>⭐</span>
            <span className="absolute top-4 right-20 text-base anim-star-sparkle" style={{ animationDelay: "1.1s" }}>✨</span>
            <span className="absolute top-1 right-48 text-lg anim-star-sparkle" style={{ animationDelay: "0.7s" }}>⭐</span>

            <span className="absolute bottom-2 left-44 text-xl anim-float-up" style={{ animationDelay: "0.5s" }}>🎂</span>
            <span className="absolute bottom-1 right-4 text-xl anim-float-up" style={{ animationDelay: "1.2s" }}>🎉</span>
            <span className="absolute bottom-3 left-64 text-lg anim-float-up" style={{ animationDelay: "0.9s" }}>🎁</span>
            <span className="absolute bottom-2 right-60 text-lg anim-float-up" style={{ animationDelay: "0.3s" }}>🥳</span>
          </div>

          <div className="relative z-10 flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg animate-bounce">
              <Cake size={28} />
            </span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-foreground text-base md:text-lg flex items-center gap-1.5">
                    🎉 Happy Birthday Today! <Sparkles className="text-amber-500 animate-pulse" size={18} />
                  </h3>
                </div>
                <p className="text-xs md:text-sm font-medium text-foreground/90">
                    <span className="font-bold text-pink-600 dark:text-pink-400">
                      {todayBirthdays.map((b) => `${b.employeeName} (${b.employeeCode})`).join(", ")}
                    </span>{" "}
                  {todayBirthdays.length === 1 ? "is" : "are"} celebrating their birthday today! Send your warm wishes and make their day special! 🥳🎈
                </p>


              </div>
          </div>
        </div>
      )}

      {/* Upcoming Birthdays Card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mbg-card relative overflow-hidden bg-gradient-to-br from-card via-card to-surface-muted/20 p-4 shadow-md transition-shadow hover:shadow-lg sm:p-5"
      >
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary via-primary/50 to-transparent opacity-80" />
        <div className="mb-4 flex items-center justify-between border-b border-border/80 pb-3">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-card-foreground">
            <Gift size={16} className="text-primary" />
            Upcoming Birthdays (Next 7 Days)
          </h3>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
              {upcomingBirthdays.length}
            </span>
            <RefreshButton
              onRefresh={() => Promise.all([todayQuery.refetch(), upcomingQuery.refetch()])}
              isRefreshing={todayQuery.isFetching || upcomingQuery.isFetching}
              label="birthdays"
              size={13}
              className="p-1"
            />
          </div>
        </div>

        <div
          className={`transition-opacity ${refreshing ? "pointer-events-none opacity-60" : ""}`}
          aria-busy={refreshing}
        >
        {upcomingBirthdays.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No upcoming birthdays in the next 7 days.</p>
        ) : (
          <div className="divide-y divide-border">
            {upcomingBirthdays.map((b) => (
              <div key={b.employeeCode} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-foreground font-bold text-xs">
                    {b.employeeName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{b.employeeName}</p>
                    <p className="text-[11px] font-mono text-muted-foreground">{b.employeeCode}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-primary">{b.nextBirthdayFormatted || b.nextBirthday}</p>
                  <p className="text-[10px] text-muted-foreground">Turns {b.age + 1}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </motion.div>
    </div>
  );
}
