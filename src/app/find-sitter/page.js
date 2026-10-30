import { Suspense } from "react";
import PetSitterList from "@/components/PetSitterList";

export const metadata = {
    title: "Find a sitter | Pet Sitter Plus",
};

function FindSitterFallback() {
    return (
        <div className="min-h-full bg-background px-5 py-8">
            <div className="psp-container">
                <h1 className="text-h1">Find a sitter</h1>
                <p className="mt-6 text-body-2 text-ink-400">Loading pet sitters...</p>
            </div>
        </div>
    );
}

export default function FindSitterPage() {
    return (
        <Suspense fallback={<FindSitterFallback />}>
            <PetSitterList />
        </Suspense>
    );
}
