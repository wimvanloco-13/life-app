import { auth } from "@/lib/auth";
import { HabitList } from "@/components/habits/habit-list";

export default async function HabitsRoute() {
  const session = await auth();
  const userId = session?.user?.id ?? undefined;
  return <HabitList userId={userId} />;
}
