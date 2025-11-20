import React from "react";

export default function Onboarding({ onComplete }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white">
            <h1 className="text-3xl font-bold underline mb-6">Bye world!</h1>
            <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={onComplete}
            >
                Get Started
            </button>
        </div>
    );
}
