import HeroSection from "../../components/HeroSection";
import ServiceTiles from "../../components/home/ServiceTiles";
import TopSitters from "../../components/home/TopSitters";
import MobileGreeting from "../../components/home/MobileGreeting";

export default function Home() {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <HeroSection greeting={<MobileGreeting />} />
      <ServiceTiles />
      <TopSitters />
    </div>
  );
}
