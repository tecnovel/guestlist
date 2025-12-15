'use client';

import { useState } from 'react';
import { Guest, CheckIn } from '@prisma/client';
import { checkInGuest, checkOutGuest } from './actions';
import { Search, Check, X } from 'lucide-react';

type GuestWithCheckIn = Guest & { checkIn: CheckIn | null };

export default function GuestList({ guests, eventId }: { guests: GuestWithCheckIn[], eventId: string }) {
    const [query, setQuery] = useState('');
    const [optimisticGuests, setOptimisticGuests] = useState(guests);

    const [selectedGuest, setSelectedGuest] = useState<GuestWithCheckIn | null>(null);

    const filteredGuests = optimisticGuests.filter((guest) => {
        const fullName = `${guest.firstName} ${guest.lastName}`.toLowerCase();
        return fullName.includes(query.toLowerCase());
    });

    const handleCheckIn = async (guestId: string) => {
        // Optimistic update
        setOptimisticGuests((prev) =>
            prev.map((g) =>
                g.id === guestId
                    ? { ...g, checkIn: { id: 'temp', guestId, checkedInByUserId: 'me', checkedInAt: new Date(), checkedOutAt: null } }
                    : g
            )
        );

        const result = await checkInGuest(guestId, eventId);
        if (!result?.success) {
            // Revert if failed
            setOptimisticGuests((prev) =>
                prev.map((g) => (g.id === guestId ? { ...g, checkIn: guests.find(og => og.id === guestId)?.checkIn || null } : g))
            );
            alert('Failed to check in guest');
        }
    };

    const handleCheckOut = async (guestId: string) => {
        // Optimistic update
        setOptimisticGuests((prev) =>
            prev.map((g) =>
                g.id === guestId && g.checkIn
                    ? { ...g, checkIn: { ...g.checkIn, checkedOutAt: new Date() } }
                    : g
            )
        );

        const result = await checkOutGuest(guestId, eventId);
        if (!result?.success) {
            setOptimisticGuests((prev) =>
                prev.map((g) => (g.id === guestId ? { ...g, checkIn: guests.find(og => og.id === guestId)?.checkIn || null } : g))
            );
            alert('Failed to check out guest');
        }
    };

    return (
        <div>
            <div className="sticky top-0 bg-black pt-4 pb-4 z-10">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-4 border border-gray-700 rounded-lg leading-5 bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:bg-gray-800 focus:border-indigo-500 sm:text-lg"
                        placeholder="Search guest..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            <ul className="space-y-3 pb-20">
                {filteredGuests.map((guest) => (
                    <li
                        key={guest.id}
                        className={`p-4 rounded-lg border ${guest.checkIn
                            ? 'bg-green-900/20 border-green-900/50'
                            : 'bg-gray-900 border-gray-800'
                            }`}
                    >
                        <div className="flex justify-between items-center">
                            <div
                                className="flex-1 cursor-pointer min-w-0 mr-2"
                                onClick={() => guest.note && setSelectedGuest(guest)}
                            >
                                <h3 className="text-lg font-medium text-white truncate">
                                    {guest.firstName} {guest.lastName}
                                </h3>
                                <div className="flex items-center mt-1 space-x-2">
                                    {guest.plusOnesCount > 0 && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-900 text-indigo-200 flex-shrink-0">
                                            +{guest.plusOnesCount}
                                        </span>
                                    )}
                                    {guest.note && (
                                        <p className="text-xs text-gray-400 truncate max-w-[120px] sm:max-w-[300px]">
                                            {guest.note}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {guest.checkIn && !guest.checkIn.checkedOutAt ? (
                                <div className="flex items-center space-x-2 ml-4">
                                    <div className="flex items-center text-green-500">
                                        <span className="mr-2 text-sm font-medium">In</span>
                                        <Check className="h-6 w-6" />
                                    </div>
                                    <button
                                        onClick={() => handleCheckOut(guest.id)}
                                        className="inline-flex items-center px-3 py-2 border border-gray-600 text-xs font-medium rounded-md text-gray-300 hover:bg-gray-800 focus:outline-none"
                                    >
                                        Out
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleCheckIn(guest.id)}
                                    className="ml-4 inline-flex items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    {guest.checkIn?.checkedOutAt ? 'Re-Check In' : 'Check In'}
                                </button>
                            )}
                        </div>
                    </li>
                ))}
                {filteredGuests.length === 0 && (
                    <li className="text-center text-gray-500 py-8">No guests found.</li>
                )}
            </ul>

            {/* Note Modal */}
            {selectedGuest && (
                <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-900/80 transition-opacity" aria-hidden="true" onClick={() => setSelectedGuest(null)}></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="relative inline-block align-bottom bg-gray-900 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-gray-800 mx-4 sm:mx-0">
                            <div className="absolute top-0 right-0 pt-4 pr-4">
                                <button
                                    type="button"
                                    className="bg-gray-900 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                                    onClick={() => setSelectedGuest(null)}
                                >
                                    <span className="sr-only">Close</span>
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="sm:flex sm:items-start">
                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                    <h3 className="text-lg leading-6 font-medium text-white" id="modal-title">
                                        Note for {selectedGuest.firstName}
                                    </h3>
                                    <div className="mt-4">
                                        <p className="text-sm text-gray-300 whitespace-pre-wrap">
                                            {selectedGuest.note}
                                        </p>
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            onClick={() => setSelectedGuest(null)}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
