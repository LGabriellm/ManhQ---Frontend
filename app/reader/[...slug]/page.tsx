import ReaderClient from "./ReaderClient";

export const dynamicParams = false;

export async function generateStaticParams() {
  return [];
}

export default function Page() {
  return <ReaderClient />;
}
