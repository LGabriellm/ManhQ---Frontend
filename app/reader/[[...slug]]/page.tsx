import ReaderClient from "./ReaderClient";

export async function generateStaticParams() {
  return [{}];
}

export default function Page() {
  return <ReaderClient />;
}
