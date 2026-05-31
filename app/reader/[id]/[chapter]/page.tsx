"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ReaderContent } from "@/components/reader/ReaderContent";

export default function ReaderPage() {
  const params = useParams();
  const seriesId = params.id as string;
  const chapterId = params.chapter as string;

  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <ReaderContent 
        seriesId={seriesId} 
        chapterId={chapterId} 
      />
    </Suspense>
  );
}
