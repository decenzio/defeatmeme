import BettingCard from "~~/components/custom/BettingCard";
import RegisterCard from "~~/components/custom/RegisterCard";

export default function Home() {
  return (
    <main className="min-h-screen relative z-10 p-6">
      <RegisterCard />
      <div className="mt-6">
        <BettingCard />
      </div>
    </main>
  );
}
