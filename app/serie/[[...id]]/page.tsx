import SerieClient from "./SerieClient";

export async function generateStaticParams() {
  return [{}];
}

export default function Page() {
  return <SerieClient />;
}
