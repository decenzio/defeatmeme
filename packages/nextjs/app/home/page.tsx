import BettingCard from "~~/components/custom/BettingCard";
import RegisterCard from "~~/components/custom/RegisterCard";

export default function Home() {
  return (
    <main className="p-6">
      <RegisterCard />
      <div className="mt-6">
        <BettingCard />
      </div>
    </main>
  );
}
