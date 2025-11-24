'use client';

import { useState } from 'react';
import { Guest, CheckIn } from '@prisma/client';
import { checkInGuest, checkOutGuest } from './actions';
import { Search, Check, X } from 'lucide-react';

type GuestWithCheckIn = Guest & { checkIn: CheckIn | null };

export default function GuestList({ guests, eventId }: { guests: GuestWithCheckIn[], eventId: string }) {
    const [query, setQuery] = useState('');
    const [optimisticGuests, setOptimisticGuests] = useState(guests);

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
            // Revert if failed (this is a bit simplistic, ideally we'd revert to exact previous state)
            // For now, just reloading the page or refetching would be safer, but let's just undo the optimistic change
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
                            <div>
                                <h3 className="text-lg font-medium text-white">
                                    {guest.firstName} {guest.lastName}
                                </h3>
                                <div className="flex items-center mt-1 space-x-2">
                                    {guest.plusOnesCount > 0 && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-900 text-indigo-200">
                                            +{guest.plusOnesCount}
                                        </span>
                                    )}
                                    {guest.note && (
                                        <span className="text-xs text-gray-400 truncate max-w-[150px]">
                                            {guest.note}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {guest.checkIn && !guest.checkIn.checkedOutAt ? (
                                <div className="flex items-center space-x-2">
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
                                    className="inline-flex items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
        </div>
    );
}
